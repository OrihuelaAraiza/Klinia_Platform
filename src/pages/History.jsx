import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useOutletContext, useParams } from "react-router-dom";
import Card, { CardBody, CardHeader } from "../components/UI/Card";
import Button from "../components/UI/Button";
import Breadcrumbs from "../components/UI/Breadcrumbs";
import DynamicClinicalForm from "../components/clinical/DynamicClinicalForm";
import HC_SCHEMA from "../config/clinicalSchemas/hc.schema";
import { getClinicalHistory, saveClinicalHistory } from "../services/clinicalHistoryService";
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
          getClinicalHistory(id),
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

  const handleSave = async (payload) => {
    try {
      const response = await saveClinicalHistory(id, payload, false);
      setHistory(response);
      toast.success("Historia clínica guardada correctamente");
    } catch (err) {
      const message = err.message || "No pudimos guardar la historia clínica.";
      setError(message);
      toast.error(message);
      throw err;
    }
  };

  const handleSaveDraft = async (payload) => {
    try {
      const response = await saveClinicalHistory(id, payload, true);
      setHistory(response);
      toast.success("Borrador guardado");
    } catch (err) {
      toast.error(err.message || "No pudimos guardar el borrador.");
    }
  };

  const context = useMemo(() => ({
    patient,
    patientId: id,
    professional: {
      id: user?.id,
      name: user?.name,
      license: user?.license || user?.kycRecord?.certificateFolio,
    },
    datetime: new Date().toISOString(),
  }), [patient, id, user]);

  if (isAssistant) {
    return <Navigate to={`/patients/${id}`} replace />;
  }

  if (loading) {
    return (
      <section className="page stack-4">
        <Breadcrumbs items={breadcrumbs} />
        <p>Cargando historia clínica…</p>
      </section>
    );
  }

  if (error && !history) {
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

  return (
    <section className="page stack-5">
      <div className="page-header">
        <Breadcrumbs items={breadcrumbs} />
        <div className="cluster" style={{ justifyContent: "space-between" }}>
          <div className="stack-1">
            <h1>Historia clínica</h1>
            {patient ? (
              <p className="helper-text">
                {patient.firstName} {patient.lastName} — CURP {patient.curp || "N/A"}
              </p>
            ) : null}
          </div>
          {history && (
            <Button variant="ghost" onClick={() => toast.success("Exportación NOM-004 (stub)")}>
              Exportar (stub)
            </Button>
          )}
        </div>
      </div>

      {history && !history.isDraft ? (
        <Card hoverable={false}>
          <CardHeader>
            <h2>Historia clínica registrada</h2>
            <div className="cluster" style={{ gap: "var(--s-2)" }}>
              <Button 
                variant="secondary" 
                onClick={() => setHistory({ ...history, isDraft: true })}
              >
                Editar
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            <p className="helper-text">
              La historia clínica está registrada. Para editarla, haz clic en "Editar".
            </p>
            <div className="history-meta" style={{ marginTop: "var(--s-4)" }}>
              <span><strong>Última actualización:</strong> {new Date(history.updatedAt || history.createdAt).toLocaleString("es-MX")}</span>
            </div>
          </CardBody>
        </Card>
      ) : (
        <Card hoverable={false}>
          <CardHeader>
            <h2>{history?.isDraft ? "Editar historia clínica (borrador)" : "Crear historia clínica"}</h2>
          </CardHeader>
          <CardBody>
            {isAssistant ? (
              <p className="helper-text">
                Perfil asistente: solicita a un profesional que capture la historia clínica.
              </p>
            ) : (
              <DynamicClinicalForm
                schema={HC_SCHEMA}
                initialData={history || {}}
                onSubmit={handleSave}
                onSaveDraft={handleSaveDraft}
                readOnly={isAssistant}
                context={context}
                showDraftButton={true}
                submitLabel="Guardar historia clínica"
                draftLabel="Guardar borrador"
              />
            )}
          </CardBody>
        </Card>
      )}
    </section>
  );
}
