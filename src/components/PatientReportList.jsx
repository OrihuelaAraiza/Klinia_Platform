import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, FileText, Eye, Download } from "lucide-react";
import Card, { CardBody, CardHeader } from "../components/UI/Card";
import Button from "../components/UI/Button";
import Badge from "../components/UI/Badge";
import EmptyState from "../components/UI/EmptyState";
import { useToast } from "../components/UI/Toast";
import { useBreadcrumbLabel } from "../context/breadcrumb-context";
import { formatDateISOToHuman } from "../utils/formatters";
import { getTemplateLabel, TBE_TEMPLATE_ID } from "../config/clinicalSchemas/reports";
import * as reportsService from "../services/reportsService";
import * as patientsService from "../services/patientsService";
import { downloadReportPdf } from "../utils/export/pdf/reportPdf";
import auditService from "../services/auditService";

function statusInfo(status) {
    switch (status) {
        case "FIRMADO": return { variant: "success", label: "Firmado" };
        case "ENTREGADO": return { variant: "info", label: "Entregado" };
        case "DRAFT":
        default: return { variant: "neutral", label: "Borrador" };
    }
}

export default function PatientReportsList() {
    const { patientId } = useParams();
    const navigate = useNavigate();
    const toast = useToast();

    const [patient, setPatient] = useState(null);
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorState, setErrorState] = useState("");
    const [downloadingId, setDownloadingId] = useState("");

    useEffect(() => {
        let active = true;
        setLoading(true);
        setErrorState("");

        async function load() {
            try {
                const patientData = await patientsService.getPatient(patientId);
                const reportsList = await reportsService.listByPatient(patientId);
                if (!active) return;
                setPatient(patientData);
                setReports(reportsList);
            } catch (err) {
                if (!active) return;
                const message = err?.message || "No pudimos cargar la lista de reportes.";
                setErrorState(message);
                toast.error(message);
            } finally {
                if (active) setLoading(false);
            }
        }

        load();
        return () => { active = false; };
    }, [patientId, toast]);

    const resolvedPatientName = patient
        ? `${patient.firstName || ""} ${patient.lastName || ""}`.trim() || patient.curp
        : null;
    useBreadcrumbLabel(patientId, resolvedPatientName);

    const handleDownload = async (report) => {
        setDownloadingId(report.id);
        try {
            await downloadReportPdf({ report, patient });
            auditService.logAudit("report_pdf_downloaded", { reportId: report.id, folio: report.folio });
        } catch (err) {
            toast.error(err?.message || "No pudimos generar el PDF.");
        } finally {
            setDownloadingId("");
        }
    };

    if (loading) {
        return (
            <section className="page">
                <Card hoverable={false}><CardBody><p>Cargando reportes…</p></CardBody></Card>
            </section>
        );
    }

    if (errorState) {
        return (
            <section className="page">
                <Card hoverable={false}>
                    <CardBody className="stack-2">
                        <p className="form-error" role="alert">{errorState}</p>
                        <Button onClick={() => navigate(`/patients/${patientId}`)}>Volver al expediente</Button>
                    </CardBody>
                </Card>
            </section>
        );
    }

    const patientName = resolvedPatientName || "Paciente";
    const handleCreate = () => navigate(`/reports/new?template=${TBE_TEMPLATE_ID}&patientId=${patientId}`);

    return (
        <section className="page stack-5">
            <header className="page-header cluster justify-between align-center wrap gap-3">
                <div className="stack-1">
                    <h1>Reportes de {patientName}</h1>
                    <p className="helper-text">
                        {reports.length} {reports.length === 1 ? "documento registrado" : "documentos registrados"}.
                    </p>
                </div>
                <div className="cluster gap-2 wrap">
                    <Button variant="ghost" onClick={() => navigate(`/patients/${patientId}`)}>
                        Volver al expediente
                    </Button>
                    <Button onClick={handleCreate}>
                        <Plus size={16} aria-hidden="true" style={{ marginRight: 6 }} />
                        Nueva constancia
                    </Button>
                </div>
            </header>

            <Card hoverable={false}>
                <CardHeader>
                    <h2>Documentos del paciente</h2>
                </CardHeader>
                <CardBody>
                    {reports.length === 0 ? (
                        <EmptyState
                            icon={FileText}
                            title="Aún no hay reportes"
                            message="Genera la primera constancia psicoterapéutica de este paciente."
                            action={<Button onClick={handleCreate}>Crear primera constancia clínica</Button>}
                        />
                    ) : (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Folio</th>
                                        <th>Tipo</th>
                                        <th>Estado</th>
                                        <th>Fecha</th>
                                        <th className="align-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reports.map((r) => {
                                        const { variant, label } = statusInfo(r.status);
                                        return (
                                            <tr key={r.id}>
                                                <td><strong>{r.folio}</strong></td>
                                                <td><Badge variant="info">{getTemplateLabel(r.template)}</Badge></td>
                                                <td><Badge variant={variant}>{label}</Badge></td>
                                                <td>{formatDateISOToHuman(r.signedAt || r.createdAt)}</td>
                                                <td className="align-right">
                                                    <div className="cluster gap-2 justify-end">
                                                        <Button variant="ghost" size="sm" onClick={() => navigate(`/reports/${r.id}`)}>
                                                            <Eye size={14} aria-hidden="true" style={{ marginRight: 4 }} />
                                                            Ver
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleDownload(r)}
                                                            loading={downloadingId === r.id}
                                                        >
                                                            <Download size={14} aria-hidden="true" style={{ marginRight: 4 }} />
                                                            PDF
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardBody>
            </Card>
        </section>
    );
}
