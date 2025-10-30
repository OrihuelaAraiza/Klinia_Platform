import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useOutletContext, useParams } from "react-router-dom";
import Card, { CardBody, CardHeader } from "../components/UI/Card";
import Button from "../components/UI/Button";
import Breadcrumbs from "../components/UI/Breadcrumbs";
import HistoryForm from "../components/HistoryForm";
import auditService from "../services/auditService";
import { getHistory, createHistory } from "../services/historyService";
import { getPatient } from "../services/patientsService";
import { useToast } from "../components/UI/Toast";
import { ROLES } from "../utils/constants";

export default function History() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { role, user } = useOutletContext() ?? {};
  const isAssistant = role === ROLES.ASSISTANT;

  const [patient, setPatient] = useState(null);
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [patientResponse, historyResponse] = await Promise.allSettled([
          getPatient(id),
          getHistory(id),
        ]);

        if (!active) return;
        if (patientResponse.status === "fulfilled") {
          setPatient(patientResponse.value);
        }
        if (historyResponse.status === "fulfilled") {
          setHistory(historyResponse.value);
        } else if (historyResponse.reason?.status && historyResponse.reason.status !== 404) {
          setError(historyResponse.reason.message || "No pudimos cargar la historia clínica.");
        }
      } catch (err) {
        if (!active) return;
        setError(err.message || "No pudimos cargar la historia clínica.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [id]);

  const patientName = patient ? `${patient.firstName} ${patient.lastName}`.trim() : "Paciente";
  const breadcrumbs = useMemo(
    () => [
      { to: `/patients/${id}`, label: patientName || "Paciente" },
      { label: "Historia clínica" },
    ],
    [id, patientName]
  );

  const handleCreateHistory = async (payload) => {
    try {
      const response = await createHistory(id, {
        ...payload,
        createdAt: new Date().toISOString(),
      });
      setHistory(response);
      toast.success("Historia clínica registrada");
      auditService.logAudit("history_create", { patientId: id });
    } catch (err) {
      const message = err.message || "No pudimos guardar la historia clínica.";
      setError(message);
      toast.error(message);
    }
  };

  if (isAssistant) {
    return <Navigate to={`/patients/${id}`} replace />;
  }

  if (loading) {
    return <p>Cargando historia clínica…</p>;
  }

  if (error) {
    return (
      <section className="page stack-4">
        <Breadcrumbs items={breadcrumbs} />
        <Card hoverable={false}>
          <CardBody>
            <p className="form-error" role="alert">
              {error}
            </p>
            <Button variant="secondary" onClick={() => navigate(-1)}>
              Volver
            </Button>
          </CardBody>
        </Card>
      </section>
    );
  }

  const professional = {
    id: user?.id ?? "user",
    name: user?.name ?? "Profesional Klinia",
    license: user?.license ?? "LIC-000",
  };

  return (
    <section className="page stack-5">
      <div className="page-header">
        <Breadcrumbs items={breadcrumbs} />
        <div className="stack-1">
          <h1>Historia clínica</h1>
          {patient ? (
            <p className="helper-text">
              {patient.firstName} {patient.lastName} — CURP {patient.curp}
            </p>
          ) : null}
        </div>
      </div>

      {history ? (
        <Card hoverable={false}>
          <CardHeader>
            <h2>Resumen</h2>
            <Button variant="ghost" onClick={() => toast.success("Exportación NOM-004 (stub)")}>
              Exportar (stub)
            </Button>
          </CardHeader>
          <CardBody className="stack-3">
            <div className="stack-1">
              <strong>Motivo de consulta</strong>
              <p>{history.motive}</p>
            </div>
            <div className="stack-1">
              <strong>Antecedentes psicosociales</strong>
              <p>{history.psychosocialBackground}</p>
            </div>
            <div className="stack-1">
              <strong>Examen mental</strong>
              <p>{history.mentalStatusExam}</p>
            </div>
            <div className="stack-1">
              <strong>Diagnóstico(s)</strong>
              <ul>
                {(history.diagnoses ?? []).map((dx) => (
                  <li key={dx.code}>{dx.code} — {dx.label}</li>
                ))}
              </ul>
            </div>
            <div className="stack-1">
              <strong>Objetivos terapéuticos</strong>
              <p>{history.goals}</p>
            </div>
            <div className="stack-1">
              <strong>Plan terapéutico</strong>
              <p>{history.therapeuticPlan}</p>
            </div>
            <div className="history-meta">
              <span><strong>Profesional:</strong> {history.professional?.name}</span>
              <span><strong>Registro:</strong> {new Date(history.createdAt).toLocaleString("es-MX")}</span>
            </div>
          </CardBody>
        </Card>
      ) : (
        <Card hoverable={false}>
          <CardHeader>
            <h2>Crear historia clínica</h2>
          </CardHeader>
          <CardBody>
            {isAssistant ? (
              <p className="helper-text">
                Perfil asistente: solicita a un profesional que capture la historia clínica.
              </p>
            ) : (
              <HistoryForm onSubmit={handleCreateHistory} professional={professional} createdAt={new Date().toISOString()} />
            )}
          </CardBody>
        </Card>
      )}
    </section>
  );
}
