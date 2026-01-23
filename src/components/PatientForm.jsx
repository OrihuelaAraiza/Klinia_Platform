import { useEffect, useMemo, useRef, useState } from "react";
import Button from "./UI/Button.jsx";
import InputField from "./InputField.jsx";
import Field from "./UI/Field.jsx";
import { lookupPostalCode, findStateValue } from "../utils/addressLookup.js";
import { MEXICAN_STATES } from "../utils/constants.js";
import {
  isValidEmail,
  isValidPhone,
  isValidCURP,
  isValidDateYYYYMMDD,
  required,
} from "../utils/validators.js";

const DEFAULT_FORM = {
  firstName: "",
  lastName: "",
  curp: "",
  birthDate: "",
  gender: "",
  phone: "",
  email: "",
  referral: "",
  purpose: "",
  emergencyName: "",
  emergencyPhone: "",
  // Campos de Domicilio añadidos
  postalCode: "",
  state: "",
  city: "",
  neighborhood: "",
  street: "",
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

  if (!required(form.firstName)) errors.firstName = "Nombre obligatorio";
  if (!required(form.lastName)) errors.lastName = "Apellido obligatorio";
  if (required(form.curp) && !isValidCURP(form.curp)) errors.curp = "CURP inválida";
  if (!isValidDateYYYYMMDD(form.birthDate)) errors.birthDate = "Fecha inválida";
  if (!required(form.gender)) errors.gender = "Selecciona un sexo";
  if (!isValidPhone(form.phone)) errors.phone = "Teléfono inválido";
  if (!isValidEmail(form.email)) errors.email = "Correo inválido";
  if (!required(form.referral)) errors.referral = "Referencia obligatoria";
  if (!required(form.purpose)) errors.purpose = "Motivo de consulta obligatorio";
  if (!required(form.emergencyName)) errors.emergencyName = "Nombre de contacto obligatorio";
  if (!isValidPhone(form.emergencyPhone)) errors.emergencyPhone = "Teléfono de emergencia inválido";
  
  // Validaciones de Domicilio
  if (!required(form.postalCode) || form.postalCode.length < 5) errors.postalCode = "CP inválido";
  if (!required(form.state)) errors.state = "Estado obligatorio";
  if (!required(form.city)) errors.city = "Ciudad obligatoria";
  if (!required(form.neighborhood)) errors.neighborhood = "Colonia obligatoria";
  if (!required(form.street)) errors.street = "Calle obligatoria";

  return errors;
}

