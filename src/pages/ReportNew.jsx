import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { Link } from "react-router-dom";
import { Check, ChevronLeft, ChevronRight, Search, User, X, ArrowLeft, Lock } from "lucide-react";
import Card, { CardBody, CardHeader } from "../components/UI/Card";
import Button from "../components/UI/Button";
import Badge from "../components/UI/Badge";
import ButtonPrimary from "../components/ButtonPrimary";
import EmptyState from "../components/UI/EmptyState";
import { SkeletonList } from "../components/UI/Skeleton";
import { useToast } from "../components/UI/Toast";
import * as reportsService from "../services/reportsService";
import * as patientsService from "../services/patientsService";
import * as sessionsService from "../services/sessionsService";
import * as prescriptionsService from "../services/prescriptionsService";
import auditService from "../services/auditService";
import {
    TEMPLATE_PICKER_OPTIONS,
    getTemplate,
    TBE_TEMPLATE_ID,
    PSIQUIATRICO_TEMPLATE_ID,
} from "../config/clinicalSchemas/reports";
import {
    buildDefaultTbeData,
    validateTbeData,
} from "../config/clinicalSchemas/reports/tbe.schema";
import { buildDefaultPsiquiatricoData, validatePsiquiatricoData } from "../config/clinicalSchemas/reports/psiquiatrico.schema";
import { canUseTemplate } from "../utils/permissions";
import { SPECIALTY_LABELS } from "../utils/constants";

async function loadPatientContext(patientId) {
    const [sessionsRes, prescriptionsRes] = await Promise.allSettled([
        sessionsService.listSessionsByPatient(patientId, { size: 500 }),
        prescriptionsService.listByPatient(patientId),
    ]);
    const sessions = sessionsRes.status === "fulfilled"
        ? (Array.isArray(sessionsRes.value?.items) ? sessionsRes.value.items : sessionsRes.value)
        : [];
    const prescriptions = prescriptionsRes.status === "fulfilled" ? prescriptionsRes.value : [];
    return { sessions: sessions || [], prescriptions: prescriptions || [] };
}

function buildDefaultsForTemplate(templateId, ctx) {
    if (templateId === TBE_TEMPLATE_ID) return buildDefaultTbeData(ctx);
    if (templateId === PSIQUIATRICO_TEMPLATE_ID) return buildDefaultPsiquiatricoData(ctx);
    return {};
}

function validateDataForTemplate(templateId, data) {
    if (templateId === TBE_TEMPLATE_ID) return validateTbeData(data);
    if (templateId === PSIQUIATRICO_TEMPLATE_ID) return validatePsiquiatricoData(data);
    return {};
}

const STEPS = [
    { id: "template", label: "Tipo de reporte" },
    { id: "patient", label: "Paciente" },
    { id: "form", label: "Datos" },
    { id: "review", label: "Revisar y firmar" },
];

function ReadOnlyHint({ field, patientId }) {
    if (!field.readOnly) return null;
    if (field.lockedBy === "profile") {
        return (
            <p className="ui-field__lock-hint">
                <Lock size={11} aria-hidden="true" /> Tomado de tu perfil ·{" "}
                <Link to="/ProfileProfessional">Editar perfil</Link>
            </p>
        );
    }
    if (field.lockedBy === "patient") {
        return (
            <p className="ui-field__lock-hint">
                <Lock size={11} aria-hidden="true" /> Tomado del expediente del paciente
                {patientId ? (
                    <>
                        {" · "}
                        <Link to={`/patients/${patientId}`}>Editar ficha</Link>
                    </>
                ) : null}
            </p>
        );
    }
    return (
        <p className="ui-field__lock-hint">
            <Lock size={11} aria-hidden="true" /> Campo de solo lectura
        </p>
    );
}

