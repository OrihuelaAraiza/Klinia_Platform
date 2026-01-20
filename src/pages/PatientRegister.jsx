import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Stepper from "../components/UI/Stepper";
import StepAccess from "../components/register/StepAccess";
import StepIdentity from "../components/register/StepIdentityPatient";
import StepContact from "../components/register/StepContact";
import StepPatientSource from "../components/register/StepPatientSource"; 
import ButtonPrimary from "../components/ButtonPrimary";
import { useToast } from "../components/UI/Toast";
import Logo from "../components/Brand/Logo";
import { ROUTES } from "../utils/constants";
import apiClient from "../services/apiClient";
import { isValidEmail, isValidPassword, minLength, required, isValidMXPhone, isAdult, isValidCURP } from "../utils/validators";

const STEP_FLOW = [
  { id: "access", label: "Cuenta y Acceso", component: StepAccess },
  { id: "identity", label: "Datos Personales", component: StepIdentity },
  { id: "source", label: "Motivo y Fuente", component: StepPatientSource }, 
  { id: "contact", label: "Contacto", component: StepContact },
];

function createInitialForm() {
  return {
    access: { email: "", password: "", confirmPassword: "" },
    identity: { firstName: "", lastName: "", curp: "", birthDate: "", gender: "" },
    source: { referral: "", purpose: "" }, 
    contact: {
      phone: "",
      emergencyName: "",
      emergencyPhone: "",
      phoneIsVerified: false,
      emergencyPhoneIsVerified: false,
    },
  };
}

function validateAccess(data) {
  const errors = {};
  if (!isValidEmail(data.email)) { errors.email = "Correo inválido."; }
  if (!isValidPassword(data.password)) { errors.password = "Contraseña debe tener al menos 8 caracteres."; }
  if (data.password !== data.confirmPassword) { errors.confirmPassword = "Las contraseñas no coinciden."; }
  return errors;
}
function validateIdentity(data) {
  const errors = {};
  if (!minLength(data.firstName, 2)) { errors.firstName = "Nombre muy corto."; }
  if (!minLength(data.lastName, 2)) { errors.lastName = "Apellido muy corto."; }
  if (data.curp && data.curp.length && !isValidCURP(data.curp)) { errors.curp = "CURP inválido."; }
  if (!data.gender) { errors.gender = "El género es requerido."; }
  if (!isAdult(data.birthDate, 18)) { errors.birthDate = "Debes ser mayor de 18 años."; }
  return errors;
}
function validateSource(data) { 
    const errors = {};
    if (!data.referral) {
        errors.referral = "Debes seleccionar cómo nos encontraste.";
    }
    if (!minLength(data.purpose, 10)) {
        errors.purpose = "El motivo debe ser descriptivo (mín. 10 caracteres).";
    }
    return errors;
}
function validateContact(data) {
  const errors = {};
  const emergencyName = String(data.emergencyName || "").trim();
  const emergencyPhone = String(data.emergencyPhone || "").trim();

  if (!isValidMXPhone(data.phone)) {
    errors.phone = "Teléfono inválido (10 dígitos).";
  }
  if (!data.phoneIsVerified) {
    errors.phone = "Debes verificar tu teléfono.";
  }

  if (emergencyName && !minLength(emergencyName, 2)) {
    errors.emergencyName = "Nombre de contacto inválido.";
  }
  if (emergencyPhone && !isValidMXPhone(emergencyPhone)) {
    errors.emergencyPhone = "Teléfono de emergencia inválido.";
  }
  return errors;
}

function validateStep(stepId, form) {
    switch (stepId) {
        case "access": return validateAccess(form.access);
        case "identity": return validateIdentity(form.identity);
        case "source": return validateSource(form.source);
        case "contact": return validateContact(form.contact);
        default: return {};
    }
}
function buildPayload(form) {
    return {
        access: form.access,
        identity: form.identity,
        source: form.source, 
        contact: form.contact,
    };
}
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
        const message = error.response?.data?.message || "Error al crear la cuenta. Intenta de nuevo.";
        setFormError(message);
        toast.error(message);
    } finally {
        setSubmitting(false);
    }
  };


  let stepProps = {
    data: form[activeStep.id],
    errors: errors[activeStep.id] || {},
    onChange: handleFieldChange, 
    disabled: submitting
  };

  if (activeStep.id === 'contact') {
      stepProps.onChange = (payload) => {
           setForm(prev => ({...prev, contact: { ...prev.contact, ...payload }}));
      };
  }

  if (activeStep.id === 'source') {
      stepProps.data = form.source;
      stepProps.errors = errors.source || {};
  }


  return (
    <div className="register-page">
      <section className="register-main">
        <header className="register-header">
          <Logo
            variant="horizontal"
            size="lg"
            theme="auto"
            alt="BreveMente"
            className="register-logo"
          />
          <div className="register-heading">
            <h1>Registro de Paciente</h1>
            <p>Crea tu expediente digital para conectar con tus especialistas.</p>
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
          <ButtonPrimary variant="ghost" onClick={() => setCurrentStep(c => Math.max(0, c - 1))} disabled={currentStep === 0 || submitting}>
            Anterior
          </ButtonPrimary>
          <ButtonPrimary onClick={handleNext} loading={submitting}>
            {currentStep === STEP_FLOW.length - 1 ? "Finalizar Registro" : "Siguiente"}
          </ButtonPrimary>
        </div>
        
        {formError && <p className="register-error">{formError}</p>}
        
        <p className="register-login">
           ¿Ya tienes cuenta? <Link className="link" to={ROUTES.login}>Inicia sesión</Link>
        </p>
      </section>
      
      <aside className="register-aside">
          <div className="register-summary">
              <h2>Beneficios</h2>
              <ul className="list">
                  <li>Historial médico centralizado</li>
                  <li>Agenda citas fácilmente</li>
                  <li>Recetas digitales</li>
              </ul>
          </div>
      </aside>
    </div>
  );
}