import { useEffect, useMemo, useRef, useState } from "react";
import Button from "./UI/Button";
import InputField from "./InputField";
import Field from "./UI/Field";
import {
  isValidEmail,
  isValidPhone,
  isValidCURP,
  isValidDateYYYYMMDD,
  required,
} from "../utils/validators";

const DEFAULT_FORM = {
  firstName: "",
  lastName: "",
  curp: "",
  birthDate: "",
  sex: "",
  phone: "",
  email: "",
};

const SEX_OPTIONS = [
  { value: "M", label: "Masculino" },
  { value: "F", label: "Femenino" },
  { value: "X", label: "No especificado" },
];

function normalizeAttachment(file) {
  const extension = file.name.split(".").pop()?.toUpperCase() ?? "";
  const allowed = ["PDF", "JPG", "JPEG", "PNG"];
  const normalizedType = allowed.includes(extension) ? (extension === "JPEG" ? "JPG" : extension) : "PDF";
  return {
    id: crypto.randomUUID(),
    name: file.name,
    size: file.size,
    type: normalizedType,
  };
}

function validateForm({ form }) {
  const errors = {};

  if (!required(form.firstName)) {
    errors.firstName = "Nombre obligatorio";
  }
  if (!required(form.lastName)) {
    errors.lastName = "Apellido obligatorio";
  }
  if (!isValidCURP(form.curp)) {
    errors.curp = "CURP inválida";
  }
  if (!isValidDateYYYYMMDD(form.birthDate)) {
    errors.birthDate = "Fecha inválida";
  }
  if (!required(form.sex)) {
    errors.sex = "Selecciona un sexo";
  }
  if (!isValidPhone(form.phone)) {
    errors.phone = "Teléfono inválido";
  }
  if (!isValidEmail(form.email)) {
    errors.email = "Correo inválido";
  }

  return errors;
}

export default function PatientForm({
  initialValue,
  onSubmit,
  onCancel,
  readOnly = false,
}) {
  const [form, setForm] = useState({ ...DEFAULT_FORM, ...(initialValue || {}) });
  const [attachments, setAttachments] = useState(initialValue?.attachments ?? []);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    setForm({ ...DEFAULT_FORM, ...(initialValue || {}) });
    setAttachments(initialValue?.attachments ?? []);
    setFormError("");
    setErrors({});
  }, [initialValue]);

  const isReadOnly = Boolean(readOnly);

  const formData = useMemo(
    () => ({
      ...form,
      attachments,
    }),
    [form, attachments]
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    if (formError) {
      setFormError("");
    }
  };

  const handleAttachmentChange = (event) => {
    const { files } = event.target;
    if (!files || !files.length || isReadOnly) {
      return;
    }
    const next = Array.from(files).map(normalizeAttachment);
    setAttachments((prev) => [...prev, ...next]);
    event.target.value = "";
  };

  const handleRemoveAttachment = (attachmentId) => {
    setAttachments((prev) => prev.filter((item) => item.id !== attachmentId));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isReadOnly) {
      onCancel?.();
      return;
    }

    const validation = validateForm({ form: formData });
    const hasErrors = Object.keys(validation).length > 0;
    setErrors(validation);

    if (hasErrors) {
      return;
    }

    try {
      setSubmitting(true);
      setFormError("");
      await onSubmit?.({ ...formData });
    } catch (error) {
      setFormError(error?.message || "No pudimos guardar el paciente.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="patient-form" onSubmit={handleSubmit} noValidate>
      <div className="form-grid">
        <InputField
          label="Nombre"
          name="firstName"
          value={form.firstName}
          onChange={handleChange}
          required
          disabled={isReadOnly}
          error={errors.firstName}
        />
        <InputField
          label="Apellido"
          name="lastName"
          value={form.lastName}
          onChange={handleChange}
          required
          disabled={isReadOnly}
          error={errors.lastName}
        />
        <InputField
          label="CURP"
          name="curp"
          value={form.curp}
          onChange={handleChange}
          required
          disabled={isReadOnly}
          error={errors.curp}
        />
        <InputField
          label="Fecha de nacimiento"
          type="date"
          name="birthDate"
          value={form.birthDate}
          onChange={handleChange}
          required
          disabled={isReadOnly}
          error={errors.birthDate}
        />
        <Field label="Sexo" name="sex" required error={errors.sex}>
          {({ fieldId, describedBy }) => (
            <select
              id={fieldId}
              name="sex"
              className={`role-select${errors.sex ? " has-error" : ""}`}
              value={form.sex}
              onChange={handleChange}
              disabled={isReadOnly}
              aria-invalid={Boolean(errors.sex)}
              aria-describedby={describedBy}
            >
              <option value="">Selecciona</option>
              {SEX_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
        </Field>
        <InputField
          label="Teléfono"
          name="phone"
          value={form.phone}
          onChange={handleChange}
          required
          disabled={isReadOnly}
          error={errors.phone}
        />
        <InputField
          label="Correo electrónico"
          name="email"
          value={form.email}
          onChange={handleChange}
          required
          disabled={isReadOnly}
          error={errors.email}
        />
      </div>

      {formError ? (
        <p className="form-error" role="alert">
          {formError}
        </p>
      ) : null}

      <div className="panel panel--outline">
        <div className="panel-header">
          <h3>Archivos adjuntos</h3>
          <p className="helper-text">
            Agrega archivos PDF, JPG o PNG para referencias clínicas (no se subirán aún).
          </p>
        </div>
        <div className="panel-body attachments-list">
          {attachments.length === 0 ? (
            <p className="helper-text">Sin archivos adjuntos.</p>
          ) : (
            attachments.map((file) => (
              <div key={file.id} className="attachments-item">
                <div>
                  <strong>{file.name}</strong>
                  <p className="helper-text">
                    {file.type} • {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                {!isReadOnly ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleRemoveAttachment(file.id)}
                  >
                    Quitar
                  </Button>
                ) : null}
              </div>
            ))
          )}
        </div>
        {!isReadOnly ? (
          <div className="panel-footer">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleAttachmentChange}
            />
          </div>
        ) : null}
      </div>

      <div className="form-actions">
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        ) : null}
        {!isReadOnly ? (
          <Button type="submit" loading={submitting}>
            Guardar paciente
          </Button>
        ) : null}
      </div>
    </form>
  );
}
