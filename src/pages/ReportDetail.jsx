import { useEffect, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { Download, ShieldCheck, Pencil, FileWarning, FileSignature } from "lucide-react";
import Card, { CardBody, CardHeader } from "../components/UI/Card";
import Button from "../components/UI/Button";
import ButtonPrimary from "../components/ButtonPrimary";
import Badge from "../components/UI/Badge";
import Modal from "../components/UI/Modal";
import { useToast } from "../components/UI/Toast";
import * as reportsService from "../services/reportsService";
import * as patientsService from "../services/patientsService";
import { downloadReportPdf } from "../utils/export/pdf/reportPdf";
import { getTemplate } from "../config/clinicalSchemas/reports";
import { formatDateISOToHuman } from "../utils/formatters";
import { useBreadcrumbLabel } from "../context/breadcrumb-context";
import { ROLES } from "../utils/constants";
import auditService from "../services/auditService";

function statusInfo(status) {
    switch (status) {
        case "FIRMADO": return { variant: "success", label: "Firmado" };
        case "ENTREGADO": return { variant: "info", label: "Entregado" };
        case "DRAFT":
        default: return { variant: "neutral", label: "Borrador" };
    }
}

function displayValue(field, raw) {
    if (raw === undefined || raw === null || raw === "") return "—";
    if (field.type === "select") {
        return field.options?.find((o) => o.value === raw)?.label || raw;
    }
    if (field.type === "date") return formatDateISOToHuman(raw);
    return String(raw);
}

export default function ReportDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const { role, user } = useOutletContext() ?? {};
    const isAssistant = role === ROLES.ASSISTANT;

    const [report, setReport] = useState(null);
    const [patient, setPatient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [downloading, setDownloading] = useState(false);
    const [signing, setSigning] = useState(false);
    const [confirmSign, setConfirmSign] = useState(false);

    useEffect(() => {
        let active = true;
        setLoading(true);
        setError("");

        async function load() {
            try {
                const reportData = await reportsService.getOne(id);
                const patientData = await patientsService.getPatient(reportData.patientId);
                if (!active) return;
                setReport(reportData);
                setPatient(patientData);
                auditService.logAudit("report_view", { reportId: reportData.id });
            } catch (err) {
                if (!active) return;
                setError(err?.message || "No pudimos cargar el reporte.");
            } finally {
                if (active) setLoading(false);
            }
        }

        load();
        return () => { active = false; };
    }, [id]);

    useBreadcrumbLabel(id, report?.folio || null);

    const handleDownload = async () => {
        if (!report || !patient) return;
        setDownloading(true);
        try {
            await downloadReportPdf({ report, patient, professional: user });
            auditService.logAudit("report_pdf_downloaded", { reportId: report.id, folio: report.folio });
        } catch (err) {
            toast.error(err?.message || "No pudimos generar el PDF.");
        } finally {
            setDownloading(false);
        }
    };

    const handleSign = async () => {
        if (!report) return;
        setSigning(true);
        try {
            const signed = await reportsService.sign(report.id);
            setReport(signed);
            toast.success(`Reporte firmado · Folio ${signed.folio}`);
            auditService.logAudit("report_signed", { reportId: signed.id, folio: signed.folio });
            setConfirmSign(false);
        } catch (err) {
            toast.error(err?.message || "No pudimos firmar el reporte.");
        } finally {
            setSigning(false);
        }
    };

    if (loading) {
        return (
            <section className="page">
                <Card hoverable={false}><CardBody><p>Cargando reporte…</p></CardBody></Card>
            </section>
        );
    }

    if (error) {
        return (
            <section className="page">
                <Card hoverable={false}>
                    <CardBody className="stack-2">
                        <p className="form-error" role="alert">{error}</p>
                        <Button onClick={() => navigate("/reports")}>Volver a Reportes</Button>
                    </CardBody>
                </Card>
            </section>
        );
    }

    if (!report || !patient) return null;

    const template = getTemplate(report.template);
    const { variant, label } = statusInfo(report.status);
    const isSigned = report.status === "FIRMADO" || report.status === "ENTREGADO";
    const patientName = `${patient.firstName || ""} ${patient.lastName || ""}`.trim();

    return (
        <section className="page stack-5">
            <header className="page-header cluster justify-between align-center wrap gap-3">
                <div className="stack-1">
                    <div className="cluster gap-2 align-center wrap">
                        <h1>Folio {report.folio}</h1>
                        <Badge variant={variant}>{label}</Badge>
                        {template ? <Badge variant="info">{template.label}</Badge> : null}
                    </div>
                    <p className="helper-text">
                        Paciente: <strong>{patientName}</strong>
                        {patient.curp ? ` · CURP ${patient.curp}` : ""}
                    </p>
                </div>
                <div className="cluster gap-2 wrap">
                    <ButtonPrimary variant="secondary" onClick={handleDownload} loading={downloading}>
                        <Download size={16} aria-hidden="true" style={{ marginRight: 6 }} />
                        Descargar PDF
                    </ButtonPrimary>
                    {!isAssistant && !isSigned ? (
                        <Button variant="primary" onClick={() => setConfirmSign(true)}>
                            <ShieldCheck size={16} aria-hidden="true" style={{ marginRight: 6 }} />
                            Firmar
                        </Button>
                    ) : null}
                    {!isAssistant && !isSigned ? (
                        <Button variant="ghost" onClick={() => navigate(`/reports/new?template=${report.template}&patientId=${report.patientId}`)}>
                            <Pencil size={16} aria-hidden="true" style={{ marginRight: 6 }} />
                            Editar como nuevo
                        </Button>
                    ) : null}
                    <Button variant="ghost" onClick={() => navigate(`/patients/${report.patientId}/reports`)}>
                        Ver expediente
                    </Button>
                </div>
            </header>

            {/* Banner verificación */}
            <Card hoverable={false} className={isSigned ? "report-verify-banner report-verify-banner--signed" : "report-verify-banner"}>
                <CardBody>
                    <div className="cluster gap-3 align-center wrap">
                        {isSigned ? (
                            <ShieldCheck size={28} aria-hidden="true" style={{ color: "var(--success, #16a34a)" }} />
                        ) : (
                            <FileWarning size={28} aria-hidden="true" style={{ color: "var(--warning, #d97706)" }} />
                        )}
                        <div className="stack-1" style={{ flex: 1 }}>
                            <strong>
                                {isSigned ? "Documento firmado y auditable" : "Borrador — pendiente de firma"}
                            </strong>
                            <p className="helper-text" style={{ margin: 0 }}>
                                {isSigned ? (
                                    <>
                                        Sello SHA-256: <code style={{ fontSize: "0.85em" }}>{report.pdfHash?.slice(0, 32)}…</code>
                                        {report.signedAt ? ` · Firmado el ${formatDateISOToHuman(report.signedAt)}` : ""}
                                    </>
                                ) : "Al firmar, el reporte se vuelve inmutable y se genera el sello digital NOM-004."}
                            </p>
                            <span
                                className="report-sha-demo"
                                title="En esta versión PMV el sello se calcula en el navegador. La firma vinculante requiere KSP con HSM del lado del servidor."
                            >
                                <span aria-hidden="true">ℹ</span>
                                Sello generado en cliente · versión PMV (no vinculante)
                            </span>
                        </div>
                        {isSigned && report.verificationCode ? (
                            <Badge variant="success">{report.verificationCode}</Badge>
                        ) : null}
                    </div>
                </CardBody>
            </Card>

            {/* Render del template */}
            {template ? (
                template.sections.map((section) => (
                    <Card key={section.id} hoverable={false}>
                        <CardHeader>
                            <h2>{section.title}</h2>
                            {section.description ? (
                                <p className="helper-text">{section.description}</p>
                            ) : null}
                        </CardHeader>
                        <CardBody>
                            <dl className="report-review-fields">
                                {section.fields.map((field) => (
                                    <div key={field.name} className="report-review-field">
                                        <dt>{field.label}</dt>
                                        <dd style={{ whiteSpace: "pre-wrap" }}>
                                            {displayValue(field, report.data?.[field.name])}
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                        </CardBody>
                    </Card>
                ))
            ) : (
                <Card hoverable={false}>
                    <CardBody className="stack-2">
                        <FileSignature size={20} aria-hidden="true" />
                        <p className="helper-text">Template "{report.template}" no reconocido.</p>
                    </CardBody>
                </Card>
            )}

            <Modal
                open={confirmSign}
                onClose={() => setConfirmSign(false)}
                title="Confirmar firma"
                footer={
                    <div className="cluster">
                        <Button variant="ghost" onClick={() => setConfirmSign(false)} disabled={signing}>
                            Cancelar
                        </Button>
                        <Button variant="primary" onClick={handleSign} loading={signing}>
                            <ShieldCheck size={16} aria-hidden="true" style={{ marginRight: 6 }} />
                            Firmar y sellar
                        </Button>
                    </div>
                }
            >
                <p>
                    Al firmar, este reporte queda <strong>inmutable</strong> y se genera el sello digital SHA-256 para verificación.
                    No podrás editar los campos después de firmar.
                </p>
            </Modal>
        </section>
    );
}
