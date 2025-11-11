import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Stepper from "../components/UI/Stepper";
import StepAccess from "../components/register/StepAccess";
import StepIdentity from "../components/register/StepIdentity";
import StepAddress from "../components/register/StepAddress";
import StepContact from "../components/register/StepContact";
import StepDocs from "../components/register/StepDocs";
import StepFace from "../components/register/StepFace";
import ButtonPrimary from "../components/ButtonPrimary";
import auditService from "../services/auditService";
import registerService from "../services/registerService";
import storage from "../services/storage";
import { ROLES, ROUTES } from "../utils/constants";
import {
  isAdult,
  isValidCURP,
  isValidDateYYYYMMDD,
  isValidEmail,
  isValidMXPhone,
  isValidPassword,
  isValidPostalCode,
  minLength,
  required,
} from "../utils/validators";
import { useToast } from "../components/UI/Toast";
import logo from "../assets/logo-romi.svg";

const DRAFT_STORAGE_KEY = "klinia.register.draft";
const REGISTER_ASIDE_IMAGE = null;

const STEP_FLOW = [
  { id: "access", label: "Acceso", component: StepAccess },
  { id: "identity", label: "Identidad", component: StepIdentity },
  { id: "address", label: "Domicilio", component: StepAddress },
  { id: "contact", label: "Contacto", component: StepContact },
  { id: "documents", label: "Documentacion", component: StepDocs },
  { id: "face", label: "Verificacion facial", component: StepFace },
];

function resolveDestination(role) {
  switch (role) {
    case ROLES.ADMIN:
      return ROUTES.dashboard;
    case ROLES.PROFESSIONAL:
    case ROLES.ASSISTANT:
      return ROUTES.patients;
    default:
      return ROUTES.dashboard;
  }
}


function createInitialForm() {
  return {
    access: {
      email: "",
      password: "",
      confirmPassword: "",
    },
    identity: {
      firstName: "",
      lastName: "",
      curp: "",
      certificateFolio: "",
      birthDate: "",
    },
    address: {
      street: "",
      neighborhood: "",
      postalCode: "",
      city: "",
      state: "",
    },
    contact: {
      phone: "",
      emergencyName: "",
      emergencyPhone: "",
      phoneIsVerified: false,
    },
    documents: {
      idOrPassport: null,
      professionalLicense: null,
      curpDocument: null,
      proofOfAddress: null,
    },
    face: {
      selfieFileId: "",
      preview: "",
      score: null,
    },
  };
}

function createEmptyErrors() {
  return {
    access: {},
    identity: {},
    address: {},
    contact: {},
    documents: {},
    face: {},
  };
}

function sanitize(value) {
  return String(value ?? "").trim();
}

function sanitizeEmail(value) {
  return sanitize(value).toLowerCase();
}

function sanitizeUpper(value) {
  return sanitize(value).toUpperCase();
}

function mergeDraft(base, draft) {
  if (!draft || typeof draft !== "object") {
    return base;
  }

  return {
    ...base,
    access: {
      ...base.access,
      email: draft.access?.email ?? base.access.email ?? "",
      password: "",
      confirmPassword: "",
    },
    identity: {
      ...base.identity,
      ...draft.identity,
    },
    address: {
      ...base.address,
      ...draft.address,
    },
    contact: {
      ...base.contact,
      ...draft.contact,
    },
    documents: {
      ...base.documents,
      ...draft.documents,
    },
    face: {
      selfieFileId: draft.face?.selfieFileId || "",
      preview: "",
      score: draft.face?.score ?? null,
    },
  };
}

function validateAccess(data) {
  const errors = {};
  if (!isValidEmail(sanitizeEmail(data.email))) {
    errors.email = "Ingresa un correo electronico valido.";
  }
  if (!isValidPassword(data.password)) {
    errors.password =
      "La contraseña debe tener al menos 8 caracteres, con letras y numeros.";
  }
  if (!data.confirmPassword) {
    errors.confirmPassword = "Confirma tu contraseña.";
  } else if (data.password !== data.confirmPassword) {
    errors.confirmPassword = "Las contraseñas no coinciden.";
  }
  return errors;
}

function validateIdentity(data) {
  const errors = {};
  if (!minLength(data.firstName, 2)) {
    errors.firstName = "Ingresa tus nombres (minimo 2 caracteres).";
  }
  if (!minLength(data.lastName, 2)) {
    errors.lastName = "Ingresa tus apellidos (minimo 2 caracteres).";
  }
  if (!isValidCURP(data.curp)) {
    errors.curp = "CURP invalido.";
  }
  if (!minLength(data.certificateFolio, 7)) {
    errors.certificateFolio = "Ingresa un folio válido (mín. 7 o 36 caracteres).";
  }
  if (!isValidDateYYYYMMDD(data.birthDate)) {
    errors.birthDate = "Selecciona una fecha valida.";
  } else if (!isAdult(data.birthDate, 18)) {
    errors.birthDate = "Debes ser mayor de 18 años.";
  }
  return errors;
}

