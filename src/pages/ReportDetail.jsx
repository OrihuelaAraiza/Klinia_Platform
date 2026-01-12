import { useEffect, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import ButtonPrimary from "../components/ButtonPrimary";
import Button from "../components/UI/Button";
import Card, { CardBody, CardHeader } from "../components/UI/Card";
import Badge from "../components/UI/Badge";
import { useToast } from "../components/UI/Toast";
import * as reportsService from "../services/reportsService";
import { downloadReportPdf } from "../utils/reportPdf";
import auditService from "../services/auditService";
import { formatDateISOToHuman } from "../utils/formatters";
import { ROLES, ROUTES } from "../utils/constants";
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

export default function ReportDetail() {
    const { patientId, reportId } = useParams();
    const { role, user } = useOutletContext() ?? {};
    const [report, setReport] = useState(null);
    const [patient, setPatient] = useState(null);
    const [loading, setLoading] = useState(true);
    // 🚨 Desestructuración segura del toast
    const { error } = useToast() || {};
    const [errorState, setError] = useState(""); // Usamos errorState para no chocar con el método error() del toast
    const [pdfLoading, setPdfLoading] = useState(false);
    const navigate = useNavigate();
    const isAssistant = role === ROLES.ASSISTANT;
    const isLocked = report?.status === "cerrado";

    useEffect(() => {
        let active = true;
        setLoading(true);
        setError("");

        async function load() {
            try {
                // 1. Cargar el informe
                const [reportData, patientData] = await Promise.all([
                    reportsService.getOne(reportId),
                    patientsService.getPatient(patientId),
                ]);
                if (!active) return;
                setReport(reportData);
                setPatient(patientData);
            } catch (err) {
                if (!active) return;
                setError(err?.message || "No pudimos cargar el informe solicitado.");
                error(err?.message || "Error de carga."); // Usamos el toast
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        load();
        return () => {
            active = false;
        };
    }, [reportId, patientId, error]); // Dependencia del error

    const handlePdf = async () => {
        if (!report || !patient) return;
        setPdfLoading(true);
        try {
            await downloadReportPdf({
                report,
                patient,
                professional: user,
            });
            await auditService.logAudit("report_pdf_generated", {
                patientId: report.patientId,
                reportId: report.id,
                folio: report.folio,
            });
            // 🚨 toast.success debe usarse aquí
            // success("PDF generado."); 
        } catch (err) {
            error(err?.message || "No pudimos generar el PDF.");
        } finally {
            setPdfLoading(false);
        }
    };
    
    // 🚨 CORRECCIÓN: Handler de navegación al formulario de edición
    const handleEdit = () => {
        // Asumiendo que ROUTES.reportForm es la ruta que acepta :patientId y :reportId
        // Ejemplo: /patients/:patientId/reports/:reportId/edit o similar
        // Si tu ReportForm maneja la edición directamente en la ruta de detalle:
        navigate(`/patients/${patientId}/reports/edit/${reportId}`); 
    };

    if (loading) {
        return (
            <section className="page">
                <Card hoverable={false}>
                    <CardBody>
                        <p>Cargando informe…</p>
                    </CardBody>
                </Card>
            </section>
        );
    }

    if (error) {
        return (
            <section className="page">
                <Card hoverable={false}>
                    <CardBody className="stack-2">
                        <p className="form-error" role="alert">
                            {error}
                        </p>
                        <Button onClick={() => navigate(`/patients/${patientId}#ordenes-informes`)}>
                            Volver
                        </Button>
                    </CardBody>
                </Card>
            </section>
        );
    }

    if (!report || !patient) {
        return null;
    }

    const issuedAt = formatDateISOToHuman(report.createdAt);
    const patientName = `${patient.firstName} ${patient.lastName}`.trim();
    const patientAge = formatAge(patient.birthDate);
    const statusLabel = isLocked ? "Cerrado" : "Borrador";
    const statusVariant = isLocked ? "success" : "neutral";

    return (
        <section className="page stack-5">
            <header className="page__header cluster justify-between align-center wrap">
                <div>
                    <h1>Folio {report.folio}</h1>
                    <p className="helper-text">Creado el {issuedAt}</p>
                </div>
                <Button variant="ghost" onClick={() => navigate(`/patients/${patientId}#ordenes-informes`)}>
                    Volver
                </Button>
            </header>

            <Card hoverable={false}>
                <CardHeader className="cluster justify-between align-center wrap gap-2">
                    <div className="cluster gap-2 align-center">
                        <Badge variant={statusVariant}>{statusLabel}</Badge>
                        <span className="helper-text">Paciente: {patientName}</span>
                    </div>
                    <div className="cluster gap-2 wrap">
                        <ButtonPrimary variant="secondary" onClick={handlePdf} loading={pdfLoading}>
                            Descargar PDF
                        </ButtonPrimary>
                        {!isAssistant && !isLocked && (
                            <Button
                                variant="secondary"
                                // 🚨 CORRECCIÓN DE LA NAVEGACIÓN
                                onClick={handleEdit}
                            >
                                Editar
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            onClick={() => navigate(`/patients/${patientId}#ordenes-informes`)}
                        >
                            Ver expediente
                        </Button>
                    </div>
                </CardHeader>
                <CardBody className="stack-4">
                    <div className="detail-grid">
                        <div className="stack-2">
                            <h3>Datos del paciente</h3>
                            <p>
                                <strong>Nombre:</strong> {patientName}
                            </p>
                            <p>
                                <strong>CURP:</strong> {patient.curp || "—"}
                            </p>
                            <p>
                                <strong>Edad:</strong> {patientAge}
                            </p>
                        </div>

                        <div className="stack-2">
                            <h3>Profesional tratante</h3>
                            <p>
                                <strong>Nombre:</strong> {user?.name || "Profesional BreveMente"}
                            </p>
                            {user?.license && (
                                <p>
                                    <strong>Cédula:</strong> {user.license}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="stack-2">
                        <h3>Título del informe</h3>
                        <p>{report.titulo || "—"}</p>
                    </div>

                    <div className="stack-2">
                        <h3>Contenido</h3>
                        <div style={{ whiteSpace: "pre-wrap" }}>{report.contenido || "—"}</div>
                    </div>

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
                </CardBody>
            </Card>
        </section>
    );
}