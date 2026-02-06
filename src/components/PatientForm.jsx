import { useEffect, useMemo, useState } from "react";
import Button from "./UI/Button.jsx";
import InputField from "./InputField.jsx";
import Field from "./UI/Field.jsx";
import { lookupPostalCode, findStateValue } from "../utils/addressLookup.js";
import { 
  MEXICAN_STATES, 
  CIVIL_STATUS_OPTIONS, 
  RELIGION_OPTIONS, 
  EDUCATION_OPTIONS 
} from "../utils/constants.js";
import {
  isValidEmail,
  isValidPhone,
  isValidCURP,
  isValidDateYYYYMMDD,
  required,
} from "../utils/validators.js";

const DEFAULT_FORM = {
  firstName: "", lastName: "", curp: "", birthDate: "", gender: "", genderIdentity: "",
  phone: "", email: "", homePhone: "", workPhone: "",
  postalCode: "", state: "", city: "", neighborhood: "", street: "",
  nationality: "Mexicana", rfc: "", occupation: "", civilStatus: "", religion: "", education: "",
  referral: "", purpose: "",
  emergencyName: "", emergencyPhone: "", emergencyRelation: "",
  legalGuardianName: "", legalGuardianRelation: "", legalGuardianPhone: "",
};

const SEX_OPTIONS = [
  { value: "M", label: "Masculino" },
  { value: "F", label: "Femenino" },
  { value: "X", label: "No especificado" },
];

function validateForm({ form }) {
  const errors = {};
  
  // Lista de campos que NO pueden estar vacíos
  const requiredFields = [
    "firstName", "lastName", "birthDate", "gender", "phone", "email", 
    "postalCode", "state", "city", "neighborhood", "street",
    "referral", "purpose", "emergencyName", "emergencyPhone"
  ];

  requiredFields.forEach(field => {
    if (!required(form[field])) {
      errors[field] = "Este campo es obligatorio";
    }
  });

  if (form.curp && !isValidCURP(form.curp)) errors.curp = "CURP inválida";
  if (form.email && !isValidEmail(form.email)) errors.email = "Correo inválido";

  return errors;
}