function validateAddress(data) {
  const errors = {};
  if (!required(data.street)) {
    errors.street = "Ingresa tu calle y numero.";
  }
  if (!required(data.neighborhood)) {
    errors.neighborhood = "Ingresa tu colonia.";
  }
  if (!isValidPostalCode(data.postalCode)) {
    errors.postalCode = "Codigo postal invalido (5 digitos).";
  }
  if (!required(data.city)) {
    errors.city = "Ingresa tu ciudad o municipio.";
  }
  if (!required(data.state)) {
    errors.state = "Selecciona un estado.";
  }
  return errors;
}

function validateContact(data) {
  const errors = {};
  if (!isValidMXPhone(data.phone)) {
    errors.phone = "Ingresa un telefono movil de 10 digitos.";
  }
  if (!data.phoneIsVerified) {
    errors.phone = "Debes verificar tu número de teléfono.";
  }
  if (!minLength(data.emergencyName, 2)) {
    errors.emergencyName = "Ingresa el nombre de tu contacto de emergencia.";
  }
  if (!isValidMXPhone(data.emergencyPhone)) {
    errors.emergencyPhone = "Ingresa un telefono de emergencia de 10 digitos.";
  }
  return errors;
}

function validateDocuments(documents) {
  const errors = {};
  if (!documents.idOrPassport?.fileId) {
    errors.idOrPassport = "Sube tu identificacion oficial.";
  }
  if (!documents.professionalLicense?.fileId) {
    errors.professionalLicense = "Sube tu cedula profesional.";
  }
  if (!documents.proofOfAddress?.fileId) {
    errors.proofOfAddress = "Sube tu comprobante de domicilio.";
  }
  return errors;
}

function validateFace(face) {
  const errors = {};
  if (!face.selfieFileId) {
    errors.selfieFileId = "Completa la verificacion facial.";
  }
  return errors;
}

function validateStep(stepId, form) {
  switch (stepId) {
    case "access":
      return validateAccess(form.access);
    case "identity":
      return validateIdentity(form.identity);
    case "address":
      return validateAddress(form.address);
    case "contact":
      return validateContact(form.contact);
    case "documents":
      return validateDocuments(form.documents);
    case "face":
      return validateFace(form.face);
    default:
      return {};
  }
}

function buildPayload(form) {
  return {
    access: {
      email: sanitizeEmail(form.access.email),
      password: form.access.password,
    },
    identity: {
      firstName: sanitize(form.identity.firstName),
      lastName: sanitize(form.identity.lastName),
      curp: sanitizeUpper(form.identity.curp),
      certificateFolio: sanitize(form.identity.certificateFolio),
      birthDate: form.identity.birthDate,
    },
    address: {
      street: sanitize(form.address.street),
      neighborhood: sanitize(form.address.neighborhood),
      postalCode: sanitize(form.address.postalCode),
      city: sanitize(form.address.city),
      state: form.address.state,
    },
    contact: {
      phone: sanitize(form.contact.phone),
      emergencyName: sanitize(form.contact.emergencyName),
      emergencyPhone: sanitize(form.contact.emergencyPhone),
    },
    documents: {
      idOrPassportFileId: form.documents.idOrPassport?.fileId,
      professionalLicenseFileId:
        form.documents.professionalLicense?.fileId,
      curpDocumentFileId:
        form.documents.curpDocument?.fileId, 
      proofOfAddressFileId: form.documents.proofOfAddress?.fileId,
    },
    face: {
      selfieFileId: form.face.selfieFileId,
    },
  };
}

function buildDraft(form, currentStep) {
  return {
    access: {
      email: form.access.email,
    },
    identity: { ...form.identity },
    address: { ...form.address },
    contact: { ...form.contact },
    documents: { ...form.documents },
    face: {
      selfieFileId: form.face.selfieFileId,
      score: form.face.score ?? null,
    },
    currentStep,
  };
}

function clearDraftStorage() {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(DRAFT_STORAGE_KEY);
}

