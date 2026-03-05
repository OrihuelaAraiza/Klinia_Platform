import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useOutletContext, useParams } from "react-router-dom";
import Card, { CardBody, CardHeader } from "../components/UI/Card";
import Button from "../components/UI/Button";
import Breadcrumbs from "../components/UI/Breadcrumbs";
import ClinicalHistoryWizard from "../components/clinical/ClinicalHistoryWizard";
import HC_SCHEMA from "../config/clinicalSchemas/hc.schema";
import { getClinicalHistory, saveClinicalHistory } from "../services/clinicalHistoryService";
import { getPatient } from "../services/patientsService";
import { useToast } from "../components/UI/Toast";
import { ROLES } from "../utils/constants"
import { mapHistoryToForm } from "../utils/clinicalHistoryValidator";

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
        const [patientRes, historyRes] = await Promise.allSettled([
          getPatient(id),
          getClinicalHistory(id),
        ]);
        if (!active) return;
        if (patientRes.status === "fulfilled") {
          setPatient(patientRes.value);
        }

        if (historyRes.status === "fulfilled") {
          setHistory(historyRes.value);
        } else if (historyRes.reason?.status === 404) {
          setHistory(null);
        } else {
          setError(
            historyRes.reason?.message ||
            "No pudimos cargar la historia clínica."
          );
        }

      } catch (err) {
        if (!active) return;
        setError(err.message || "Error al cargar la historia clínica.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => { active = false; };
  }, [id]);

  const patientName = patient
    ? `${patient.firstName} ${patient.lastName}`.trim()
    : "Paciente";

  const breadcrumbs = useMemo(() => [
    { to: `/patients/${id}`, label: patientName },
    { label: "Historia clínica" },
  ], [id, patientName]);

  const initialWizardData = useMemo(
    () => mapHistoryToForm(history),
    [history]
  );

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

  if (error) {
    return (
      <section className="page stack-4">
        <Breadcrumbs items={breadcrumbs} />
        <Card hoverable={false}>
          <CardBody>
            <p className="form-error">{error}</p>
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
            {patient && (
              <p className="helper-text">
                {patient.firstName} {patient.lastName} — CURP {patient.curp || "N/A"}
              </p>
            )}
          </div>

          {history && (
            <Button
              variant="ghost"
              onClick={() => toast.success("Exportación NOM-004 (stub)")}
            >
              Exportar (stub)
            </Button>
          )}
          <Button variant="secondary" onClick={() => navigate(`/patients/${id}`)}>
            Regresar al perfil
          </Button>
        </div>
      </div>

      <Card hoverable={false}>
        <CardHeader>
          <h2>
            {history ? "Editar historia clínica" : "Crear historia clínica"}
          </h2>
        </CardHeader>

        <CardBody>
          <ClinicalHistoryWizard
            schema={HC_SCHEMA}
            initialData={initialWizardData}
            onSubmit={async (data) => {
              const saved = await saveClinicalHistory(id, data);
              setHistory(saved);
              toast.success("Historia clínica guardada correctamente");
            }}
            readOnly={false}
            context={context}
            submitLabel="Guardar historia clínica"
            draftLabel="Guardar borrador"
          />
        </CardBody>
      </Card>
    </section>
  );
}
