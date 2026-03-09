import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Stepper from "../components/UI/Stepper";
import StepAccess from "../components/register/StepAccess";
import StepIdentity from "../components/register/StepIdentityPatient";
import StepExtendedIdentity from "../components/register/StepExtendedIdentity"; 
import StepContact from "../components/register/StepContact";
import StepPatientSource from "../components/register/StepPatientSource"; 
import ButtonPrimary from "../components/ButtonPrimary";
import { useToast } from "../components/UI/Toast";
import Logo from "../components/Brand/Logo";
import { ROUTES } from "../utils/constants";
import apiClient from "../services/apiClient";
import { isValidEmail, isValidPassword, minLength, required, isValidMXPhone, isValidCURP } from "../utils/validators";
import StepAddress from "../components/register/StepAddressPAT";

// --- CONSTANTES ---
const STEP_FLOW = [
  { id: "access", label: "Cuenta y Acceso", component: StepAccess },
  { id: "identity", label: "Identidad", component: StepIdentity },
  { id: "extended", label: "Información Adicional", component: StepExtendedIdentity },
  { id: "address", label: "Dirección", component: StepAddress }, // Nuevo paso
  { id: "source", label: "Motivo y Fuente", component: StepPatientSource }, 
  { id: "contact", label: "Contacto", component: StepContact },
];

function createInitialForm() {
  return {
    access: { email: "", password: "", confirmPassword: "" },
    identity: { firstName: "", lastName: "", curp: "", birthDate: "", gender: "" },
    extended: { rfc: "", homePhone: "", workPhone: "", emergencyRelation: "", legalGuardianName: "", legalGuardianRelation: "", legalGuardianPhone: "" },
    address: { street: "", postalCode: "", neighborhood: "", city: "", state: "" }, // Inicializar
    source: { referral: "", purpose: "" }, 
    contact: { phone: "", emergencyName: "", emergencyPhone: "", phoneIsVerified: false, emergencyPhoneIsVerified: false },
  };
}



// --- FUNCIONES DE VALIDACIÓN (SÓLO UNA VEZ DEFINIDAS) ---

function validateAccess(data) {
  const errors = {};
  if (!isValidEmail(data.email)) { errors.email = "Correo inválido."; }
  if (!isValidPassword(data.password)) { errors.password = "Contraseña debe tener al menos 8 caracteres."; }
  if (data.password !== data.confirmPassword) { errors.confirmPassword = "Las contraseñas no coinciden."; }
  return errors;
}

function validateAddress(data) {
  const errors = {};
  if (!required(data.street)) errors.street = "La calle es requerida.";
  if (!/^\d{5}$/.test(data.postalCode)) errors.postalCode = "CP debe ser de 5 dígitos.";
  if (!required(data.neighborhood)) errors.neighborhood = "La colonia es requerida.";
  if (!required(data.city)) errors.city = "La ciudad es requerida.";
  if (!required(data.state)) errors.state = "El estado es requerido.";
  return errors;
}

function validateIdentity(data) {
  const errors = {};
  if (!minLength(data.firstName, 2)) { errors.firstName = "Nombre muy corto."; }
  if (!minLength(data.lastName, 2)) { errors.lastName = "Apellido muy corto."; }
  if (data.curp && data.curp.length && !isValidCURP(data.curp)) { errors.curp = "CURP inválido."; }
  if (!data.gender) { errors.gender = "El género es requerido."; }
  if (!data.birthDate) { errors.birthDate = "La fecha de nacimiento es requerida."; }
  return errors;
}

function validateExtended(data, fullForm) {
  const errors = {};
  const birthDate = fullForm.identity.birthDate;
  
  let isMinor = false;
  if (birthDate) {
    const birth = new Date(birthDate);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
    isMinor = age < 18;
  }

  if (isMinor) {
    if (!required(data.legalGuardianName)) errors.legalGuardianName = "Nombre del tutor requerido.";
    if (!required(data.legalGuardianRelation)) errors.legalGuardianRelation = "Parentesco requerido.";
    if (!isValidMXPhone(data.legalGuardianPhone)) errors.legalGuardianPhone = "Teléfono del tutor inválido.";
  }

  if (data.rfc && data.rfc.length > 0 && data.rfc.length < 12) {
    errors.rfc = "RFC inválido (12-13 caracteres).";
  }
  
  return errors;
}