export default function PatientForm({ initialValue, onSubmit, onCancel, readOnly = false }) {
  const mergedInitialValue = useMemo(() => ({ ...DEFAULT_FORM, ...initialValue }), [initialValue]);
  const [form, setForm] = useState(mergedInitialValue);
  const [colonies, setColonies] = useState([]);
  const [loadingCP, setLoadingCP] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const isReadOnly = Boolean(readOnly);

  useEffect(() => {
    if (form.postalCode?.length === 5) {
      const fetchCP = async () => {
        setLoadingCP(true);
        try {
          const data = await lookupPostalCode(form.postalCode);
          if (data) {
            setColonies(data.colonies);
            setForm(prev => ({ ...prev, city: data.city, state: findStateValue(MEXICAN_STATES, data.stateName) }));
          }
        } catch (e) { console.error(e); }
        finally { setLoadingCP(false); }
      };
      fetchCP();
    }
  }, [form.postalCode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    const validationErrors = validateForm({ form });
    
    if (Object.keys(validationErrors).length > 0) {
      console.error("❌ Errores de validación detectados:", validationErrors);
      setErrors(validationErrors);
      // Hacer scroll al primer error para que el usuario sepa qué pasó
      const firstErrorKey = Object.keys(validationErrors)[0];
      document.getElementsByName(firstErrorKey)[0]?.focus();
      return;
    }

    try {
      setSubmitting(true);
      console.log("🚀 Enviando formulario...", form);
      await onSubmit(form);
    } catch (err) {
      console.error("❌ Error en el envío:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="patient-form" onSubmit={handleSubmit} noValidate>
      <div className="stack-4">
        
        {/* SECCIÓN 1: Identidad */}
        <section className="form-section">
          <h4 className="form-section-title">Identidad Básica</h4>
          <div className="form-grid">
            <InputField label="Nombre(s)" name="firstName" value={form.firstName} onChange={handleChange} required disabled={isReadOnly} error={errors.firstName} />
            <InputField label="Apellido(s)" name="lastName" value={form.lastName} onChange={handleChange} required disabled={isReadOnly} error={errors.lastName} />
            <InputField label="CURP" name="curp" value={form.curp} onChange={handleChange} disabled={isReadOnly} error={errors.curp} />
            <InputField label="Fecha de Nacimiento" type="date" name="birthDate" value={form.birthDate} onChange={handleChange} required disabled={isReadOnly} error={errors.birthDate} />
            <Field label="Sexo" name="gender" required error={errors.gender}>
              {({ fieldId }) => (
                <select id={fieldId} name="gender" value={form.gender} onChange={handleChange} disabled={isReadOnly} className="role-select">
                  <option value="">Selecciona</option>
                  {SEX_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              )}
            </Field>
          </div>
        </section>

        {/* SECCIÓN 2: Información Adicional */}
        <section className="form-section">
          <h4 className="form-section-title">Información Adicional</h4>
          <div className="form-grid">
            <InputField label="RFC" name="rfc" value={form.rfc} onChange={handleChange} disabled={isReadOnly} />
            <InputField label="Ocupación" name="occupation" value={form.occupation} onChange={handleChange} disabled={isReadOnly} />
            <Field label="Estado Civil" name="civilStatus">
              {({ fieldId }) => (
                <select id={fieldId} name="civilStatus" value={form.civilStatus} onChange={handleChange} disabled={isReadOnly} className="role-select">
                  <option value="">Selecciona</option>
                  {CIVIL_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              )}
            </Field>
          </div>
        </section>

        {/* SECCIÓN 3: Domicilio */}
        <section className="form-section">
          <h4 className="form-section-title">Domicilio</h4>
          <div className="form-grid">
            <InputField label="CP" name="postalCode" value={form.postalCode} onChange={handleChange} required maxLength={5} disabled={isReadOnly} error={errors.postalCode} />
            <InputField label="Ciudad" name="city" value={form.city} onChange={handleChange} required disabled={isReadOnly} error={errors.city} />
            <Field label="Colonia" name="neighborhood" required error={errors.neighborhood}>
              {({ fieldId }) => (
                <select id={fieldId} name="neighborhood" value={form.neighborhood} onChange={handleChange} disabled={isReadOnly || colonies.length === 0} className="role-select">
                  <option value="">Selecciona</option>
                  {colonies.map((c, i) => <option key={i} value={c}>{c}</option>)}
                </select>
              )}
            </Field>
            <div className="form-grid__full-width">
              <InputField label="Calle y Número" name="street" value={form.street} onChange={handleChange} required disabled={isReadOnly} error={errors.street} />
            </div>
          </div>
        </section>

        {/* SECCIÓN 4: Contacto */}
        <section className="form-section">
          <h4 className="form-section-title">Contacto</h4>
          <div className="form-grid">
            <InputField label="Teléfono" name="phone" value={form.phone} onChange={handleChange} required disabled={isReadOnly} error={errors.phone} />
            <InputField label="Email" name="email" value={form.email} onChange={handleChange} required disabled={isReadOnly} error={errors.email} />
            <InputField label="Contacto Emergencia" name="emergencyName" value={form.emergencyName} onChange={handleChange} required disabled={isReadOnly} error={errors.emergencyName} />
            <InputField label="Teléfono Emergencia" name="emergencyPhone" value={form.emergencyPhone} onChange={handleChange} required disabled={isReadOnly} error={errors.emergencyPhone} />
          </div>
        </section>

        {/* SECCIÓN 5: Motivo */}
        <section className="form-section">
          <h4 className="form-section-title">Consulta</h4>
          <div className="form-grid">
            <InputField label="Referencia" name="referral" value={form.referral} onChange={handleChange} required disabled={isReadOnly} error={errors.referral} />
            <div className="form-grid__full-width">
              <InputField label="Motivo de Consulta" name="purpose" value={form.purpose} onChange={handleChange} required disabled={isReadOnly} error={errors.purpose} />
            </div>
          </div>
        </section>

      </div>

      <div className="form-actions" style={{ marginTop: '2rem' }}>
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>Cancelar</Button>}
        {!isReadOnly && <Button type="submit" loading={submitting}>Guardar Expediente</Button>}
      </div>
    </form>
  );
}