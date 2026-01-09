import { useEffect, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import Card, { CardBody, CardHeader } from "../components/UI/Card";
import Button from "../components/UI/Button";
import ButtonPrimary from "../components/ButtonPrimary";
import InputField from "../components/InputField";
import Badge from "../components/UI/Badge";
import { useToast } from "../components/UI/Toast";
import { ROLES, ROUTES } from "../utils/constants";
import { formatDateISOToHuman } from "../utils/formatters";
import * as reportsService from "../services/reportsService";
import * as patientsService from "../services/patientsService";

function formatAge(birthDate) {
    if (!birthDate) return "—";
    const date = new Date(birthDate);
    if (Number.isNaN(date.getTime())) return "—";
    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
        age -= 1;
    }
    return `${age} años`;
}

export default function ReportForm() {
    const { patientId, reportId } = useParams();
    const { role, user } = useOutletContext() ?? {};
    const navigate = useNavigate();
    
    //  Desestructuración segura del toast
    const { success, error } = useToast() || {}; 
    
    const isAssistant = role === ROLES.ASSISTANT;
    // isEdit es verdadero si reportId tiene un valor (no null, no undefined)
    const isEdit = Boolean(reportId); 

    const [patient, setPatient] = useState(null);
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorState, setError] = useState("");
    
    const [form, setForm] = useState({
        titulo: "",
        contenido: "",
    });
    
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [locking, setLocking] = useState(false);
    
    const isLocked = report?.status === "cerrado";
    const isReadOnly = isAssistant || isLocked;

    useEffect(() => {
        let active = true;
        setLoading(true);
        setError("");

        async function load() {
            try {
                // 1. Cargar datos del paciente siempre
                const patientData = await patientsService.getPatient(patientId);
                if (!active) return;
                setPatient(patientData);
                // 2. Si es edición, cargar datos del informe
                if (reportId && reportId.trim()) {
                    const reportData = await reportsService.getOne(reportId);
                    if (!active) return;
                    setReport(reportData);
                    setForm({
                        titulo: reportData.titulo || "",
                        contenido: reportData.contenido || "",
                    });
                }
            } catch (err) {
                if (!active) return;
                const message = err?.message || "No pudimos cargar la información.";
                setError(message);
                error(message);
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        if (patientId) {
            load();
        } else {
            setLoading(false);
            setError("ID de paciente es requerido.");
        }
        
        return () => {
            active = false;
        };
    }, [patientId, reportId, error]); // Dependencias: patientId, reportId, error (del toast)

    const handleChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: "" }));
        }
    };

    const validate = () => {
        const newErrors = {};
        if (!form.titulo?.trim()) {
            newErrors.titulo = "El título es requerido.";
        }
        if (!form.contenido?.trim()) {
            newErrors.contenido = "El contenido es requerido.";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isReadOnly || !validate()) return;

        setSubmitting(true);
        try {
            const payload = {
                patientId,
                titulo: form.titulo.trim(),
                contenido: form.contenido.trim(),
            };

            let result;
            if (isEdit) {
                result = await reportsService.update(reportId, payload);
                success("Informe actualizado correctamente.");
            } else {
                result = await reportsService.create(payload);
                success("Informe creado correctamente.");
            }

            navigate(`/patients/${patientId}/reports`); 
        } catch (err) {
            error(err?.message || "No pudimos guardar el informe.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleLock = async () => {
        if (isReadOnly || !reportId) return;

        setLocking(true);
        try {
            await reportsService.lock(reportId);
            
            const updated = await reportsService.getOne(reportId);
            setReport(updated);
            success("Informe cerrado correctamente."); 
        } catch (err) {
            error(err?.message || "No pudimos cerrar el informe.");
        } finally {
            setLocking(false);
        }
    };

    if (loading) {
        return (
            <section className="page">
                <Card hoverable={false}>
                    <CardBody>
                        <p>Cargando…</p>
                    </CardBody>
                </Card>
            </section>
        );
    }

    if (errorState) {
        return (
            <section className="page">
                <Card hoverable={false}>
                    <CardBody className="stack-2">
                        <p className="form-error" role="alert">
                            {errorState}
                        </p>
                        <Button onClick={() => navigate(`/patients/${patientId}#ordenes-informes`)}>Volver</Button>
                    </CardBody>
                </Card>
            </section>
        );
    }

    if (!patient) {
        return null;
    }

    const patientName = `${patient.firstName} ${patient.lastName}`.trim();
    const patientAge = formatAge(patient.birthDate);
    const statusLabel = isLocked ? "Cerrado" : "Borrador";
    const statusVariant = isLocked ? "success" : "neutral";

    return (
        <section className="page stack-5">
            <header className="page__header">
                <div className="cluster gap-2 align-center wrap">
                    <h1>{isEdit ? "Editar informe clínico" : "Nuevo informe clínico"}</h1>
                    {isEdit && report && (
                        <Badge variant={statusVariant}>{statusLabel}</Badge>
                    )}
                </div>
                {isEdit && report && (
                    <p className="helper-text">Folio: {report.folio}</p>
                )}
            </header>

            <Card hoverable={false}>
                <CardHeader>
                    <h2>Datos del paciente</h2>
                </CardHeader>
                <CardBody className="stack-2">
                    <p>
                        <strong>Nombre:</strong> {patientName}
                    </p>
                    <p>
                        <strong>Edad:</strong> {patientAge}
                    </p>
                    <p>
                        <strong>CURP:</strong> {patient.curp || "—"}
                    </p>
                </CardBody>
            </Card>

            <Card hoverable={false}>
                <CardHeader>
                    <h2>Contenido del informe</h2>
                </CardHeader>
                <CardBody>
                    <form onSubmit={handleSubmit} className="stack-4">
                        <InputField
                            label="Título *"
                            type="text"
                            value={form.titulo}
                            onChange={(e) => handleChange("titulo", e.target.value)}
                            error={errors.titulo}
                            disabled={isReadOnly}
                            readOnly={isReadOnly}
                            required
                        />

                        <div>
                            <label htmlFor="contenido" className="ui-field__label">
                                Contenido *
                            </label>
                            <textarea
                                id="contenido"
                                className={`input-field__input${errors.contenido ? " has-error" : ""}`}
                                value={form.contenido}
                                onChange={(e) => handleChange("contenido", e.target.value)}
                                disabled={isReadOnly}
                                readOnly={isReadOnly}
                                rows={12}
                                required
                            />
                            {errors.contenido && (
                                <p className="ui-field__error" role="alert">
                                    {errors.contenido}
                                </p>
                            )}
                        </div>

                        {isEdit && report && (
                            <div className="stack-1">
                                <p className="helper-text">
                                    <strong>Creado:</strong> {formatDateISOToHuman(report.createdAt)}
                                </p>
                                {report.updatedAt !== report.createdAt && (
                                    <p className="helper-text">
                                        <strong>Última actualización:</strong> {formatDateISOToHuman(report.updatedAt)}
                                    </p>
                                )}
                                {isLocked && report.lockedAt && (
                                    <p className="helper-text">
                                        <strong>Cerrado:</strong> {formatDateISOToHuman(report.lockedAt)}
                                    </p>
                                )}
                            </div>
                        )}

                        <div className="cluster gap-2">
                            {!isReadOnly && (
                                <>
                                    <ButtonPrimary type="submit" loading={submitting}>
                                        {isEdit ? "Actualizar borrador" : "Guardar borrador"}
                                    </ButtonPrimary>
                                    {isEdit && !isLocked && (
                                        <Button variant="secondary" onClick={handleLock} loading={locking}>
                                            Cerrar informe
                                        </Button>
                                    )}
                                </>
                            )}
                            <Button variant="ghost" onClick={() => navigate(`/patients/${patientId}#ordenes-informes`)}>
                                Cancelar
                            </Button>
                        </div>
                    </form>
                </CardBody>
            </Card>
        </section>
    );
}