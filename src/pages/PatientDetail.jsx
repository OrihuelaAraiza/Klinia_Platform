import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import Card, { CardBody, CardHeader } from "../components/UI/Card";
import Button from "../components/UI/Button";
import Badge from "../components/UI/Badge";
import Modal from "../components/UI/Modal";
import Breadcrumbs from "../components/UI/Breadcrumbs";
import ConsentBadge from "../components/ConsentBadge";
import auditService from "../services/auditService";
import { getPatient, updatePatient } from "../services/patientsService";
import { listConsents, signConsent, revokeConsent } from "../services/consentsService";
import * as prescriptionsService from "../services/prescriptionsService";
import * as ordersService from "../services/ordersService";
import * as reportsService from "../services/reportsService";
import { formatDateISOToHuman, formatPhone } from "../utils/formatters";
import { ROLES, ROUTES } from "../utils/constants";
import { useToast } from "../components/UI/Toast";
import ExportMenu from "../components/ExportMenu";
import patientsService from "../services/patientsService";
import { reingressPatient } from "../services/patientsService";

const CONSENT_TYPES = [
  { type: "attention", label: "Consentimiento de atención" },
  { type: "recording", label: "Grabación y Transcripción" },
  { type: "ai_use", label: "Uso de IA" },
];

function mapFileToAttachment(file) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const typeMap = {
    pdf: "PDF",
    png: "PNG",
    jpg: "JPG",
    jpeg: "JPG",
  };
  return {
    id: crypto.randomUUID(),
    name: file.name,
    type: typeMap[extension] ?? "PDF",
    size: file.size,
  };
}

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role, user } = useOutletContext() ?? {};
  const toast = useToast();
  const isAssistant = role === ROLES.ASSISTANT;


  const handleDownload = async (blobName) => {
    try {
      const response = await patientsService.getAttachmentUrl(id, blobName);
      const downloadUrl = response.url || response.data?.url;

      if (downloadUrl) {
        window.open(downloadUrl, '_blank');
      } else {
        toast.error("URL de descarga no recibida");
      }
    } catch (err) {
      console.error(err);
      toast.error("No se pudo descargar el archivo de la nube");
    }
  };

  const [patient, setPatient] = useState(null);
  const [consents, setConsents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [consentError, setConsentError] = useState("");
  const [attachmentError, setAttachmentError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ open: false, action: null, type: null });
  const [prescriptionsState, setPrescriptionsState] = useState({
    items: [],
    loading: true,
    error: "",
  });
  const [ordersState, setOrdersState] = useState({
    items: [],
    loading: true,
    error: "",
  });
  const [reportsState, setReportsState] = useState({
    items: [],
    loading: true,
    error: "",
  });
  const [cancelOrderModal, setCancelOrderModal] = useState({ open: false, orderId: null });
  const [reingresModal, setReingresModal] = useState({ open: false, reason: "" });
  const [reingresLoading, setReingresLoading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const patientResponse = await getPatient(id);
        let consentResponse = [];
        try {
          consentResponse = await listConsents(id);
        } catch (consentErrorResp) {
          if (consentErrorResp.status !== 404) {
            throw consentErrorResp;
          }
        }
        if (!isMounted) return;
        setPatient(patientResponse);
        setConsents(consentResponse ?? []);
        auditService.logAudit("patient_view", { id });
      } catch (err) {
        if (!isMounted) return;
        if (err.status === 404) {
          setError("Paciente no encontrado. Verifica el identificador.");
        } else {
          const message = err.message || "No pudimos cargar la ficha de paciente.";
          setError(message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    let active = true;
    setPrescriptionsState((prev) => ({ ...prev, loading: true, error: "" }));
    prescriptionsService
      .listByPatient(id)
      .then((items) => {
        if (!active) return;
        setPrescriptionsState({ items, loading: false, error: "" });
      })
      .catch((err) => {
        if (!active) return;
        const message =
          err?.status === 404 ? "" : err?.message || "No pudimos cargar las prescripciones.";
        setPrescriptionsState({ items: [], loading: false, error: message });
      });
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    let active = true;
    setOrdersState((prev) => ({ ...prev, loading: true, error: "" }));
    ordersService
      .listByPatient(id)
      .then((items) => {
        if (!active) return;
        setOrdersState({ items, loading: false, error: "" });
      })
      .catch((err) => {
        if (!active) return;
        const message = err?.status === 404 ? "" : err?.message || "No pudimos cargar las órdenes.";
        setOrdersState({ items: [], loading: false, error: message });
      });
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    let active = true;
    setReportsState((prev) => ({ ...prev, loading: true, error: "" }));
    reportsService
      .listByPatient(id)
      .then((items) => {
        if (!active) return;
        setReportsState({ items, loading: false, error: "" });
      })
      .catch((err) => {
        if (!active) return;
        const message = err?.status === 404 ? "" : err?.message || "No pudimos cargar los informes.";
        setReportsState({ items: [], loading: false, error: message });
      });
    return () => {
      active = false;
    };
  }, [id]);

  const consentByType = useMemo(() => {
    const map = new Map();
    for (const consent of consents) {
      map.set(consent.type, consent);
    }
    return map;
  }, [consents]);

  const ensureConsentEntry = (patientId, type, base = {}) => {
    const existing = consents.find((item) => item.type === type);
    if (existing) {
      return existing;
    }
    const pending = {
      id: base.id || crypto.randomUUID(),
      patientId,
      type,
      status: "pending",
      professional: base.professional || "",
      timestamp: base.timestamp || "",
    };
    setConsents((prev) => [...prev, pending]);
    return pending;
  };

  const openConfirm = (type, action) => {
    setConfirmModal({ open: true, type, action });
  };

  const closeConfirm = () => {
    setConfirmModal({ open: false, action: null, type: null });
  };

  const handleConsentUpdate = async (type, action) => {
    if (isAssistant) {
      return;
    }
    setConsentError("");
    try {
      if (action === "sign") {
        const response = await signConsent(id, type, {
          professional: user?.name ?? "Profesional BreveMente",
        });
        setConsents((prev) => {
          const next = prev.filter((item) => item.type !== type);
          next.push(response);
          return next;
        });
        toast.success("Consentimiento firmado");
        auditService.logAudit("consent_update", { patientId: id, type, status: "signed" });
      } else if (action === "revoke") {
        const consent = ensureConsentEntry(id, type);
        const response = await revokeConsent(id, consent.id, {
          professional: consent.professional || user?.name || "Profesional BreveMente",
        });
        setConsents((prev) => prev.map((item) => (item.id === response.id ? response : item)));
        toast.warn("Consentimiento revocado");
        auditService.logAudit("consent_update", { patientId: id, type, status: "revoked" });
      }
    } catch (err) {
      const message = err.message || "No pudimos actualizar el consentimiento.";
      setConsentError(message);
      toast.error(message);
    } finally {
      closeConfirm();
    }
  };

  const handleAttachmentFiles = async (files) => {
    if (isAssistant || !files.length) return;

    setAttachmentError("");
    const file = files[0];
    const formData = new FormData();
    formData.append("file", file);

    try {
      const newAttachment = await patientsService.uploadAttachment(id, formData);

      setPatient((prev) => {
        const current = JSON.parse(prev.attachmentsJson || "[]");
        return {
          ...prev,
          attachmentsJson: JSON.stringify([...current, newAttachment]),
        };
      });

      toast.success("Archivo subido a la nube correctamente");

      auditService.logAudit("attachments_add", {
        patientId: id,
        fileName: file.name,
      });
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.message ||
        "Error al subir el archivo.";
      setAttachmentError(message);
      toast.error(message);
    }
  };


  const handleDeleteAttachment = async (attachmentId) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar este archivo?")) return;

    try {
      await patientsService.deleteAttachment(id, attachmentId);

      setPatient(prev => {
        const currentFiles = JSON.parse(prev.attachmentsJson || "[]");
        const filtered = currentFiles.filter(f => f.id !== attachmentId);
        return {
          ...prev,
          attachmentsJson: JSON.stringify(filtered)
        };
      });

      toast.success("Archivo eliminado correctamente");
    } catch (err) {
      toast.error("Error al eliminar el archivo");
    }
  };

  const handleAttachmentInput = (event) => {
    const files = Array.from(event.target.files || []);
    handleAttachmentFiles(files);
    event.target.value = "";
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    if (isAssistant) return;
    const files = Array.from(event.dataTransfer.files || []);
    handleAttachmentFiles(files);
  };

  const handleEditPatient = () => {
    navigate("/patients", { state: { editId: id } });
  };

  const handleCancelOrder = async () => {
    if (!cancelOrderModal.orderId || isAssistant) return;
    try {
      await ordersService.cancel(cancelOrderModal.orderId);
      const items = await ordersService.listByPatient(id);
      setOrdersState({ items, loading: false, error: "" });
      toast.success("Orden cancelada correctamente.");
      setCancelOrderModal({ open: false, orderId: null });
    } catch (err) {
      toast.error(err?.message || "No pudimos cancelar la orden.");
    }
  };

  const handleReingress = async () => {

    auditService.logAudit("patient_re_entry_client", { id });

    if (!reingresModal.reason.trim()) {
      toast.error("El motivo de reingreso es requerido.");
      return;
    }
    setReingresLoading(true);
    try {
      const updated = await reingressPatient(id, reingresModal.reason);
      setPatient(updated);
      setReingresModal({ open: false, reason: "" });
      toast.success("Paciente reingresado correctamente.");
      setReingresModal({ open: false, reason: "" });
toast.success("Paciente reingresado correctamente.");
auditService.logAudit("patient_re_entry_client", { id }); 
    } catch (err) {
      toast.error(err?.message || "No pudimos reingresar al paciente.");
    } finally {
      setReingresLoading(false);
    }
  };

  if (loading) {
    return <p>Cargando paciente…</p>;
  }

  if (error) {
    return (
      <section className="page">
        <Card hoverable={false} className="stack-3">
          <CardBody>
            <p className="form-error" role="alert">
              {error}
            </p>
            <Button variant="secondary" onClick={() => navigate("/patients")}>Volver a Pacientes</Button>
          </CardBody>
        </Card>
      </section>
    );
  }

  if (!patient) {
    return null;
  }

  const name = `${patient.firstName} ${patient.lastName}`.trim();
  const breadcrumbs = [
    { to: "/patients", label: "Pacientes" },
    { label: name || "Paciente" },
  ];

  const isDischarge = patient?.status === "DISCHARGED";

  return (
    <section className="page stack-5">

      {/* ── Banner de estado del paciente ── */}
      <div className={`patient-status-banner ${isDischarge ? "patient-status-banner--discharged" : "patient-status-banner--active"}`}>
        <div className="cluster gap-3 align-center">
          <span className={`status-dot ${isDischarge ? "status-dot--off" : "status-dot--on"}`} />
          <div>
            <strong>
              {isDischarge ? "Expediente cerrado — Paciente dado de alta" : "Paciente activo"}
            </strong>
            {isDischarge && (
              <p style={{ margin: 0, fontSize: "0.875rem", opacity: 0.85 }}>
                Las funciones de edición y registro clínico están deshabilitadas.
              </p>
            )}
          </div>
        </div>
        {isDischarge && !isAssistant && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setReingresModal({ open: true, reason: "" })}
          >
            Dar de Reingreso
          </Button>
        )}
      </div>

      <div className="page-header">
        <Breadcrumbs items={breadcrumbs} />
        <div className="cluster patient-detail__header">
          <div className="stack-1">
            <h1>{name || "Paciente"}</h1>
            <p className="helper-text">CURP: {patient.curp}</p>
            {isDischarge && (
              <Badge variant="danger">Paciente dado de alta</Badge>
            )}
          </div>
          <div className="cluster">
            <Button
              variant="primary"
              onClick={() => navigate(`/patients/${id}/notes`)}
              disabled={isDischarge}
              style={{ minWidth: '140px' }}
            >
              Ver notas
            </Button>
            {!isAssistant && !isDischarge && (
              <Button variant="secondary" onClick={handleEditPatient}>
                Editar
              </Button>
            )}
            {/* Botón reingreso — Solo se ve si el paciente está dado de alta */}
            {!isAssistant && isDischarge && (
              <Button
                variant="secondary"
                onClick={() => setReingresModal({ open: true, reason: "" })}
              >
                Reingresar paciente
              </Button>
            )}
            <ExportMenu patientId={id} patient={patient} consents={consents} disabled={isAssistant} />
          </div>
        </div>
      </div>

      {/* Información básica del paciente */}
      <div className="patient-info-grid">
        <Card hoverable={false}>
          <CardHeader>
            <h2>Información personal</h2>
          </CardHeader>
          <CardBody>
            <div className="detail-grid cols-2">
              <div>
                <strong>Fecha de nacimiento</strong>
                <span>{formatDateISOToHuman(patient.birthDate)}</span>
              </div>
              <div>
                <strong>Sexo</strong>
                <span>
                  {patient.gender === "M" ? "Masculino" :
                    patient.gender === "F" ? "Femenino" :
                      patient.gender || "No especificado"}
                </span>
              </div>
              <div>
                <strong>Teléfono</strong>
                <span>{formatPhone(patient.phone)}</span>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <strong>Correo electrónico</strong>
                <span>{patient.user?.email || "Sin correo registrado"}</span>
              </div>
              <div>
                <strong>Registro creado</strong>
                <span>{formatDateISOToHuman(patient.createdAt)}</span>
              </div>
              <div>
                <strong>Última actualización</strong>
                <span>{formatDateISOToHuman(patient.updatedAt)}</span>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card hoverable={false}>
          <CardHeader>
            <h2>Archivos adjuntos y Consentimientos</h2>
          </CardHeader>
          <CardBody className="stack-3">
            <div
              className={`attachments-dropzone${isDragging ? " is-dragging" : ""}${isAssistant ? " is-disabled" : ""}`}
              onDragOver={(event) => {
                if (isAssistant) return;
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <p>
                Arrastra y suelta archivos PDF/JPG/PNG o
                <button
                  type="button"
                  className="link link--button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isAssistant || isDischarge}
                >
                  examina tu equipo
                </button>
              </p>
            </div>
            {(() => {
              const attachments = JSON.parse(patient.attachmentsJson || "[]");

              if (attachments.length === 0) {
                return <p className="helper-text">Sin archivos adjuntos.</p>;
              }

              return (
                <ul className="attachments-list">
                  {attachments.map((file) => (
                    <li key={file.id} className="attachments-item cluster justify-between">
                      <div className="cluster">
                        <span className={`attachments-item__icon attachments-item__icon--${file.type?.toLowerCase() || 'pdf'}`}>
                          {file.type}
                        </span>
                        <div className="attachments-item__meta">
                          <strong>{file.name}</strong>
                          <p className="helper-text">
                            {file.type} • {(file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>

                      <div className="cluster gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(file.blobName)}
                        >
                          Descargar
                        </Button>
                        {!isAssistant && !isDischarge && (
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteAttachment(file.id)} className="text-danger"
                          >
                            Eliminar
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              );
            })()}
            {!isAssistant ? (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleAttachmentInput}
                  className="visually-hidden"
                />
                {attachmentError ? (
                  <p className="ui-field__error" role="alert">
                    {attachmentError}
                  </p>
                ) : null}
              </>
            ) : null}
          </CardBody>
        </Card>
      </div>

      {/* Accesos rápidos a gestión clínica */}
      <Card hoverable={false} className="clinical-links">
        <CardHeader>
          <h2>Gestión clínica</h2>
          <p className="helper-text" style={{ margin: 0 }}>Accesos rápidos a las secciones del expediente</p>
        </CardHeader>
        <CardBody>
          <div className="clinical-links__grid">
            <Button
              onClick={() => navigate(`/patients/${id}/history`)}
              disabled={isAssistant || isDischarge}
              className="clinical-link-btn"
            >
              Historia clínica
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate(`/patients/${id}/notes`)}
              disabled={isDischarge}
              className="clinical-link-btn"
            >
              Notas de evolución
            </Button>
            <Button variant="ghost" onClick={() => navigate(`/patients/${id}/sessions`)} className="clinical-link-btn">
              Sesiones
            </Button>
            <Button variant="ghost" onClick={() => navigate(`/patients/${id}/consents`)} className="clinical-link-btn">
              Consentimientos
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate(`/prescriptions`)}
              disabled={isAssistant || isDischarge}
              className="clinical-link-btn"
            >
              Prescripciones
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate(`/prescriptions?patientId=${id}&tab=escalas`)}
              disabled={isAssistant || isDischarge}
              className="clinical-link-btn"
            >
              Escalas clínicas
            </Button>
            <Button variant="ghost" onClick={() => navigate(`/reports`)} className="clinical-link-btn">
              Reportes
            </Button>
            <Button variant="ghost" onClick={() => navigate(`/sessions`)} className="clinical-link-btn">
              Agenda
            </Button>
            {/* Botón Alta — ocultar si ya está dado de alta */}
            {!isDischarge && (
              <Button
                variant="ghost"
                onClick={() => navigate(ROUTES.DisblePatient, { state: { patient } })}
                className="clinical-link-btn"
              >
                Alta
              </Button>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Secciones principales */}
      <div className="patient-sections">
        <Card hoverable={false} id="prescripciones">
          <CardHeader className="cluster justify-between align-center wrap">
            <div>
              <h2>Prescripciones</h2>
              <p className="helper-text">Registro terapéutico asociado al expediente.</p>
            </div>
            <Button
              variant="secondary"
              onClick={() => navigate(`${ROUTES.prescriptionsNew}?patientId=${id}`)}
              disabled={isAssistant || isDischarge}
            >
              Emitir prescripción
            </Button>
          </CardHeader>
          <CardBody className="stack-2">
            {prescriptionsState.loading ? (
              <p>Cargando prescripciones…</p>
            ) : prescriptionsState.error ? (
              <p className="form-error" role="alert">
                {prescriptionsState.error}
              </p>
            ) : prescriptionsState.items.length === 0 ? (
              <p className="helper-text">No hay prescripciones registradas.</p>
            ) : (
              <ul className="prescriptions-list stack-2" role="list">
                {prescriptionsState.items.map((item) => {
                  const statusLabel = item.status === "suspendida" ? "Suspendida" : "Vigente";
                  const variant = item.status === "suspendida" ? "danger" : "success";
                  return (
                    <li key={item.id} className="prescription-row cluster justify-between align-center wrap gap-2">
                      <div className="stack-1">
                        <strong>Folio {item.folio}</strong>
                        <p className="helper-text">
                          Fecha: {formatDateISOToHuman(item.createdAt || item.updatedAt)}
                        </p>
                      </div>
                      <Badge variant={variant}>{statusLabel}</Badge>
                      <Button variant="ghost" onClick={() => navigate(`/prescriptions/${item.id}`)}>
                        Ver detalle
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card hoverable={false} id="ordenes-informes">
          <CardHeader className="cluster justify-between align-center wrap">
            <div>
              <h2>Órdenes e informes</h2>
              <p className="helper-text">Órdenes clínicas e informes asociados al expediente.</p>
            </div>
          </CardHeader>
          <CardBody className="stack-4">
            {/* Sección de Órdenes */}
            <div className="stack-3">
              <div className="cluster justify-between align-center wrap">
                <h3>Órdenes clínicas</h3>
                {!isAssistant && !isDischarge && (
                  <Button
                    variant="secondary"
                    onClick={() => navigate(`/patients/${id}/orders/new`)}
                  >
                    Nueva orden
                  </Button>
                )}
              </div>
              {ordersState.loading ? (
                <p>Cargando órdenes…</p>
              ) : ordersState.error ? (
                <p className="form-error" role="alert">
                  {ordersState.error}
                </p>
              ) : ordersState.items.length === 0 ? (
                <p className="helper-text">No hay órdenes registradas para este paciente.</p>
              ) : (
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Folio</th>
                        <th>Tipo</th>
                        <th>Fecha</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ordersState.items.map((item) => {
                        const statusLabel = item.status === "cancelada" ? "Cancelada" : "Vigente";
                        const variant = item.status === "cancelada" ? "danger" : "success";
                        return (
                          <tr key={item.id}>
                            <td>{item.folio}</td>
                            <td>{item.tipo}</td>
                            <td>{formatDateISOToHuman(item.createdAt || item.updatedAt)}</td>
                            <td>
                              <Badge variant={variant}>{statusLabel}</Badge>
                            </td>
                            <td>
                              <div className="cluster gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => navigate(`/patients/${id}/orders/${item.id}`)}
                                >
                                  Ver detalle
                                </Button>
                                {!isAssistant && item.status === "vigente" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setCancelOrderModal({ open: true, orderId: item.id })}
                                  >
                                    Cancelar
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Sección de Informes */}
            <div className="stack-3">
              <div className="cluster justify-between align-center wrap">
                <h3>Informes clínicos</h3>
                {!isAssistant && !isDischarge && (
                  <Button
                    variant="secondary"
                    onClick={() => navigate(`/patients/${id}/reports/new`)}
                  >
                    Nuevo informe
                  </Button>
                )}
              </div>
              {reportsState.loading ? (
                <p>Cargando informes…</p>
              ) : reportsState.error ? (
                <p className="form-error" role="alert">
                  {reportsState.error}
                </p>
              ) : reportsState.items.length === 0 ? (
                <p className="helper-text">No hay informes clínicos registrados para este paciente.</p>
              ) : (
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Folio</th>
                        <th>Título</th>
                        <th>Fecha</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportsState.items.map((item) => {
                        const statusLabel = item.status === "cerrado" ? "Cerrado" : "Borrador";
                        const variant = item.status === "cerrado" ? "success" : "neutral";
                        return (
                          <tr key={item.id}>
                            <td>{item.folio}</td>
                            <td>{item.titulo}</td>
                            <td>{formatDateISOToHuman(item.createdAt || item.updatedAt)}</td>
                            <td>
                              <Badge variant={variant}>{statusLabel}</Badge>
                            </td>
                            <td>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/patients/${id}/reports/${item.id}`)}
                              >
                                {item.status === "cerrado" ? "Ver detalle" : "Ver / editar"}
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      </div>
{/** 
      {/* Consentimientos 
      <Card hoverable={false}>
        <CardHeader>
          <h2>Consentimientos</h2>
        </CardHeader>
        <CardBody className="stack-3">
          {CONSENT_TYPES.map(({ type, label }) => {
            const consent = consentByType.get(type);
            const status = consent?.status ?? "pending";
            return (
              <div key={type} className="consent-row">
                <div className="stack-1">
                  <ConsentBadge type={type} status={status} />
                  <p className="helper-text">
                    {label}
                    {consent?.timestamp
                      ? ` — ${new Date(consent.timestamp).toLocaleString("es-MX")}`
                      : ""}
                    {consent?.professional ? ` • ${consent.professional}` : ""}
                  </p>
                </div>
                <div className="consent-row__actions">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={isAssistant || status === "signed" || isDischarge}
                    onClick={() => openConfirm(type, "sign")}
                  >
                    Firmar
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isAssistant || status === "signed" || isDischarge}
                    onClick={() => openConfirm(type, "revoke")}
                  >
                    Revocar
                  </Button>
                </div>
              </div>
            );
          })}
          {consentError ? (
            <p className="ui-field__error" role="alert">
              {consentError}
            </p>
          ) : null}
        </CardBody>
      </Card>
    
      */}

      <Modal
        open={confirmModal.open}
        onClose={closeConfirm}
        title={confirmModal.action === "sign" ? "Confirmar firma" : "Confirmar revocación"}
        footer={
          <div className="cluster">
            <Button variant="ghost" onClick={closeConfirm}>
              Cancelar
            </Button>
            <Button
              variant={confirmModal.action === "revoke" ? "danger" : "primary"}
              onClick={() => handleConsentUpdate(confirmModal.type, confirmModal.action)}
            >
              Confirmar
            </Button>
          </div>
        }
      >
        <p className="helper-text">
          {confirmModal.action === "sign"
            ? "Esta acción registrará el consentimiento como firmado con tu usuario."
            : "Esta acción marcará el consentimiento como revocado."}
        </p>
      </Modal>

      <Modal
        open={cancelOrderModal.open}
        onClose={() => setCancelOrderModal({ open: false, orderId: null })}
        title="Confirmar cancelación"
        footer={
          <div className="cluster">
            <Button variant="ghost" onClick={() => setCancelOrderModal({ open: false, orderId: null })}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleCancelOrder}>
              Confirmar cancelación
            </Button>
          </div>
        }
      >
        <p className="helper-text">
          Esta acción marcará la orden como cancelada. Esta acción no se puede deshacer.
        </p>
      </Modal>

      <Modal
        open={reingresModal.open}
        onClose={() => setReingresModal({ open: false, reason: "" })}
        title="Reingresar paciente"
        footer={
          <div className="cluster">
            <Button variant="ghost" onClick={() => setReingresModal({ open: false, reason: "" })}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleReingress}
              loading={reingresLoading}
              disabled={reingresLoading}
            >
              Confirmar reingreso
            </Button>
          </div>
        }
      >
        <div className="stack-3">
          <p className="helper-text">
            El paciente volverá a estado activo. Por favor describe el motivo del reingreso.
          </p>
          <div className="stack-2">
            <label className="ui-field__label">Motivo de reingreso *</label>
            <textarea
              className="ui-field__input"
              rows={4}
              placeholder="Describe el motivo del reingreso..."
              value={reingresModal.reason}
              onChange={(e) => setReingresModal(prev => ({ ...prev, reason: e.target.value }))}
            />
          </div>
        </div>
      </Modal>

      <style dangerouslySetInnerHTML={{ __html: `
        .patient-status-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.875rem 1.25rem;
          border-radius: 10px;
          border: 1px solid;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .patient-status-banner--active {
          background: #f0fdf4;
          border-color: #bbf7d0;
          color: #166534;
        }
        .patient-status-banner--discharged {
          background: #fef2f2;
          border-color: #fecaca;
          color: #991b1b;
        }
        .status-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
          display: inline-block;
        }a
        .status-dot--on {
          background: #16a34a;
          box-shadow: 0 0 0 3px #bbf7d0;
        }
        .status-dot--off {
          background: #dc2626;
          box-shadow: 0 0 0 3px #fecaca;
        }
        .clinical-links__grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 12px;
        }
      `}} />

    </section>
  );
}
