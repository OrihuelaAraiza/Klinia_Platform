import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import Card, { CardBody, CardHeader } from "../components/UI/Card";
import Button from "../components/UI/Button";
import ButtonPrimary from "../components/ButtonPrimary";
import InputField from "../components/InputField";
import { useToast } from "../components/UI/Toast";
import { PRESCRIPTION_FIELDS, ROLES, ROUTES } from "../utils/constants";
import auditService from "../services/auditService";
import * as patientsService from "../services/patientsService";
import * as prescriptionsService from "../services/prescriptionsService";


const REQUIRED_FIELDS = new Set(["substance", "dose", "frequency", "duration"]);
const DEFAULT_PAGE_SIZE = 5; 


function buildInitialForm(patientId = "") {
  return PRESCRIPTION_FIELDS.reduce(
    (acc, field) => ({
      ...acc,
      [field.name]: "",
    }),
    { patientId }
  );
}

function calculateAge(birthDate) {
    if (!birthDate) return "—";
    const date = new Date(birthDate);
    if (Number.isNaN(date.getTime())) return "—";
    const diff = Date.now() - date.getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
}


export default function Prescriptions() {
  const { role, user } = useOutletContext() ?? {};
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialPatientId = searchParams.get("patientId")?.trim() || "";
    
  const [selectedPatientId, setSelectedPatientId] = useState(initialPatientId);
  const [patient, setPatient] = useState(null); 
  const [patientError, setPatientError] = useState("");
  const [patientLoading, setPatientLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [form, setForm] = useState(() => buildInitialForm(initialPatientId));
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [successRecord, setSuccessRecord] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);


  const isAssistant = role === ROLES.ASSISTANT;
  const isFormDisabled = isAssistant || !patient || Boolean(patientError);


  useEffect(() => {
    setForm(buildInitialForm(selectedPatientId));
    setSuccessRecord(null);
  }, [selectedPatientId]);

  useEffect(() => {
    if (!selectedPatientId) {
      setPatient(null);
      setPatientError("");
      return;
    }

    let active = true;
    setPatientLoading(true);
    setPatientError("");

    patientsService
      .getPatient(selectedPatientId)
      .then((response) => {
        if (!active) return;
        setPatient(response);
      })
      .catch((error) => {
        if (!active) return;
        const message =
          error?.status === 404
            ? "No encontramos el expediente solicitado. Selecciona otro paciente."
            : error?.message || "No pudimos cargar la información del paciente.";
        setPatientError(message);
        setPatient(null);
      })
      .finally(() => {
        if (active) {
          setPatientLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [selectedPatientId]);


  const handleSearch = async (event) => {
    event.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const response = await patientsService.listPatients({ q: searchQuery.trim(), page: 1, size: DEFAULT_PAGE_SIZE });
      const items = Array.isArray(response?.items) ? response.items : [];
      setSearchResults(items);
    } catch (error) {
      toast.error(error?.message || "No pudimos buscar pacientes.");
    } finally {
      setSearchLoading(false);
    }
  };

  const selectPatient = useCallback(
    (candidate) => {
      if (!candidate?.id) return;
      navigate(`${ROUTES.prescriptionsNew}?patientId=${candidate.id}`, { replace: false });
      setSelectedPatientId(candidate.id);
      setSearchResults([]);
    },
    [navigate]
  );

  const clearSelection = () => {
    navigate(ROUTES.prescriptions, { replace: true });
    setSelectedPatientId("");
    setPatient(null);
    setPatientError("");
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
    if (formError) {
      setFormError("");
    }
  };

  const validationErrors = useMemo(() => {
    const issues = {};
    if (!selectedPatientId) {
      issues.patientId = "Selecciona un paciente para continuar.";
    }
    REQUIRED_FIELDS.forEach((field) => {
      if (!String(form[field] || "").trim()) {
        issues[field] = "Campo requerido.";
      }
    });
    return issues;
  }, [form, selectedPatientId]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isFormDisabled) {
      setFormError("Este perfil es de solo lectura. Solicita a un profesional que emita la prescripción.");
      return;
    }

    const issues = validationErrors;
    setErrors(issues);
    if (Object.keys(issues).length > 0) {
      setFormError("Revisa los campos obligatorios marcados en rojo.");
      return;
    }

    setSubmitting(true);
    setFormError("");

    try {
      const payload = {
        ...form,
        patientRecordId: patient.id, 
        professional: {
          id: user?.id,
          name: user?.name || "Profesional Klinia",
          role: role || "PROFESSIONAL",
        },
      };
      const record = await prescriptionsService.create(payload);
      setSuccessRecord(record);
      toast.success(`Prescripción emitida (folio ${record.folio}).`);
    } catch (error) {
      const message = error?.message || "No pudimos registrar la prescripción.";
      setFormError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePdf = async () => {
    if (!successRecord || pdfLoading) {
      return;
    }
    setPdfLoading(true);
    try {
      
      await auditService.logAudit("prescription_pdf_generated", { /* ... */ });
    } catch (error) {
      toast.error(error?.message || "No pudimos generar el PDF.");
    } finally {
      setPdfLoading(false);
    }
  };

  const handleViewExpediente = () => {
    if (!successRecord?.patientId) return;
    navigate(`/patients/${successRecord.patientId}#prescripciones`);
  };


  return (
    <section className="page stack-5">
      <header className="page__header stack-1">
        <h1>Prescripciones</h1>
        <p className="helper-text">
          Emite recetas electrónicas con trazabilidad NOM-004 y NOM-024.
        </p>
      </header>

      {!selectedPatientId ? (
        <Card hoverable={false}>
          <CardHeader>
            <h2>Selecciona un paciente</h2>
          </CardHeader>
          <CardBody className="stack-3">
            <form className="form-inline" onSubmit={handleSearch}>
              <InputField
                label="Buscar por nombre, CURP o correo"
                name="patient-search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Ej. Carmen Pérez"
                autoComplete="off"
              />
              <ButtonPrimary type="submit" loading={searchLoading}>
                Buscar
              </ButtonPrimary>
            </form>
            {searchResults.length ? (
              <ul className="list list--card">
                {searchResults.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="link link--button"
                      onClick={() => selectPatient(item)}
                    >
                      <span>
                        {item.firstName} {item.lastName}
                      </span>
                      <small>{item.curp}</small>
                    </button>
                  </li>
                ))}
              </ul>
            ) : searchQuery ? (
              <p className="helper-text">No encontramos coincidencias.</p>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      {selectedPatientId ? (
        <Card hoverable={false} id="prescripcion-paciente">
          <CardHeader className="cluster justify-between">
            <div>
              <h2>Paciente seleccionado</h2>
              <p className="helper-text">Revisa los datos antes de emitir la receta.</p>
            </div>
            <Button variant="ghost" onClick={clearSelection}>
              Cambiar paciente
            </Button>
          </CardHeader>
          <CardBody className="stack-2">
            {patientLoading ? (
              <p>Cargando expediente…</p>
            ) : patientError ? (
              <p className="form-error" role="alert">
                {patientError}
              </p>
            ) : patient ? (
              <>
                <p>
                  <strong>Nombre:</strong> {patient.firstName} {patient.lastName}
                </p>
                <p>
                  <strong>CURP:</strong> {patient.curp}
                </p>
                <p>
                  <strong>Edad:</strong> {calculateAge(patient.birthDate)}
                </p>
                <p>
                  <strong>Teléfono:</strong> {patient.phone}
                </p>
              </>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      {selectedPatientId ? (
        <form className="form-grid" onSubmit={handleSubmit} noValidate>
          <InputField
            label="ID del paciente"
            name="patientId"
            value={selectedPatientId}
            readOnly
            disabled
          />
          {PRESCRIPTION_FIELDS.map((field) => (
            <InputField
              key={field.name}
              label={field.label}
              name={field.name}
              value={form[field.name]}
              onChange={handleChange}
              placeholder=""
              required={REQUIRED_FIELDS.has(field.name)}
              autoComplete="off"
              disabled={isFormDisabled || submitting}
              error={errors[field.name]}
            />
          ))}

          {formError ? (
            <p className="form-error" role="alert">
              {formError}
            </p>
          ) : null}

          <div className="form-grid__actions">
            <ButtonPrimary
              type="submit"
              disabled={isFormDisabled}
              loading={submitting}
              fullWidth
            >
              Registrar emisión
            </ButtonPrimary>
          </div>
        </form>
      ) : null}

      {isAssistant ? (
        <div className="empty-state empty-state--inline">
          <p>
            Perfil asistente: consulta el estado de las recetas pero no puedes emitir ni suspender prescripciones.
          </p>
        </div>
      ) : null}

      {successRecord ? (
        <Card hoverable={false} className="stack-2">
          <CardHeader className="cluster justify-between">
            <div>
              <h2>Prescripción registrada</h2>
              <p className="helper-text">Folio {successRecord.folio}</p>
            </div>
            <Button variant="ghost" onClick={() => navigate(`/prescriptions/${successRecord.id}`)}>
              Ver detalle
            </Button>
          </CardHeader>
          <CardBody className="cluster gap-2 wrap">
            <ButtonPrimary variant="secondary" onClick={handlePdf} loading={pdfLoading}>
              Ver PDF
            </ButtonPrimary>
            <ButtonPrimary onClick={handleViewExpediente}>
              Ver en expediente
            </ButtonPrimary>
          </CardBody>
        </Card>
      ) : null}
    </section>
  );
}