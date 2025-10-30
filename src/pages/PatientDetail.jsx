import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import Card, { CardBody, CardHeader } from "../components/UI/Card";
import Button from "../components/UI/Button";
import Modal from "../components/UI/Modal";
import Breadcrumbs from "../components/UI/Breadcrumbs";
import ConsentBadge from "../components/ConsentBadge";
import auditService from "../services/auditService";
import { getPatient, updatePatient } from "../services/patientsService";
import { listConsents, signConsent, revokeConsent } from "../services/consentsService";
import { formatDateISOToHuman, formatPhone } from "../utils/formatters";
import { ROLES } from "../utils/constants";
import { useToast } from "../components/UI/Toast";
import ExportMenu from "../components/ExportMenu";

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

  const [patient, setPatient] = useState(null);
  const [consents, setConsents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [consentError, setConsentError] = useState("");
  const [attachmentError, setAttachmentError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ open: false, action: null, type: null });
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
          professional: user?.name ?? "Profesional Klinia",
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
          professional: consent.professional || user?.name || "Profesional Klinia",
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
    if (isAssistant || !files.length) {
      return;
    }
    setAttachmentError("");
    const attachments = files.map(mapFileToAttachment);
    const updatedAttachments = [...(patient.attachments ?? []), ...attachments];

    try {
      const payload = {
        firstName: patient.firstName,
        lastName: patient.lastName,
        curp: patient.curp,
        birthDate: patient.birthDate,
        sex: patient.sex,
        phone: patient.phone,
        email: patient.email,
        attachments: updatedAttachments,
      };
      const updated = await updatePatient(id, payload);
      setPatient((prev) => ({
        ...prev,
        ...(updated || {}),
        attachments: updated?.attachments ?? updatedAttachments,
      }));
      toast.success("Adjunto agregado");
      auditService.logAudit("attachments_add", { patientId: id, count: attachments.length });
    } catch (err) {
      const message = err.message || "No pudimos agregar el archivo.";
      setAttachmentError(message);
      toast.error(message);
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

  return (
    <section className="page stack-5">
      <div className="page-header">
        <Breadcrumbs items={breadcrumbs} />
        <div className="cluster patient-detail__header">
          <div className="stack-1">
            <h1>{name || "Paciente"}</h1>
            <p className="helper-text">CURP: {patient.curp}</p>
          </div>
          <div className="cluster">
            {!isAssistant ? (
              <Button variant="secondary" onClick={handleEditPatient}>
                Editar
              </Button>
            ) : null}
            <ExportMenu patientId={id} patient={patient} consents={consents} disabled={isAssistant} />
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <Card hoverable={false} className="clinical-links">
          <CardHeader>
            <h2>Gestión clínica</h2>
          </CardHeader>
          <CardBody>
            <div className="cluster clinical-links__actions">
              <Button onClick={() => navigate(`/patients/${id}/history`)} disabled={isAssistant}>
                Historia clínica
              </Button>
              <Button variant="secondary" onClick={() => navigate(`/patients/${id}/notes`)}>
                Notas de evolución
              </Button>
              <Button variant="ghost" onClick={() => navigate(`/patients/${id}/sessions`)}>
                Sesiones
              </Button>
              <Button variant="ghost" onClick={() => navigate(`/patients/${id}/consents`)}>
                Consentimientos
              </Button>
              <Button variant="ghost" onClick={() => navigate(`/prescriptions`)} disabled={isAssistant}>
                Prescripciones
              </Button>
              <Button variant="ghost" onClick={() => navigate(`/reports`)}>
                Reportes
              </Button>
              <Button variant="ghost" onClick={() => navigate(`/sessions`)}>
                Agenda
              </Button>
            </div>
          </CardBody>
        </Card>
      </motion.div>

      <div className="detail-grid">
        <Card hoverable={false}>
          <CardHeader>
            <h2>Datos de contacto</h2>
          </CardHeader>
          <CardBody className="stack-2">
            <p>
              <strong>Nacimiento:</strong> {formatDateISOToHuman(patient.birthDate)}
            </p>
            <p>
              <strong>Sexo:</strong> {patient.sex}
            </p>
            <p>
              <strong>Teléfono:</strong> {formatPhone(patient.phone)}
            </p>
            <p>
              <strong>Correo:</strong> {patient.email}
            </p>
            <p>
              <strong>Creado:</strong> {formatDateISOToHuman(patient.createdAt)}
            </p>
            <p>
              <strong>Actualizado:</strong> {formatDateISOToHuman(patient.updatedAt)}
            </p>
          </CardBody>
        </Card>

        <Card hoverable={false}>
          <CardHeader>
            <h2>Archivos adjuntos</h2>
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
                  disabled={isAssistant}
                >
                  examina tu equipo
                </button>
              </p>
            </div>
            {(patient.attachments ?? []).length === 0 ? (
              <p className="helper-text">Sin archivos adjuntos.</p>
            ) : (
              <ul className="attachments-list">
                {patient.attachments.map((file) => (
                  <li key={file.id} className="attachments-item">
                    <span className={`attachments-item__icon attachments-item__icon--${file.type.toLowerCase()}`}>
                      {file.type}
                    </span>
                    <div className="attachments-item__meta">
                      <strong>{file.name}</strong>
                      <p className="helper-text">{file.type} • {(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
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
                      disabled={isAssistant || status === "signed"}
                      onClick={() => openConfirm(type, "sign")}
                    >
                      Firmar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isAssistant || status !== "signed"}
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
      </div>

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
    </section>
  );
}