function FieldRenderer({ field, value, onChange, error, disabled, patientId }) {
    const id = `tbe-${field.name}`;
    const isLocked = Boolean(field.readOnly);
    const baseProps = {
        id,
        name: field.name,
        value: value ?? "",
        onChange: (e) => onChange(field.name, e.target.value),
        disabled,
        readOnly: isLocked,
        className: `input-field__input${error ? " has-error" : ""}${isLocked ? " input-field__input--readonly" : ""}`,
        placeholder: field.placeholder,
        "aria-readonly": isLocked || undefined,
    };

    return (
        <div className={`stack-1${isLocked ? " ui-field--locked" : ""}`}>
            <label htmlFor={id} className="ui-field__label">
                {isLocked ? <Lock size={11} aria-hidden="true" style={{ marginRight: 4, verticalAlign: "text-bottom", opacity: 0.55 }} /> : null}
                {field.label} {field.required ? <span style={{ color: "var(--danger, #ef4444)" }}>*</span> : null}
            </label>
            {field.type === "textarea" ? (
                <textarea rows={field.rows || 3} {...baseProps} />
            ) : field.type === "select" ? (
                <select {...baseProps} disabled={disabled || isLocked}>
                    <option value="">Selecciona…</option>
                    {field.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            ) : field.type === "number" ? (
                <input type="number" min={field.min ?? 0} {...baseProps} />
            ) : field.type === "date" ? (
                <input type="date" {...baseProps} />
            ) : (
                <input type="text" {...baseProps} />
            )}
            <ReadOnlyHint field={field} patientId={patientId} />
            {error ? (
                <p className="ui-field__error" role="alert">{error}</p>
            ) : null}
        </div>
    );
}

export default function ReportNew() {
    const navigate = useNavigate();
    const location = useLocation();
    const toast = useToast();
    const { user } = useOutletContext() ?? {};

    const params = new URLSearchParams(location.search);
    const presetTemplate = params.get("template") || "";
    const presetPatientId = params.get("patientId") || "";

    const [stepIndex, setStepIndex] = useState(presetTemplate ? (presetPatientId ? 2 : 1) : 0);
    const [templateId, setTemplateId] = useState(presetTemplate || "");
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [data, setData] = useState({});
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    // Patient search
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);

    const template = useMemo(() => (templateId ? getTemplate(templateId) : null), [templateId]);

    const loadSearchResults = useCallback(async (query) => {
        setSearchLoading(true);
        try {
            const response = await patientsService.listPatients({ q: query, size: 30 });
            const list = Array.isArray(response?.items) ? response.items : response;
            setSearchResults(list || []);
        } catch (err) {
            toast.error(err?.message || "No pudimos cargar pacientes.");
            setSearchResults([]);
        } finally {
            setSearchLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        if (stepIndex !== 1) return undefined;
        const timer = setTimeout(() => loadSearchResults(searchQuery.trim()), 300);
        return () => clearTimeout(timer);
    }, [searchQuery, stepIndex, loadSearchResults]);

    // Pre-cargar paciente + su contexto clínico (sesiones y recetas) si viene por URL
    useEffect(() => {
        if (!presetPatientId) return;
        let active = true;
        (async () => {
            try {
                const patient = await patientsService.getPatient(presetPatientId);
                if (!active) return;
                setSelectedPatient(patient);
                if (templateId) {
                    const ctx = await loadPatientContext(presetPatientId);
                    if (!active) return;
                    setData(buildDefaultsForTemplate(templateId, { patient, professional: user, ...ctx }));
                }
            } catch (err) {
                toast.error(err?.message || "No pudimos cargar el paciente.");
            }
        })();
        return () => { active = false; };
    }, [presetPatientId, templateId, user, toast]);

    const handleSelectTemplate = (tplId) => {
        const tpl = TEMPLATE_PICKER_OPTIONS.find((t) => t.id === tplId);
        if (tpl && !canUseTemplate(user, tpl)) {
            const label = tpl.requiredSpecialty ? SPECIALTY_LABELS[tpl.requiredSpecialty] : "—";
            toast.error(`Esta plantilla está reservada para ${label}.`);
            return;
        }
        setTemplateId(tplId);
        setStepIndex(1);
    };

    const handleSelectPatient = async (patient) => {
        setSelectedPatient(patient);
        if (templateId) {
            try {
                const ctx = await loadPatientContext(patient.id);
                setData(buildDefaultsForTemplate(templateId, { patient, professional: user, ...ctx }));
            } catch {
                // Si falla la carga del contexto, al menos sembramos con los datos básicos
                setData(buildDefaultsForTemplate(templateId, { patient, professional: user }));
            }
        }
        setStepIndex(2);
    };

    const handleFieldChange = (name, value) => {
        setData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: "" }));
        }
    };

    const handleNext = () => {
        if (stepIndex === 2 && templateId) {
            const validationErrors = validateDataForTemplate(templateId, data);
            if (Object.keys(validationErrors).length) {
                setErrors(validationErrors);
                toast.error("Completa los campos obligatorios antes de continuar.");
                return;
            }
        }
        setStepIndex((s) => Math.min(s + 1, STEPS.length - 1));
    };

    const handleBack = () => {
        setStepIndex((s) => Math.max(s - 1, 0));
    };

    const persistReport = async (mode) => {
        const payload = {
            patientId: selectedPatient.id,
            template: templateId,
            data,
        };
        const report = await reportsService.create(payload);
        if (mode === "sign") {
            const signed = await reportsService.sign(report.id);
            auditService.logAudit("report_signed", { reportId: signed.id, folio: signed.folio });
            return signed;
        }
        auditService.logAudit("report_draft_created", { reportId: report.id, folio: report.folio });
        return report;
    };

    const handleSaveDraft = async () => {
        if (!selectedPatient) return;
        setSubmitting(true);
        try {
            const report = await persistReport("draft");
            toast.success(`Borrador guardado · Folio ${report.folio}`);
            navigate(`/reports/${report.id}`);
        } catch (err) {
            toast.error(err?.message || "No pudimos guardar el borrador.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleSignAndFinish = async () => {
        if (!selectedPatient) return;
        setSubmitting(true);
        try {
            const signed = await persistReport("sign");
            toast.success(`Reporte firmado · Folio ${signed.folio}`);
            navigate(`/reports/${signed.id}`);
        } catch (err) {
            toast.error(err?.message || "No pudimos firmar el reporte.");
        } finally {
            setSubmitting(false);
        }
    };

    const currentStep = STEPS[stepIndex];

    return (
        <section className="page stack-5">
            <header className="page-header cluster justify-between align-center wrap gap-3">
                <div className="stack-1">
                    <h1>Nuevo reporte</h1>
                    <p className="helper-text">
                        Paso {stepIndex + 1} de {STEPS.length}: {currentStep.label}
                    </p>
                </div>
                <Button variant="ghost" onClick={() => navigate("/reports")}>
                    <ArrowLeft size={16} aria-hidden="true" style={{ marginRight: 6 }} />
                    Volver al hub
                </Button>
            </header>

            <ol className="wizard-steps">
                {STEPS.map((s, i) => {
                    const status = i < stepIndex ? "done" : i === stepIndex ? "current" : "pending";
                    return (
                        <li key={s.id} className={`wizard-step wizard-step--${status}`}>
                            <span className="wizard-step__index">
                                {status === "done" ? <Check size={14} /> : i + 1}
                            </span>
                            <span className="wizard-step__label">{s.label}</span>
                        </li>
                    );
                })}
            </ol>

            {/* Paso 1: Template */}
            {stepIndex === 0 ? (
                <Card hoverable={false}>
                    <CardHeader>
                        <h2>¿Qué documento vas a generar?</h2>
                    </CardHeader>
                    <CardBody>
                        <div className="reports-templates">
                            {TEMPLATE_PICKER_OPTIONS.map((tpl) => {
                                const allowed = canUseTemplate(user, tpl);
                                const isLocked = tpl.available && !allowed;
                                const isClickable = tpl.available && allowed;
                                const lockReason = tpl.requiredSpecialty
                                    ? `Requiere especialidad: ${SPECIALTY_LABELS[tpl.requiredSpecialty]}`
                                    : "No disponible para tu rol";
                                return (
                                    <button
                                        key={tpl.id}
                                        type="button"
                                        className={`reports-template-card${isClickable ? "" : " is-disabled"}${templateId === tpl.id ? " is-selected" : ""}`}
                                        onClick={isClickable ? () => handleSelectTemplate(tpl.id) : undefined}
                                        disabled={!isClickable}
                                        title={isLocked ? lockReason : undefined}
                                    >
                                        {isLocked ? (
                                            <span className="reports-template-card__icon"><Lock size={20} aria-hidden="true" /></span>
                                        ) : null}
                                        <div className="stack-1" style={{ flex: 1 }}>
                                            <span className="reports-template-card__title">{tpl.label}</span>
                                            <span className="reports-template-card__desc">{tpl.description}</span>
                                            {isLocked ? (
                                                <span className="reports-template-card__lock">🔒 {lockReason}</span>
                                            ) : null}
                                        </div>
                                        {tpl.comingSoon ? (
                                            <Badge variant="neutral">Próximamente</Badge>
                                        ) : null}
                                    </button>
                                );
                            })}
                        </div>
                    </CardBody>
                </Card>
            ) : null}

            {/* Paso 2: Patient */}
            {stepIndex === 1 ? (
                <Card hoverable={false}>
                    <CardHeader className="cluster justify-between align-center wrap gap-2">
                        <h2>Selecciona el paciente</h2>
                        <Badge variant="info">{template?.label}</Badge>
                    </CardHeader>
                    <CardBody className="stack-3">
                        <div className="search-bar">
                            <Search size={18} className="search-bar__icon" aria-hidden="true" />
                            <input
                                type="search"
                                className="search-bar__input"
                                placeholder="Busca por nombre, apellido o CURP…"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                aria-label="Buscar paciente"
                                autoFocus
                            />
                            {searchQuery ? (
                                <button
                                    type="button"
                                    className="search-bar__clear"
                                    aria-label="Limpiar búsqueda"
                                    onClick={() => setSearchQuery("")}
                                >
                                    <X size={16} aria-hidden="true" />
                                </button>
                            ) : null}
                        </div>
                        {searchLoading ? (
                            <SkeletonList items={3} />
                        ) : searchResults.length === 0 ? (
                            <EmptyState
                                icon={User}
                                title="Sin coincidencias"
                                message="Escribe el nombre o CURP del paciente."
                            />
                        ) : (
                            <ul className="patient-picker" role="list">
                                {searchResults.map((p) => (
                                    <li key={p.id}>
                                        <button
                                            type="button"
                                            className="patient-picker__item"
                                            onClick={() => handleSelectPatient(p)}
                                        >
                                            <span className="patient-picker__avatar" aria-hidden="true">
                                                <User size={18} />
                                            </span>
                                            <span className="patient-picker__meta">
                                                <span className="patient-picker__name">
                                                    {p.firstName} {p.lastName}
                                                </span>
                                                <span className="patient-picker__sub">
                                                    {p.curp || "Sin CURP"}
                                                </span>
                                            </span>
                                            <Badge variant={p.status === "DISCHARGED" ? "danger" : "success"}>
                                                {p.status === "DISCHARGED" ? "Dado de alta" : "Activo"}
                                            </Badge>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardBody>
                </Card>
            ) : null}

            {/* Paso 3: Form */}
            {stepIndex === 2 && template ? (
                <div className="stack-4">
                    {(template.sections || []).map((section) => (
                        <Card key={section.id} hoverable={false}>
                            <CardHeader>
                                <div className="stack-1">
                                    <h2>{section.title}</h2>
                                    {section.description ? (
                                        <p className="helper-text">{section.description}</p>
                                    ) : null}
                                </div>
                            </CardHeader>
                            <CardBody className="stack-3">
                                <div className="form-grid">
                                    {section.fields.map((field) => (
                                        <FieldRenderer
                                            key={field.name}
                                            field={field}
                                            value={data[field.name]}
                                            onChange={handleFieldChange}
                                            error={errors[field.name]}
                                            disabled={submitting}
                                            patientId={selectedPatient?.id}
                                        />
                                    ))}
                                </div>
                            </CardBody>
                        </Card>
                    ))}
                </div>
            ) : null}

            {/* Paso 4: Review */}
            {stepIndex === 3 && template ? (
                <Card hoverable={false}>
                    <CardHeader>
                        <h2>Revisar y firmar</h2>
                        <p className="helper-text">Verifica que los datos sean correctos. Al firmar, el reporte queda inmutable y se genera el sello digital.</p>
                    </CardHeader>
                    <CardBody className="stack-4">
                        <div className="report-review-summary">
                            <div>
                                <span className="helper-text">Tipo</span>
                                <strong>{template.label}</strong>
                            </div>
                            <div>
                                <span className="helper-text">Paciente</span>
                                <strong>
                                    {selectedPatient?.firstName} {selectedPatient?.lastName}
                                </strong>
                            </div>
                            <div>
                                <span className="helper-text">CURP</span>
                                <strong>{selectedPatient?.curp || "—"}</strong>
                            </div>
                        </div>
                        {(template.sections || []).map((section) => (
                            <div key={section.id} className="stack-2">
                                <h3>{section.title}</h3>
                                <dl className="report-review-fields">
                                    {section.fields.map((field) => {
                                        const raw = data[field.name];
                                        const display = (() => {
                                            if (raw === undefined || raw === null || raw === "") return "—";
                                            if (field.type === "select") {
                                                return field.options?.find((o) => o.value === raw)?.label || raw;
                                            }
                                            if (field.type === "date") return raw;
                                            return String(raw);
                                        })();
                                        return (
                                            <div key={field.name} className="report-review-field">
                                                <dt>{field.label}</dt>
                                                <dd>{display}</dd>
                                            </div>
                                        );
                                    })}
                                </dl>
                            </div>
                        ))}
                    </CardBody>
                </Card>
            ) : null}

            {/* Footer navigation */}
            <div className="wizard-footer">
                <Button variant="ghost" onClick={handleBack} disabled={stepIndex === 0 || submitting}>
                    <ChevronLeft size={16} aria-hidden="true" style={{ marginRight: 4 }} />
                    Atrás
                </Button>
                <div className="cluster gap-2">
                    {stepIndex === STEPS.length - 1 ? (
                        <>
                            <Button variant="secondary" onClick={handleSaveDraft} loading={submitting && !errors._signing}>
                                Guardar borrador
                            </Button>
                            <ButtonPrimary onClick={handleSignAndFinish} loading={submitting}>
                                Firmar y emitir
                            </ButtonPrimary>
                        </>
                    ) : (
                        <Button
                            variant="primary"
                            onClick={handleNext}
                            disabled={
                                (stepIndex === 0 && !templateId) ||
                                (stepIndex === 1 && !selectedPatient)
                            }
                        >
                            Siguiente
                            <ChevronRight size={16} aria-hidden="true" style={{ marginLeft: 4 }} />
                        </Button>
                    )}
                </div>
            </div>
        </section>
    );
}
