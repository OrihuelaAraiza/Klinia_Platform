import { useEffect, useMemo, useState } from "react";
import Field from "./UI/Field";
import InputField from "./InputField";
import Button from "./UI/Button";
import cieCatalog from "../assets/data/cie10-min.json";
import { useToast } from "./UI/Toast";

const INITIAL_FORM = {
  subjective: "",
  objective: "",
  analysis: "",
  plan: "",
  diagnoses: [],
};

export default function NoteForm({
  initialValue,
  onSubmit,
  onCloseNote,
  readOnly = false,
  isClosed = false,
  professional,
}) {
  const toast = useToast();
  const [form, setForm] = useState({ ...INITIAL_FORM, ...(initialValue || {}) });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [closing, setClosing] = useState(false);

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
    const next = {};
    if (!form.subjective?.trim()) next.subjective = "Describe hallazgos subjetivos";
    if (!form.objective?.trim()) next.objective = "Describe hallazgos objetivos";
    if (!form.analysis?.trim()) next.analysis = "Completa el análisis";
    if (!form.plan?.trim()) next.plan = "Registra el plan";
    return next;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (readOnly || isClosed) {
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

  const handleCloseNote = async () => {
    if (readOnly || isClosed) return;
    try {
      setClosing(true);
      await onCloseNote?.();
    } finally {
      setClosing(false);
    }
  };

  return (
    <form className={`stack-4 note-form${isClosed ? " is-closed" : ""}`} onSubmit={handleSubmit} noValidate>
      <Field label="Subjetivo" required error={errors.subjective}>
        {({ fieldId, describedBy }) => (
          <textarea
            id={fieldId}
            name="subjective"
            className="textarea"
            rows={3}
            value={form.subjective}
            onChange={handleChange}
            readOnly={readOnly || isClosed}
            aria-invalid={Boolean(errors.subjective)}
            aria-describedby={describedBy}
          />
        )}
      </Field>
      <Field label="Objetivo" required error={errors.objective}>
        {({ fieldId, describedBy }) => (
          <textarea
            id={fieldId}
            name="objective"
            className="textarea"
            rows={3}
            value={form.objective}
            onChange={handleChange}
            readOnly={readOnly || isClosed}
            aria-invalid={Boolean(errors.objective)}
            aria-describedby={describedBy}
          />
        )}
      </Field>
      <Field label="Análisis" required error={errors.analysis}>
        {({ fieldId, describedBy }) => (
          <textarea
            id={fieldId}
            name="analysis"
            className="textarea"
            rows={3}
            value={form.analysis}
            onChange={handleChange}
            readOnly={readOnly || isClosed}
            aria-invalid={Boolean(errors.analysis)}
            aria-describedby={describedBy}
          />
        )}
      </Field>
      <Field label="Plan" required error={errors.plan}>
        {({ fieldId, describedBy }) => (
          <textarea
            id={fieldId}
            name="plan"
            className="textarea"
            rows={3}
            value={form.plan}
            onChange={handleChange}
            readOnly={readOnly || isClosed}
            aria-invalid={Boolean(errors.plan)}
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
                  disabled={readOnly || isClosed}
                  onChange={() => toggleDiagnosis(option.value)}
                />
                <span>{option.label}</span>
              </label>
            );
          })}
        </div>
      </Field>

      <div className="history-meta">
        <div>
          <strong>Profesional:</strong> {professional?.name || "-"}
        </div>
        <div>
          <strong>Fecha:</strong> {new Date().toLocaleString("es-MX")}
        </div>
        <div>
          <strong>Estado:</strong> {isClosed ? "Cerrada" : "Abierta"}
        </div>
      </div>

      {!readOnly ? (
        <div className="cluster" style={{ justifyContent: "flex-end" }}>
          {!isClosed ? (
            <>
              {onCloseNote ? (
                <Button type="button" variant="secondary" onClick={handleCloseNote} loading={closing}>
                  Cerrar nota
                </Button>
              ) : null}
              <Button type="submit" loading={submitting}>
                Guardar borrador
              </Button>
            </>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