function validateSource(data) { 
    const errors = {};
    if (!data.referral) { errors.referral = "Debes seleccionar una opción."; }
    if (!minLength(data.purpose, 10)) { errors.purpose = "El motivo debe tener al menos 10 caracteres."; }
    return errors;
}

function validateContact(data) {
  const errors = {};
  if (!isValidMXPhone(data.phone)) { errors.phone = "Teléfono inválido."; }
  if (!data.phoneIsVerified) { errors.phone = "Debes verificar tu teléfono."; }
  if (data.emergencyPhone && !isValidMXPhone(data.emergencyPhone)) {
    errors.emergencyPhone = "Teléfono de emergencia inválido.";
  }
  return errors;
}

function validateStep(stepId, form) {
    switch (stepId) {
        case "access": return validateAccess(form.access);
        case "identity": return validateIdentity(form.identity);
        case "extended": return validateExtended(form.extended, form);
        case "address": return validateAddress(form.address);
        case "source": return validateSource(form.source);
        case "contact": return validateContact(form.contact);
        default: return {};
    }
}

function buildPayload(form) {
  return {
    // 1. Objeto de Acceso
    access: {
      email: form.access.email.toLowerCase(),
      password: form.access.password,
      confirmPassword: form.access.confirmPassword,
    },

    // 2. Objeto de Identidad
    identity: {
      firstName: form.identity.firstName,
      lastName: form.identity.lastName,
      curp: form.identity.curp?.toUpperCase() || null,
      birthDate: form.identity.birthDate,
      gender: form.identity.gender,
      nationality: "Mexicana",
      // Campos que Prisma tiene como opcionales pero pertenecen a identidad
      rfc: form.extended.rfc || null,
      legalGuardianName: form.extended.legalGuardianName || null,
      legalGuardianRelation: form.extended.legalGuardianRelation || null,
      legalGuardianPhone: form.extended.legalGuardianPhone || null,
    },

    // 3. Objeto de Dirección
    address: {
      street: form.address.street || null,
      postalCode: form.address.postalCode || null,
      neighborhood: form.address.neighborhood || null,
      state: form.address.state || null,
      municipality: form.address.city || null, // Mapeado a 'municipality' de tu Prisma
    },

    // 4. Objeto de Contacto
    contact: {
      phone: form.contact.phone,
      homePhone: form.extended.homePhone || null,
      workPhone: form.extended.workPhone || null,
      emergencyName: form.contact.emergencyName,
      emergencyPhone: form.contact.emergencyPhone,
      emergencyRelation: form.extended.emergencyRelation || null,
      phoneIsVerified: !!form.contact.phoneIsVerified,
      emergencyPhoneIsVerified: !!form.contact.emergencyPhoneIsVerified,
    },

    // 5. Objeto de Origen (Aquí va el ID que mencionas)
    source: {
      referral: form.source.referral,
      purpose: form.source.purpose,
      professionalInChargeId: form.source.professionalInChargeId || "U_91ztvm1k", 
    }
  };
}

