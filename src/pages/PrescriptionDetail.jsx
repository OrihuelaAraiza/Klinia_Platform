import { useEffect, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import ButtonPrimary from "../components/ButtonPrimary";
import Button from "../components/UI/Button";
import Card, { CardBody, CardHeader } from "../components/UI/Card";
import Badge from "../components/UI/Badge";
import { useToast } from "../components/UI/Toast";
import * as prescriptionsService from "../services/prescriptionsService";
import { downloadPrescriptionPdf } from "../utils/prescriptionPdf"; 
import auditService from "../services/auditService";
import { formatDateISOToHuman } from "../utils/formatters";
import { ROLES, ROUTES } from "../utils/constants";

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

function statusVariant(status) {
    return status === "SUSPENDIDA" ? "danger" : "success"; 
}

export default function PrescriptionDetail() {
    const { id } = useParams();
    const { role, user } = useOutletContext() ?? {};
    const { success, error } = useToast() || {}; 
    
    const [prescription, setPrescription] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorState, setErrorState] = useState(""); 
    const [pdfLoading, setPdfLoading] = useState(false);
    const [suspending, setSuspending] = useState(false);
    
    const navigate = useNavigate();
    const isAssistant = role === ROLES.ASSISTANT;

    useEffect(() => {
        let active = true;
        setLoading(true);
        setErrorState("");

        prescriptionsService
            .getOne(id)
            .then((record) => {
                if (!active) return;
                setPrescription(record);
                auditService.logAudit("prescription_view", {
                    patientId: record.patientRecordId,
                    prescriptionId: record.id,
                    folio: record.folio,
                });
            })
            .catch((err) => {
                if (!active) return;
                setErrorState(err?.message || "No pudimos cargar la prescripción solicitada.");
                error(err?.message || "Error al cargar la prescripción."); 
            })
            .finally(() => {
                if (active) {
                    setLoading(false);
                }
            });

        return () => {
            active = false;
        };
    }, [id, error]);

    const patientData = prescription?.patientRecord;
    const professionalData = prescription?.therapist; 
    
    const patientFullName = patientData ? `${patientData.firstName} ${patientData.lastName}` : "Cargando...";

    const handlePdf = async () => {
        if (!prescription || !patientData || !professionalData) return;
        setPdfLoading(true);
        try {
            await downloadPrescriptionPdf({
                prescription,
                patient: patientData, 
                professional: professionalData, 
            });
            await auditService.logAudit("prescription_pdf_generated", {
                patientId: prescription.patientRecordId,
                prescriptionId: prescription.id,
                folio: prescription.folio,
            });
            success("PDF de prescripción generado");
        } catch (err) {
            error(err?.message || "No pudimos generar el PDF.");
        } finally {
            setPdfLoading(false);
        }
    };

    const handleSuspend = async () => {
        if (!prescription || isAssistant || prescription.status === "SUSPENDIDA") {
            return;
        }
        setSuspending(true);
        try {
            const updated = await prescriptionsService.suspend(prescription.id);
            setPrescription(updated); 
            success("Prescripción suspendida.");
        } catch (err) {
            error(err?.message || "No pudimos suspender la prescripción.");
        } finally {
            setSuspending(false);
        }
    };

    if (loading) {
        return (
            <section className="page">
                <Card hoverable={false}>
                    <CardBody>
                        <p>Cargando prescripción…</p>
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
                        <Button onClick={() => navigate(ROUTES.prescriptions)}>Volver a prescripciones</Button>
                    </CardBody>
                </Card>
            </section>
        );
    }

    if (!prescription || !patientData || !professionalData) {
        return <p>Error: Datos de prescripción incompletos.</p>;
    }

    const issuedAt = formatDateISOToHuman(prescription.createdAt);
    const patientAge = formatAge(patientData.birthDate); 
    const statusLabel = prescription.status === "SUSPENDIDA" ? "Suspendida" : "Vigente"; 

    return (
        <section className="page stack-5">
            <header className="page__header cluster justify-between align-center wrap">
                <div>
                    <h1>Folio {prescription.folio}</h1>
                    <p className="helper-text">Emitida el {issuedAt}</p>
                </div>
                <Button variant="ghost" onClick={() => navigate(ROUTES.prescriptions)}>
                    Volver
                </Button>
            </header>

            <Card hoverable={false}>
                <CardHeader className="cluster justify-between align-center wrap gap-2">
                    <div className="cluster gap-2 align-center">
                        <Badge variant={statusVariant(prescription.status)}>{statusLabel}</Badge>
                        <span className="helper-text">Paciente: {patientFullName}</span>
                    </div>
                    <div className="cluster gap-2 wrap">
                        <ButtonPrimary variant="secondary" onClick={handlePdf} loading={pdfLoading}>
                            Descargar PDF
                        </ButtonPrimary>
                        <Button
                            variant="ghost"
                            onClick={() => navigate(`/patients/${prescription.patientRecordId}#prescripciones`)}
                        >
                            Ver expediente
                        </Button>
                        {!isAssistant ? (
                            <Button
                                variant="danger"
                                onClick={handleSuspend}
                                disabled={prescription.status === "SUSPENDIDA"}
                                loading={suspending}
                            >
                                Suspender prescripción
                            </Button>
                        ) : null}
                    </div>
                </CardHeader>
                <CardBody className="stack-4">
                    <div className="detail-grid">
                        <div className="stack-2">
                            <h3>Datos del paciente</h3>
                            <p>
                                <strong>Nombre:</strong> {patientFullName}
                            </p>
                            <p>
                                <strong>CURP:</strong> {patientData.curp || "—"}
                            </p>
                            <p>
                                <strong>Edad:</strong> {patientAge}
                            </p>
                            <p>
                                <strong>Teléfono:</strong> {patientData.phone || "—"}
                            </p>
                            <p>
                                <strong>Contacto de emergencia:</strong> {patientData.emergencyName || "—"} ({patientData.emergencyPhone || "—"})
                            </p>
                        </div>

                        <div className="stack-2">
                            <h3>Profesional tratante</h3>
                            <p>
                                <strong>Nombre:</strong> {professionalData.name || "Profesional Klinia"}
                            </p>
                            <p>
                                <strong>Email:</strong> {professionalData.email || "—"}
                            </p>
                            <p>
                                <strong>Rol:</strong> {professionalData.role || "—"}
                            </p>
                            <p>
                                <strong>Cédula:</strong> {professionalData.kycRecord?.certificateFolio || "No registrada"}
                            </p> 
                        </div>
                    </div>

                    <div className="stack-1">
                        <h3>Detalle terapéutico</h3>
                        <p>
                            <strong>Principio activo:</strong> {prescription.substance}
                        </p>
                        <p>
                            <strong>Forma farmacéutica:</strong> {prescription.form}
                        </p>
                        <p>
                            <strong>Dosis:</strong> {prescription.dose}
                        </p>
                        <p>
                            <strong>Vía de administración:</strong> {prescription.route}
                        </p>
                        <p>
                            <strong>Frecuencia:</strong> {prescription.frequency}
                        </p>
                        <p>
                            <strong>Duración:</strong> {prescription.duration}
                        </p>
                    </div>

                    <div className="stack-1">
                        <h3>Indicaciones</h3>
                        <p>{prescription.notes || "Sin indicaciones adicionales."}</p>
                    </div>
                </CardBody>
            </Card>
        </section>
    );
}