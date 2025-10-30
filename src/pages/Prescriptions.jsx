import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import ButtonPrimary from "../components/ButtonPrimary";
import InputField from "../components/InputField";
import auditService from "../services/auditService";
import { PRESCRIPTION_FIELDS, ROLES } from "../utils/constants";

const INITIAL_STATE = PRESCRIPTION_FIELDS.reduce(
  (acc, field) => ({
    ...acc,
    [field.name]: "",
  }),
  { patientId: "" }
);

export default function Prescriptions() {
  const { role } = useOutletContext() ?? {};
  const [form, setForm] = useState(INITIAL_STATE);
  const [statusMessage, setStatusMessage] = useState("");

  const isReadOnly = role === ROLES.ASSISTANT;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setForm(INITIAL_STATE);
  };

  const handleGeneratePdf = async () => {
    await auditService.logAudit("generate_prescription_pdf", { patientId: form.patientId });
    setStatusMessage("PDF generado (simulado). Se enviará al paciente por correo.");
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    if (isReadOnly) {
      setStatusMessage("Solo lectura: solicita a un profesional que emita la prescripción.");
      return;
    }

    await auditService.logAudit("register_prescription", { patientId: form.patientId });
    setStatusMessage("Prescripción registrada en bitácora de auditoría.");
    resetForm();
  };

  return (
    <section className="page">
      <header className="page__header">
        <h1>Prescripciones</h1>
        <p>Genera recetas electrónicas y regístralas para seguimiento terapéutico.</p>
      </header>

      <form className="form-grid" onSubmit={handleRegister} noValidate>
        <InputField
          label="ID del paciente"
          name="patientId"
          value={form.patientId}
          onChange={handleChange}
          placeholder="KLI-001"
          required
          autoComplete="off"
          assistiveText="Ingresa el identificador interno del expediente."
        />
        {PRESCRIPTION_FIELDS.map((field) => (
          <InputField
            key={field.name}
            label={field.label}
            name={field.name}
            value={form[field.name]}
            onChange={handleChange}
            placeholder=""
            required={field.name !== "notes"}
            autoComplete="off"
          />
        ))}

        <div className="form-grid__actions">
          <ButtonPrimary
            type="button"
            variant="secondary"
            onClick={handleGeneratePdf}
            disabled={isReadOnly}
          >
            Generar PDF (stub)
          </ButtonPrimary>
          <ButtonPrimary type="submit" disabled={isReadOnly}>
            Registrar emisión (stub)
          </ButtonPrimary>
        </div>
      </form>

      {statusMessage ? (
        <p className="helper-text" role="status">
          {statusMessage}
        </p>
      ) : null}

      {isReadOnly ? (
        <div className="empty-state empty-state--inline">
          <p>
            Perfil asistente: consulta permitida pero sin capacidad de emitir recetas.
          </p>
        </div>
      ) : null}
    </section>
  );
}
