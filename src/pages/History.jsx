import { useEffect, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import Card, { CardBody } from "../components/UI/Card";
import Button from "../components/UI/Button";
import Breadcrumbs from "../components/UI/Breadcrumbs";
import ClinicalHistoryTabs from "../components/clinical/ClinicalHistoryTabs";
import { getPatient } from "../services/patientsService";
import { ROUTES } from "../utils/constants";

/**
 * Vista de Historia Clínica para el profesional.
 * Muestra los 3 tabs (psicológica / psiquiátrica / psicoterapéutica). El tab
 * que matchea la especialidad del usuario es editable; los otros son lectura.
 */
export default function History() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role, user } = useOutletContext() ?? {};

  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    getPatient(id)
      .then((p) => active && setPatient(p))
      .catch((err) => {
        if (!active) return;
        setError(err?.message || "No pudimos cargar el paciente.");
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  const breadcrumbs = [
    { label: "Pacientes", to: ROUTES.patients },
    {
      label: patient ? `${patient.firstName} ${patient.lastName}` : "Paciente",
      to: `${ROUTES.patients}/${id}`,
    },
    { label: "Historia clínica" },
  ];

  if (loading) {
    return (
      <section className="page stack-4">
        <Breadcrumbs items={breadcrumbs} />
        <p className="helper-text">Cargando expediente…</p>
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
    <section className="page stack-4">
      <div className="page-header">
        <Breadcrumbs items={breadcrumbs} />
        <div className="cluster" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <div className="stack-1">
            <h1>Historia clínica</h1>
            {patient ? (
              <p className="helper-text">
                {patient.firstName} {patient.lastName} — CURP {patient.curp || "N/A"}
              </p>
            ) : null}
          </div>
          <Button variant="secondary" onClick={() => navigate(`/patients/${id}`)}>
            Regresar al expediente
          </Button>
        </div>
      </div>

      <ClinicalHistoryTabs
        patientId={id}
        role={role}
        userSpecialty={user?.specialty}
      />
    </section>
  );
}
