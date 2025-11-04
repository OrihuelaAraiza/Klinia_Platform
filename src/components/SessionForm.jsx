import { useEffect, useMemo, useState } from "react";
import InputField from "./InputField";
import Field from "./UI/Field";
import Button from "./UI/Button";
import { listPatients } from "../services/patientsService";
import { useToast } from "./UI/Toast";
import { SESSION_MODALITY, SESSION_MODALITY_LABEL, SESSION_STATUS } from "../utils/constants";

const DEFAULT_FORM = {
  patientId: "",
  datetime: "",
  durationMin: 50,
  professionalId: "",
  professionalName: "",
  status: SESSION_STATUS.PROGRAMADA,
  modality: SESSION_MODALITY.PRESENCIAL,
  location: "",
  notes: "",
};

function nowLocalInputValue() {
  const now = new Date();
  now.setSeconds(0, 0);
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function toLocalInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function fromLocalInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toISOString();
}

export default function SessionForm({
  initialValue,
  onSubmit,
  onCancel,
  readOnly = false,
  defaultProfessional,
  defaultProfessionalId,
  presetPatientId,
}) {
  const toast = useToast();
  const [form, setForm] = useState(() => ({
    ...DEFAULT_FORM,
    ...(initialValue || {}),
    datetime: toLocalInput(initialValue?.datetime),
    professionalId: initialValue?.professionalId || defaultProfessionalId || "",
    professionalName: initialValue?.professionalName || defaultProfessional || "",
    patientId: presetPatientId || initialValue?.patientId || "",
    modality: initialValue?.modality || DEFAULT_FORM.modality,
    location: initialValue?.location || "",
  }));
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [patients, setPatients] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadPatients() {
      if (readOnly) {
        return;
      }
      setLoadingPatients(true);
      try {
        const response = await listPatients({ size: 100 });
        if (!active) return;
        const items = Array.isArray(response?.items) ? response.items : response;
        setPatients(items || []);
      } catch (error) {
        if (!active) return;
        toast.error(error?.message || "No pudimos obtener la lista de pacientes.");
      } finally {
        if (active) {
          setLoadingPatients(false);
        }
      }
    }
    loadPatients();
    return () => {
      active = false;
    };
  }, [readOnly, toast]);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      ...(initialValue || {}),
      datetime: toLocalInput(initialValue?.datetime),
      modality: initialValue?.modality || DEFAULT_FORM.modality,
      location: initialValue?.location || "",
    }));
  }, [initialValue]);

  const patientOptions = useMemo(() => {
    return patients.map((patient) => ({
      value: patient.id,
      label: `${patient.firstName || ""} ${patient.lastName || ""}`.trim() || patient.curp || patient.id,
    }));
  }, [patients]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validate = () => {
    const nextErrors = {};
    if (!presetPatientId && !form.patientId) {
      nextErrors.patientId = "Selecciona un paciente.";
    }
    if (!form.datetime) {
      nextErrors.datetime = "Define fecha y hora.";
    } else {
      const selectedDate = new Date(form.datetime);
      if (Number.isNaN(selectedDate.getTime())) {
        nextErrors.datetime = "Fecha inválida.";
      } else if (selectedDate.getTime() <= Date.now()) {
        nextErrors.datetime = "Elige una fecha futura.";
      }
    }
    const durationValue = Number(form.durationMin);
    if (!durationValue) {
      nextErrors.durationMin = "Ingresa la duración en minutos.";
    } else if (durationValue < 15 || durationValue > 180) {
      nextErrors.durationMin = "La duración debe estar entre 15 y 180 minutos.";
    }
    if (!form.professionalId && !form.professionalName) {
      nextErrors.professionalName = "Ingresa el profesional responsable.";
    }
    if (!form.modality) {
      nextErrors.modality = "Selecciona la modalidad.";
    }
    if (form.modality === SESSION_MODALITY.VIRTUAL) {
      if (!form.location) {
        nextErrors.location = "Ingresa el link de la videollamada.";
      } else {
        try {
          const url = new URL(form.location);
          if (!["http:", "https:"].includes(url.protocol)) {
            nextErrors.location = "El link debe comenzar con http(s).";
          }
        } catch {
          nextErrors.location = "Ingresa una URL válida.";
        }
      }
    }
    return nextErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (readOnly) return;
    const validation = validate();
    setErrors(validation);
    if (Object.keys(validation).length) {
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        patientId: presetPatientId || form.patientId,
        datetime: fromLocalInput(form.datetime),
        durationMin: Number(form.durationMin) || 50,
        status: form.status || SESSION_STATUS.PROGRAMADA,
        professionalId: form.professionalId || defaultProfessionalId || "",
        professionalName: form.professionalName || defaultProfessional || "",
        modality: form.modality || SESSION_MODALITY.PRESENCIAL,
        location: form.location?.trim() || undefined,
        notes: form.notes?.trim() || undefined,
      };
      await onSubmit?.(payload);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="stack-3" onSubmit={handleSubmit} noValidate>
      {!presetPatientId ? (
        <Field label="Paciente" required error={errors.patientId}>
          {({ fieldId }) => (
            <select
              id={fieldId}
              name="patientId"
              className={`role-select${errors.patientId ? " has-error" : ""}`}
              value={form.patientId}
              onChange={handleChange}
              disabled={readOnly || loadingPatients}
              aria-invalid={Boolean(errors.patientId)}
            >
              <option value="">Selecciona...</option>
              {patientOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
        </Field>
      ) : null}

      <InputField
        label="Fecha y hora"
        type="datetime-local"
        name="datetime"
        value={form.datetime}
        onChange={handleChange}
        required
        error={errors.datetime}
        disabled={readOnly}
        min={nowLocalInputValue()}
      />

      <InputField
        label="Duración (min)"
        type="number"
        name="durationMin"
        value={form.durationMin}
        onChange={handleChange}
        required
        error={errors.durationMin}
        disabled={readOnly}
        min={15}
        max={180}
      />

      <Field label="Modalidad" required error={errors.modality}>
        {({ fieldId }) => (
          <select
            id={fieldId}
            name="modality"
            className={`role-select${errors.modality ? " has-error" : ""}`}
            value={form.modality}
            onChange={handleChange}
            disabled={readOnly}
            aria-invalid={Boolean(errors.modality)}
          >
            {Object.values(SESSION_MODALITY).map((value) => (
              <option key={value} value={value}>
                {SESSION_MODALITY_LABEL[value]}
              </option>
            ))}
          </select>
        )}
      </Field>

      <InputField
        label={form.modality === SESSION_MODALITY.VIRTUAL ? "Link de conexión" : "Ubicación (opcional)"}
        type={form.modality === SESSION_MODALITY.VIRTUAL ? "url" : "text"}
        name="location"
        value={form.location}
        onChange={handleChange}
        error={errors.location}
        disabled={readOnly}
        required={form.modality === SESSION_MODALITY.VIRTUAL}
        placeholder={form.modality === SESSION_MODALITY.VIRTUAL ? "https://meet..." : "Consultorio 4B"}
        assistiveText={form.modality === SESSION_MODALITY.VIRTUAL ? "Solo enlaces seguros (https)." : "Puedes indicar consultorio o link de respaldo."}
      />

      <InputField
        label="Profesional"
        name="professionalName"
        value={form.professionalName}
        onChange={handleChange}
        error={errors.professionalName}
        disabled={readOnly}
        assistiveText="Nombre que aparecerá en la nota y registro."
      />

      <InputField
        label="Notas internas (opcional)"
        type="text"
        name="notes"
        value={form.notes}
        onChange={handleChange}
        disabled={readOnly}
        placeholder="Recordatorios o consideraciones para la sesión"
      />

      {!readOnly ? (
        <div className="form__actions">
          {onCancel ? (
            <Button variant="ghost" type="button" onClick={onCancel} disabled={submitting}>
              Cancelar
            </Button>
          ) : null}
          <Button type="submit" loading={submitting}>
            Guardar sesión
          </Button>
        </div>
      ) : null}
    </form>
  );
}