export default function Register() {
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(() => createInitialForm());
  const [errors, setErrors] = useState(() => createEmptyErrors());
  const [currentStep, setCurrentStep] = useState(0);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [stepBusy, setStepBusy] = useState({});

  const activeStep = STEP_FLOW[currentStep];
  const ActiveComponent = activeStep.component;

  const stepSummaries = useMemo(
    () =>
      STEP_FLOW.map((step) => {
        const stepErrors = validateStep(step.id, form);
        return {
          id: step.id,
          label: step.label,
          complete: Object.keys(stepErrors).length === 0,
        };
      }),
    [form]
  );

  const stepperSteps = useMemo(
    () =>
      stepSummaries.map((step, index) => ({
        id: step.id,
        label: step.label,
        status:
          index === currentStep
            ? "current"
            : step.complete
            ? "completed"
            : "pending",
      })),
    [currentStep, stepSummaries]
  );

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === STEP_FLOW.length - 1;
  const isBusy =
    submitting || Object.values(stepBusy).some((value) => Boolean(value));

  useEffect(() => {
    const token = storage.getToken();
    const role = storage.getRole();
    if (token && role) {
      navigate(resolveDestination(role), { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const saved = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!saved) {
      return;
    }
    try {
      const parsed = JSON.parse(saved);
      setForm((prev) => mergeDraft(prev, parsed));
      if (Number.isInteger(parsed.currentStep)) {
        const nextStep = Math.min(
          Math.max(parsed.currentStep, 0),
          STEP_FLOW.length - 1
        );
        setCurrentStep(nextStep);
      }
    } catch (error) {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const draft = buildDraft(form, currentStep);
      window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch (error) {
      if (import.meta.env?.DEV) {
        console.debug("[register] draft skipped", error);
      }
    }
  }, [form, currentStep]);

  const handleFieldChange = (stepId) => (name, value) => {
    setForm((prev) => ({
      ...prev,
      [stepId]: {
        ...prev[stepId],
        [name]: value,
      },
    }));
    setErrors((prev) => {
      const stepErrors = prev[stepId] || {};
      if (!stepErrors[name]) {
        return prev;
      }
      return {
        ...prev,
        [stepId]: {
          ...stepErrors,
          [name]: "",
        },
      };
    });
    if (formError) {
      setFormError("");
    }
  };

  const handleDocumentChange = (key, value) => {
    setForm((prev) => ({
      ...prev,
      documents: {
        ...prev.documents,
        [key]: value,
      },
    }));
    setErrors((prev) => {
      const docErrors = prev.documents || {};
      if (!docErrors[key]) {
        return prev;
      }
      return {
        ...prev,
        documents: {
          ...docErrors,
          [key]: "",
        },
      };
    });
    if (formError) {
      setFormError("");
    }
  };

 const handleStepDataChange = (stepId) => (payload) => {
    setForm((prev) => ({
      ...prev,
      [stepId]: {
        ...prev[stepId],
        ...payload,
      },
    }));
    if (stepId === 'face' && payload?.selfieFileId) {
      setErrors((prev) => {
        const faceErrors = prev.face || {};
        if (!faceErrors.selfieFileId) return prev;
        return {
          ...prev,
          face: { ...faceErrors, selfieFileId: "" },
        };
      });
    }
    if (stepId === 'contact' && payload?.phoneIsVerified) {
       setErrors((prev) => {
        const contactErrors = prev.contact || {};
        if (!contactErrors.phone) return prev;
        return {
          ...prev,
          contact: { ...contactErrors, phone: "" },
        };
      });
    }
    if (formError) {
      setFormError("");
    }
  };
  const handleBusyChange = (stepId) => (busy) => {
    setStepBusy((prev) => {
      const next = Boolean(busy);
      if (prev[stepId] === next) {
        return prev;
      }
      return {
        ...prev,
        [stepId]: next,
      };
    });
  };

  const moveToStep = (index) => {
    setCurrentStep(() => Math.min(Math.max(index, 0), STEP_FLOW.length - 1));
  };

  const submitRegistration = async () => {
    const aggregated = {};
    let firstInvalidIndex = null;

    STEP_FLOW.forEach((step, index) => {
      const stepErrors = validateStep(step.id, form);
      aggregated[step.id] = stepErrors;
      if (firstInvalidIndex === null && Object.keys(stepErrors).length > 0) {
        firstInvalidIndex = index;
      }
    });

    setErrors(aggregated);

    if (firstInvalidIndex !== null) {
      moveToStep(firstInvalidIndex);
      return;
    }

    setSubmitting(true);
    setFormError("");

    const payload = buildPayload(form);

    try {
      const response = await registerService.complete(payload);

      try {
        await auditService.logAudit(
          "auth_register_success",
          {
            role: ROLES.PROFESSIONAL,
            email: payload.access.email,
            userId: response?.userId,
          },
          { auth: false }
        );
      } catch (auditError) {
        if (import.meta.env?.DEV) {
          console.debug("[register] audit success error", auditError);
        }
      }

      clearDraftStorage();
      toast.success("Registro completado. Ahora puedes iniciar sesion.");
      navigate(ROUTES.login, { replace: true });
    } catch (error) {
      const message =
        error?.message ||
        "No pudimos completar el registro. Intenta nuevamente.";
      setFormError(message);
      toast.error(message);

      try {
        await auditService.logAudit(
          "auth_register_failed",
          {
            role: ROLES.PROFESSIONAL,
            email: payload.access.email,
            code: error?.status || error?.code,
            message,
          },
          { auth: false }
        );
      } catch (auditError) {
        if (import.meta.env?.DEV) {
          console.debug("[register] audit fail error", auditError);
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = async () => {
    const stepErrors = validateStep(activeStep.id, form);
    setErrors((prev) => ({
      ...prev,
      [activeStep.id]: stepErrors,
    }));
    if (Object.keys(stepErrors).length > 0) {
      return;
    }

    if (isLastStep) {
      await submitRegistration();
      return;
    }

    moveToStep(currentStep + 1);
  };

  const handlePrevious = () => {
    if (isFirstStep) {
      return;
    }
    moveToStep(currentStep - 1);
  };

  let stepProps = {};
  if (activeStep.id === "documents") {
    stepProps = {
      documents: form.documents,
      errors: errors.documents || {},
      onDocumentChange: handleDocumentChange,
      onBusyChange: handleBusyChange("documents"),
      disabled: submitting,
    };
  } else if (activeStep.id === "face") {
    stepProps = {
      data: form.face,
      errors: errors.face || {},
      onChange: handleStepDataChange('face'),
      onBusyChange: handleBusyChange("face"),
      disabled: submitting,
    };
    } else if (activeStep.id === "contact") { // <-- ¡NUEVO BLOQUE!
    stepProps = {
      data: form.contact,
      errors: errors.contact || {},
      onChange: handleStepDataChange('contact'), // <-- Usa el handler genérico
      onBusyChange: handleBusyChange("contact"),
      disabled: submitting,
    };
     } else {
    stepProps = {
      data: form[activeStep.id],
      errors: errors[activeStep.id] || {},
      onChange: handleFieldChange(activeStep.id),
      disabled: submitting,
    };
  }

  return (
    <div className="register-page">
      <section className="register-main">
        <header className="register-header">
          <img src={logo} alt="ROMI Klinia" className="register-logo" />
          <div className="register-heading">
            <h1>Registro profesional</h1>
            <p>
              Completa los pasos para habilitar tu acceso como profesional de
              la salud en Klinia.
            </p>
          </div>
        </header>

        <Stepper steps={stepperSteps} />

        <section
          className="register-card"
          aria-busy={isBusy || undefined}
        >
          <ActiveComponent key={activeStep.id} {...stepProps} />
        </section>

        <div className="register-actions">
          <ButtonPrimary
            type="button"
            variant="ghost"
            onClick={handlePrevious}
            disabled={isFirstStep || isBusy}
          >
            Anterior
          </ButtonPrimary>
          <ButtonPrimary
            type="button"
            onClick={handleNext}
            disabled={isBusy}
            loading={isLastStep && submitting}
          >
            {isLastStep ? (submitting ? "Enviando…" : "Enviar registro") : "Guardar y continuar"}
          </ButtonPrimary>
        </div>

        {formError ? (
          <p className="register-error" role="alert">
            {formError}
          </p>
        ) : null}

        <p className="register-login">
          ¿Ya tienes cuenta?{" "}
          <Link className="link" to={ROUTES.login}>
            Inicia sesion
          </Link>
        </p>
      </section>

      <aside className="register-aside">
        <div className="register-summary">
          <h2>Tu progreso</h2>
          <ul className="register-summary__list">
            {stepSummaries.map((step, index) => {
              const status = step.complete
                ? "Completo"
                : index === currentStep
                ? "En progreso"
                : "Pendiente";
              return (
                <li key={step.id} className="register-summary__item">
                  <span
                    className={`register-summary__icon${
                      step.complete ? " is-complete" : ""
                    }`}
                    aria-hidden="true"
                  >
                    {step.complete ? "✓" : index + 1}
                  </span>
                  <div className="register-summary__meta">
                    <span className="register-summary__label">
                      {step.label}
                    </span>
                    <span className="register-summary__status">{status}</span>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="register-summary__hint">
            La informacion se guarda automaticamente. Puedes regresar y
            ajustar cada paso antes de enviar tu registro.
          </p>
        </div>
        {REGISTER_ASIDE_IMAGE ? (
          <div className="register-aside__image" aria-hidden="true">
            <img src={REGISTER_ASIDE_IMAGE} alt="" />
          </div>
        ) : null}
      </aside>
    </div>
  );
}
