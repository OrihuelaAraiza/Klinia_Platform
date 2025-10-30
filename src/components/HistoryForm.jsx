import { useEffect, useMemo, useState } from "react";
import Field from "./UI/Field";
import InputField from "../components/InputField";
import Button from "./UI/Button";
import cieCatalog from "../assets/data/cie10-min.json";
import { useToast } from "./UI/Toast";

const INITIAL_FORM = {
  motive: "",
  psychosocialBackground: "",
  mentalStatusExam: "",
  diagnoses: [],
  goals: "",
  therapeuticPlan: "",
};

export default function HistoryForm({
  initialValue,
  onSubmit,
  readOnly = false,
  professional,
  createdAt,
}) {
  const toast = useToast();
  const [form, setForm] = useState({ ...INITIAL_FORM, ...(initialValue || {}) });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setForm({ ...INITIAL_FORM, ...(initialValue || {}) });
    setErrors({});
  }, [initialValue]);

  const diagnosisOptions = useMemo(
    () => cieCatalog.map((entry) => ({ value: entry.code, label: `${entry.code} — ${entry.label}` })),
    []
  );

  const toggleDiagnosis = (code) => {
    setForm((prev) => {
      const exists = prev.diagnoses?.some((item) => item.code === code);
      if (exists) {
        return {
          ...prev,
          diagnoses: prev.diagnoses.filter((item) => item.code !== code),
        };
      }
      const option = diagnosisOptions.find((item) => item.value === code);
      return {
        ...prev,
        diagnoses: [...(prev.diagnoses ?? []), { code, label: option?.label?.split(" — ")[1] ?? code }],
      };
    });
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.motive?.trim()) nextErrors.motive = "Motivo de consulta obligatorio";
    if (!form.psychosocialBackground?.trim()) nextErrors.psychosocialBackground = "Describe antecedentes";
    if (!form.mentalStatusExam?.trim()) nextErrors.mentalStatusExam = "Registra el examen mental";
    if (!form.goals?.trim()) nextErrors.goals = "Describe los objetivos";
    if (!form.therapeuticPlan?.trim()) nextErrors.therapeuticPlan = "Describe el plan terapéutico";
    return nextErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (readOnly) {
      return;
    }

    const validation = validate();
    setErrors(validation);
    if (Object.keys(validation).length) {
      toast.error("Completa los campos requeridos");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit?.({ ...form, professional });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="stack-4" onSubmit={handleSubmit} noValidate>
      <InputField
        label="Motivo de consulta"
        name="motive"
        value={form.motive}
        onChange={handleChange}
        required
        readOnly={readOnly}
        error={errors.motive}
      />
      <Field label="Antecedentes psicosociales" required error={errors.psychosocialBackground}>
        {({ fieldId, describedBy }) => (
          <textarea
            id={fieldId}
            name="psychosocialBackground"
            className="textarea"
            rows={4}
            value={form.psychosocialBackground}
            onChange={handleChange}
            readOnly={readOnly}
            aria-invalid={Boolean(errors.psychosocialBackground)}
            aria-describedby={describedBy}
          />
        )}
      </Field>
      <Field label="Examen mental" required error={errors.mentalStatusExam}>
        {({ fieldId, describedBy }) => (
          <textarea
            id={fieldId}
            name="mentalStatusExam"
            className="textarea"
            rows={4}
            value={form.mentalStatusExam}
            onChange={handleChange}
            readOnly={readOnly}
            aria-invalid={Boolean(errors.mentalStatusExam)}
            aria-describedby={describedBy}
          />
        )}
      </Field>
      <Field label="Diagnóstico(s)" hint="Selecciona todos los diagnósticos aplicables">
        <div className="history-diagnoses">
          {diagnosisOptions.map((option) => {
            const checked = form.diagnoses?.some((item) => item.code === option.value);
            return (
              <label key={option.value} className="history-diagnoses__item">
                <input
                  type="checkbox"
                  value={option.value}
                  checked={checked}
                  disabled={readOnly}
                  onChange={() => toggleDiagnosis(option.value)}
                />
                <span>{option.label}</span>
              </label>
            );
          })}
        </div>
      </Field>
      <Field label="Objetivos terapéuticos" required error={errors.goals}>
        {({ fieldId, describedBy }) => (
          <textarea
            id={fieldId}
            name="goals"
            className="textarea"
            rows={3}
            value={form.goals}
            onChange={handleChange}
            readOnly={readOnly}
            aria-invalid={Boolean(errors.goals)}
            aria-describedby={describedBy}
          />
        )}
      </Field>
      <Field label="Plan terapéutico" required error={errors.therapeuticPlan}>
        {({ fieldId, describedBy }) => (
          <textarea
            id={fieldId}
            name="therapeuticPlan"
            className="textarea"
            rows={3}
            value={form.therapeuticPlan}
            onChange={handleChange}
            readOnly={readOnly}
            aria-invalid={Boolean(errors.therapeuticPlan)}
            aria-describedby={describedBy}
          />
        )}
      </Field>

      <div className="history-meta">
        <div>
          <strong>Profesional responsable:</strong> {professional?.name || "-"}
        </div>
        <div>
          <strong>Fecha de registro:</strong> {createdAt ? new Date(createdAt).toLocaleString("es-MX") : "-"}
        </div>
      </div>

      {!readOnly ? (
        <div className="form-actions">
          <Button type="submit" loading={submitting}>
            Guardar historia clínica
          </Button>
        </div>
      ) : null}
    </form>
  );
}