// --- COMPONENTE PRINCIPAL ---
export default function PatientRegister() {
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(createInitialForm);
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");

  const activeStep = STEP_FLOW[currentStep];
  const ActiveComponent = activeStep.component;

  const handleFieldChange = (name, value) => {
    setForm(prev => ({
        ...prev,
        [activeStep.id]: { ...prev[activeStep.id], [name]: value }
    }));
    setErrors(prev => ({...prev, [activeStep.id]: { ...prev[activeStep.id], [name]: "" }}));
    setFormError("");
  };

  const handleNext = () => {
    const stepErrors = validateStep(activeStep.id, form);
    setErrors(prev => ({...prev, [activeStep.id]: stepErrors}));

    if (Object.keys(stepErrors).length > 0) {
        return;
    }

    if (currentStep < STEP_FLOW.length - 1) {
        setCurrentStep(prev => prev + 1);
    } else {
        submitRegistration();
    }
  };

const submitRegistration = async () => {
    setSubmitting(true);
    setFormError("");
    const payload = buildPayload(form);
    
    try {
        await apiClient.post('/auth/register/patient', payload); 
        toast.success("Cuenta de paciente creada con éxito. Inicia sesión.");
        navigate(ROUTES.login, { replace: true });
    } catch (error) {
        let finalMessage = error.message;

        if (error.details && Array.isArray(error.details)) {
            const fieldLabels = {
                email: "Correo electrónico",
                password: "Contraseña",
                firstName: "Nombre",
                lastName: "Apellidos",
                curp: "CURP",
                birthDate: "Fecha de nacimiento",
                phone: "Teléfono",
                street: "Calle",
                neighborhood: "Colonia",
                city: "Ciudad/Municipio",
                state: "Estado",
                postalCode: "Código Postal",
                referral: "Referencia",
                purpose: "Motivo de consulta",
                legalGuardianName: "Nombre del tutor",
                legalGuardianPhone: "Teléfono del tutor"
            };

            const translateZod = (msg) => {
                if (msg.includes("at least")) return "es muy corto o incompleto";
                if (msg.includes("Required")) return "es obligatorio";
                if (msg.includes("Invalid")) return "tiene un formato inválido";
                return msg;
            };

            const detailedSummary = error.details
                .map(d => {
                    const field = d.path[d.path.length - 1];
                    const label = fieldLabels[field] || field;
                    return `${label} (${translateZod(d.message)})`;
                })
                .join(", ");
            
            finalMessage = `Revisa los siguientes datos: ${detailedSummary}`;
        }
        setFormError(finalMessage);
        toast.error(finalMessage);

        console.error("Error detallado del registro:", error.details || error);
        
    } finally {
        setSubmitting(false);
    }
  };

  const stepProps = {
    data: form[activeStep.id],
    errors: errors[activeStep.id] || {},
    onChange: handleFieldChange, 
    disabled: submitting,
    fullForm: form
  };

  if (activeStep.id === 'contact') {
      stepProps.onChange = (payload) => {
           setForm(prev => ({...prev, contact: { ...prev.contact, ...payload }}));
      };
  }

  return (
    <div className="register-page">
      <section className="register-main">
        <header className="register-header">
          <Logo variant="horizontal" size="lg" theme="auto" className="register-logo" />
          <div className="register-heading">
            <h1>Registro de Paciente</h1>
            <p>Completa tu información para generar tu expediente digital.</p>
          </div>
        </header>

        <Stepper steps={STEP_FLOW.map((s, i) => ({
            id: s.id, 
            label: s.label, 
            status: i === currentStep ? 'current' : i < currentStep ? 'completed' : 'pending'
        }))} />

        <section className="register-card">
          <ActiveComponent {...stepProps} />
        </section>

        <div className="register-actions">
          <ButtonPrimary 
            variant="ghost" 
            onClick={() => setCurrentStep(c => Math.max(0, c - 1))} 
            disabled={currentStep === 0 || submitting}
          >
            Anterior
          </ButtonPrimary>
          <ButtonPrimary onClick={handleNext} loading={submitting}>
            {currentStep === STEP_FLOW.length - 1 ? "Finalizar Registro" : "Siguiente"}
          </ButtonPrimary>
        </div>
        
        {formError && <p className="register-error" style={{color: 'red', marginTop: '1rem'}}>{formError}</p>}
        
        <p className="register-login">
           ¿Ya tienes cuenta? <Link className="link" to={ROUTES.login}>Inicia sesión</Link>
        </p>
      </section>
      
      <aside className="register-aside">
          <div className="register-summary">
              <h2>Seguridad</h2>
              <p>Tus datos clínicos están encriptados y protegidos bajo normas internacionales de privacidad.</p>
          </div>
      </aside>
    </div>
  );
}