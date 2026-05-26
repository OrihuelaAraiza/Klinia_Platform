import { useEffect, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import Card, { CardBody, CardHeader } from "../components/UI/Card";
import Button from "../components/UI/Button";
import Badge from "../components/UI/Badge";
import { useToast } from "../components/UI/Toast";
import { useBreadcrumbLabel } from "../context/breadcrumb-context";
import { formatDateISOToHuman } from "../utils/formatters";
import { ROLES } from "../utils/constants";
import { canPrescribe, whyCannotPrescribe } from "../utils/permissions";
import * as prescriptionsService from "../services/prescriptionsService";
import * as patientsService from "../services/patientsService";

function statusInfo(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "suspended" || normalized === "suspendida") {
    return { variant: "danger", label: "Suspendida" };
  }
  if (normalized === "completed" || normalized === "completada") {
    return { variant: "neutral", label: "Completada" };
  }
  return { variant: "success", label: "Vigente" };
}

export default function PatientPrescriptions() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { role, user } = useOutletContext() ?? {};
  const isAssistant = role === ROLES.ASSISTANT;

  const [patient, setPatient] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    async function load() {
      try {
        const [patientData, prescriptions] = await Promise.all([
          patientsService.getPatient(id),
          prescriptionsService.listByPatient(id),
        ]);
        if (!active) return;
        setPatient(patientData);
        setItems(prescriptions || []);
      } catch (err) {
        if (!active) return;
        const message = err?.message || "No pudimos cargar las prescripciones.";
        setError(message);
        toast.error(message);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [id, toast]);

  const patientName = patient
    ? `${patient.firstName || ""} ${patient.lastName || ""}`.trim() || patient.curp
    : "Paciente";

  useBreadcrumbLabel(id, patient ? patientName : null);

  const isDischarged = patient?.status === "DISCHARGED";
  const userCanPrescribe = canPrescribe(user);
  const canCreate = !isAssistant && !isDischarged && Boolean(patient) && userCanPrescribe;
  const blockReason = !userCanPrescribe ? whyCannotPrescribe(user) : null;

  const handleCreate = () => {
    navigate(`/prescriptions/new?patientId=${id}`);
  };

  return (
    <section className="page stack-5">
      <Card hoverable={false}>
        <CardHeader>
          <div className="cluster" style={{ justifyContent: "space-between", width: "100%", flexWrap: "wrap", gap: "1rem" }}>
            <div className="stack-1">
              <h1>Prescripciones de {patientName}</h1>
              <p className="helper-text">
                {loading
                  ? "Cargando prescripciones…"
                  : `${items.length} ${items.length === 1 ? "prescripción registrada" : "prescripciones registradas"}.`}
              </p>
            </div>
            <div className="cluster gap-2">
              <Button variant="ghost" onClick={() => navigate(`/patients/${id}`)}>
                Volver al expediente
              </Button>
              {canCreate ? (
                <Button onClick={handleCreate}>Emitir prescripción</Button>
              ) : !isAssistant && !isDischarged && !userCanPrescribe ? (
                <Button disabled title={blockReason}>Emitir prescripción 🔒</Button>
              ) : null}
            </div>
          </div>
        </CardHeader>
      </Card>

      {!isAssistant && !isDischarged && !userCanPrescribe ? (
        <Card hoverable={false} className="rx-permission-banner">
          <CardBody>
            <div className="cluster gap-3 align-center wrap">
              <ShieldAlert size={22} aria-hidden="true" style={{ color: "var(--warning, #d97706)", flexShrink: 0 }} />
              <div className="stack-1" style={{ flex: 1 }}>
                <strong>No puedes emitir nuevas recetas</strong>
                <p className="helper-text" style={{ margin: 0 }}>{blockReason}</p>
              </div>
            </div>
          </CardBody>
        </Card>
      ) : null}

      <Card hoverable={false}>
        <CardHeader>
          <h2>Historial</h2>
        </CardHeader>
        <CardBody className="stack-3">
          {loading ? (
            <p>Cargando prescripciones…</p>
          ) : error ? (
            <p className="form-error" role="alert">{error}</p>
          ) : items.length === 0 ? (
            <div className="stack-2">
              <p className="helper-text">No hay prescripciones registradas para este paciente.</p>
              {canCreate ? (
                <Button size="sm" onClick={handleCreate}>Emitir primera prescripción</Button>
              ) : null}
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Folio</th>
                    <th>Fecha</th>
                    <th>Estado</th>
                    <th className="align-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const { variant, label } = statusInfo(item.status);
                    return (
                      <tr key={item.id}>
                        <td>{item.folio || item.id}</td>
                        <td>{formatDateISOToHuman(item.signedAt || item.createdAt || item.updatedAt)}</td>
                        <td>
                          <Badge variant={variant}>{label}</Badge>
                        </td>
                        <td className="align-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/prescriptions/${item.id}`)}
                          >
                            Ver detalle
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </section>
  );
}