export default function PatientForm({
  initialValue,
  onSubmit,
  onCancel,
  readOnly = false,
}) {
  const mergedInitialValue = useMemo(() => {
    const defaults = { ...DEFAULT_FORM };
    if (initialValue) {
      const patientData = { ...initialValue, gender: initialValue.sex || initialValue.gender };
      return { ...defaults, ...patientData };
    }
    return defaults;
  }, [initialValue]);

  const [form, setForm] = useState(mergedInitialValue);
  const [attachments, setAttachments] = useState(initialValue?.attachments ?? []);
  const [colonies, setColonies] = useState([]);
  const [loadingCP, setLoadingCP] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const fileInputRef = useRef(null);

  const isReadOnly = Boolean(readOnly);

  // Efecto para buscar el Código Postal
  useEffect(() => {
    const cp = form.postalCode;
    if (cp?.length === 5) {
      const handleCPLookup = async () => {
        setLoadingCP(true);
        try {
          const addressData = await lookupPostalCode(cp);
          if (addressData) {
            setColonies(addressData.colonies);
            setForm(prev => ({
              ...prev,
              city: addressData.city,
              state: findStateValue(MEXICAN_STATES, addressData.stateName)
            }));
          }
        } catch (error) {
          console.error("Error al buscar CP:", error);
        } finally {
          setLoadingCP(false);
        }
      };
      handleCPLookup();
    } else {
      setColonies([]);
    }
  }, [form.postalCode]);

  useEffect(() => {
    setForm(mergedInitialValue);
    setAttachments(initialValue?.attachments ?? []);
    setFormError("");
    setErrors({});
  }, [initialValue, mergedInitialValue]);

  const formData = useMemo(
    () => ({ ...form, attachments }),
    [form, attachments]
  );

  const handleChange = (event) => {
    const { name, value } = event.target;

    // Validación numérica inmediata para CP
    if (name === "postalCode") {
      const onlyNums = value.replace(/[^0-9]/g, "");
      setForm((prev) => ({ ...prev, [name]: onlyNums }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
    if (formError) setFormError("");
  };

  const handleAttachmentChange = (event) => {
    const { files } = event.target;
    if (!files || !files.length || isReadOnly) return;
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

    if (hasErrors) return;

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
        <InputField label="Nombre" name="firstName" value={form.firstName} onChange={handleChange} required disabled={isReadOnly} error={errors.firstName} />
        <InputField label="Apellido" name="lastName" value={form.lastName} onChange={handleChange} required disabled={isReadOnly} error={errors.lastName} />
        <InputField label="CURP" name="curp" value={form.curp} onChange={handleChange} required disabled={isReadOnly} error={errors.curp} />
        <InputField label="Fecha de nacimiento" type="date" name="birthDate" value={form.birthDate} onChange={handleChange} required disabled={isReadOnly} error={errors.birthDate} />
        
        <Field label="Sexo" name="gender" required error={errors.gender}>
          {({ fieldId, describedBy }) => (
            <select id={fieldId} name="gender" className={`role-select${errors.gender ? " has-error" : ""}`} value={form.gender} onChange={handleChange} disabled={isReadOnly} aria-describedby={describedBy}>
              <option value="">Selecciona</option>
              {SEX_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          )}
        </Field>

        <InputField label="Teléfono" name="phone" value={form.phone} onChange={handleChange} required disabled={isReadOnly} error={errors.phone} />
        <InputField label="Correo electrónico" name="email" value={form.email} onChange={handleChange} required disabled={isReadOnly} error={errors.email} />

        {/* --- SECCIÓN DE DOMICILIO --- */}
        <InputField label="Código postal" name="postalCode" value={form.postalCode} onChange={handleChange} required maxLength={5} inputMode="numeric" disabled={isReadOnly || loadingCP} error={errors.postalCode} placeholder={loadingCP ? "Buscando..." : "12345"} />

        <Field label="Estado" name="state" required error={errors.state}>
          {({ fieldId, describedBy }) => (
            <select id={fieldId} name="state" className={`role-select${errors.state ? " has-error" : ""}`} value={form.state} onChange={handleChange} disabled={isReadOnly || loadingCP} aria-describedby={describedBy}>
              <option value="">Selecciona</option>
              {MEXICAN_STATES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          )}
        </Field>

        <InputField label="Ciudad o municipio" name="city" value={form.city} onChange={handleChange} required disabled={isReadOnly || loadingCP} error={errors.city} />

        <Field label="Colonia" name="neighborhood" required error={errors.neighborhood}>
          {({ fieldId, describedBy }) => (
            <select id={fieldId} name="neighborhood" className={`role-select${errors.neighborhood ? " has-error" : ""}`} value={form.neighborhood} onChange={handleChange} disabled={isReadOnly || colonies.length === 0} aria-describedby={describedBy}>
              <option value="">{colonies.length > 0 ? "Selecciona colonia" : "Ingresa un CP"}</option>
              {colonies.map((col, idx) => <option key={`${col}-${idx}`} value={col}>{col}</option>)}
            </select>
          )}
        </Field>

        <div className="form-grid__full-width">
          <InputField label="Calle y número" name="street" value={form.street} onChange={handleChange} required disabled={isReadOnly} error={errors.street} placeholder="Av. Salud 123" />
        </div>

        {/* --- OTROS CAMPOS --- */}
        <InputField label="Referencia" name="referral" value={form.referral} onChange={handleChange} required disabled={isReadOnly} error={errors.referral} />
        <InputField label="Motivo de consulta" name="purpose" value={form.purpose} onChange={handleChange} required disabled={isReadOnly} error={errors.purpose} />
        <InputField label="Contacto de emergencia" name="emergencyName" value={form.emergencyName} onChange={handleChange} required disabled={isReadOnly} error={errors.emergencyName} />
        <InputField label="Teléfono de emergencia" name="emergencyPhone" value={form.emergencyPhone} onChange={handleChange} required disabled={isReadOnly} error={errors.emergencyPhone} />
      </div>

      {formError ? <p className="form-error" role="alert">{formError}</p> : null}

      

      <div className="form-actions">
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>}
        {!isReadOnly && <Button type="submit" loading={submitting}>Guardar paciente</Button>}
      </div>
    </form>
  );
}