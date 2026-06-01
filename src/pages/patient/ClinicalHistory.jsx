import { useOutletContext } from "react-router-dom";
import { Printer } from "lucide-react";
import ClinicalHistoryTabs from "../../components/clinical/ClinicalHistoryTabs";
import Button from "../../components/UI/Button";
import "./pdf.css";

/**
 * Vista del paciente: muestra sus 3 historias clínicas (psicológica,
 * psiquiátrica y psicoterapéutica) en modo solo lectura. Si alguna fue subida
 * como versión física por su equipo clínico, también aparece descargable.
 */
export default function PatientClinicalHistory() {
  const { user } = useOutletContext() ?? {};
  const patientId = user?.patientId || user?.id;

  if (!patientId) {
    return (
      <section className="page stack-3">
        <p className="helper-text">No pudimos identificar tu expediente.</p>
      </section>
    );
  }

  return (
    <section className="page stack-4">
      <header
        className="cluster"
        style={{ justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}
      >
        <div>
          <h1>Mi historia clínica</h1>
          <p className="helper-text">
            Tu equipo clínico puede registrar hasta tres tipos de historia: psicológica,
            psiquiátrica y psicoterapéutica. Aquí están en modo lectura.
          </p>
        </div>
        <Button variant="ghost" onClick={() => window.print()} className="no-print">
          <Printer size={16} /> Imprimir
        </Button>
      </header>

      <ClinicalHistoryTabs
        patientId={patientId}
        role="PATIENT"
        userSpecialty={null}
      />
    </section>
  );
}
