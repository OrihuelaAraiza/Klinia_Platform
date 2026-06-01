import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { FileText, Pill, FileSignature, Search, X, Download, Eye, Lock } from "lucide-react";
import Card, { CardBody, CardHeader } from "../components/UI/Card";
import Button from "../components/UI/Button";
import Badge from "../components/UI/Badge";
import EmptyState from "../components/UI/EmptyState";
import { SkeletonList } from "../components/UI/Skeleton";
import { useToast } from "../components/UI/Toast";
import { listAll } from "../services/reportsService";
import * as patientsService from "../services/patientsService";
import { TEMPLATE_PICKER_OPTIONS, getTemplateLabel, TBE_TEMPLATE_ID } from "../config/clinicalSchemas/reports";
import { formatDateISOToHuman } from "../utils/formatters";
import { downloadReportPdf } from "../utils/export/pdf/reportPdf";
import { canUseTemplate, getSpecialtyLabel } from "../utils/permissions";
import { SPECIALTY_LABELS } from "../utils/constants";
import auditService from "../services/auditService";

const STATUS_OPTIONS = [
    { value: "", label: "Todos" },
    { value: "DRAFT", label: "Borrador" },
    { value: "FIRMADO", label: "Firmado" },
    { value: "ENTREGADO", label: "Entregado" },
];

function statusVariant(status) {
    switch (status) {
        case "FIRMADO": return "success";
        case "ENTREGADO": return "info";
        case "DRAFT":
        default: return "neutral";
    }
}

function statusLabel(status) {
    return STATUS_OPTIONS.find((s) => s.value === status)?.label || "Borrador";
}

export default function Reports() {
    const navigate = useNavigate();
    const toast = useToast();
    const { user } = useOutletContext() ?? {};

    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ q: "", template: "", status: "" });
    const [downloadingId, setDownloadingId] = useState("");

    const loadReports = useCallback(async (current) => {
        setLoading(true);
        try {
            const response = await listAll({
                q: current.q,
                template: current.template,
                status: current.status,
                size: 100,
            });
            const list = Array.isArray(response?.items) ? response.items : response;
            setItems(list || []);
        } catch (err) {
            toast.error(err?.message || "No pudimos cargar los reportes.");
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        const timer = setTimeout(() => loadReports(filters), 250);
        return () => clearTimeout(timer);
    }, [filters, loadReports]);

    const handleDownload = async (report) => {
        setDownloadingId(report.id);
        try {
            const patient = await patientsService.getPatient(report.patientId);
            await downloadReportPdf({ report, patient });
            auditService.logAudit("report_pdf_downloaded", { reportId: report.id, folio: report.folio });
        } catch (err) {
            toast.error(err?.message || "No pudimos generar el PDF.");
        } finally {
            setDownloadingId("");
        }
    };

    const handleStartTemplate = (templateId) => {
        navigate(`/reports/new?template=${templateId}`);
    };

    const counts = useMemo(() => {
        const total = items.length;
        const draft = items.filter((r) => r.status === "DRAFT").length;
        const signed = items.filter((r) => r.status === "FIRMADO").length;
        return { total, draft, signed };
    }, [items]);

    const showEmpty = !loading && items.length === 0;

    return (
        <section className="page stack-5">
            <header className="page-header">
                <div className="stack-1">
                    <h1>Reportes y constancias</h1>
                    <p className="helper-text">
                        Genera documentos clínicos auditables (NOM-004) firmables con sello digital.
                    </p>
                </div>
            </header>

            {/* Acción cards: nuevos reportes */}
            <div className="reports-templates">
                {TEMPLATE_PICKER_OPTIONS.map((tpl) => {
                    const icon = tpl.id === TBE_TEMPLATE_ID
                        ? FileSignature
                        : tpl.id === "PSIQUIATRICO" ? Pill : FileText;
                    const Icon = icon;
                    const allowedBySpecialty = canUseTemplate(user, tpl);
                    const isLocked = tpl.available && !allowedBySpecialty;
                    const isClickable = tpl.available && allowedBySpecialty;
                    const lockReason = tpl.requiredSpecialty
                        ? `Requiere especialidad: ${SPECIALTY_LABELS[tpl.requiredSpecialty]}`
                        : "No disponible para tu rol";
                    return (
                        <button
                            key={tpl.id}
                            type="button"
                            className={`reports-template-card${isClickable ? "" : " is-disabled"}`}
                            onClick={isClickable ? () => handleStartTemplate(tpl.id) : undefined}
                            disabled={!isClickable}
                            title={isLocked ? lockReason : undefined}
                        >
                            <span className="reports-template-card__icon">
                                {isLocked ? <Lock size={20} aria-hidden="true" /> : <Icon size={22} aria-hidden="true" />}
                            </span>
                            <div className="stack-1" style={{ flex: 1 }}>
                                <span className="reports-template-card__title">{tpl.label}</span>
                                <span className="reports-template-card__desc">{tpl.description}</span>
                                {isLocked ? (
                                    <span className="reports-template-card__lock">🔒 {lockReason}</span>
                                ) : null}
                            </div>
                            {tpl.comingSoon ? (
                                <Badge variant="neutral">Próximamente</Badge>
                            ) : isClickable ? (
                                <span className="reports-template-card__cta">Crear →</span>
                            ) : null}
                        </button>
                    );
                })}
            </div>

            {getSpecialtyLabel(user) ? (
                <p className="helper-text" style={{ marginTop: "-0.5rem" }}>
                    Sesión activa como <strong>{getSpecialtyLabel(user)}</strong>. Las plantillas restringidas se muestran bloqueadas.
                </p>
            ) : null}

            {/* KPIs y filtros */}
            <Card hoverable={false}>
                <CardBody className="stack-3">
                    <div className="reports-stats">
                        <div className="reports-stat">
                            <span className="reports-stat__value">{counts.total}</span>
                            <span className="reports-stat__label">Reportes emitidos</span>
                        </div>
                        <div className="reports-stat">
                            <span className="reports-stat__value">{counts.signed}</span>
                            <span className="reports-stat__label">Firmados</span>
                        </div>
                        <div className="reports-stat">
                            <span className="reports-stat__value">{counts.draft}</span>
                            <span className="reports-stat__label">En borrador</span>
                        </div>
                    </div>
                    <div className="reports-filters">
                        <div className="search-bar" style={{ flex: 1 }}>
                            <Search size={18} className="search-bar__icon" aria-hidden="true" />
                            <input
                                type="search"
                                className="search-bar__input"
                                placeholder="Folio, paciente o CURP…"
                                value={filters.q}
                                onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
                                aria-label="Buscar reporte"
                            />
                            {filters.q ? (
                                <button
                                    type="button"
                                    className="search-bar__clear"
                                    aria-label="Limpiar búsqueda"
                                    onClick={() => setFilters((f) => ({ ...f, q: "" }))}
                                >
                                    <X size={16} aria-hidden="true" />
                                </button>
                            ) : null}
                        </div>
                        <select
                            className="reports-filters__select"
                            value={filters.template}
                            onChange={(e) => setFilters((f) => ({ ...f, template: e.target.value }))}
                            aria-label="Filtrar por tipo"
                        >
                            <option value="">Todos los tipos</option>
                            {TEMPLATE_PICKER_OPTIONS.filter((o) => o.available).map((tpl) => (
                                <option key={tpl.id} value={tpl.id}>{tpl.label}</option>
                            ))}
                        </select>
                        <select
                            className="reports-filters__select"
                            value={filters.status}
                            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                            aria-label="Filtrar por estado"
                        >
                            {STATUS_OPTIONS.map((s) => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                        </select>
                    </div>
                </CardBody>
            </Card>

            {/* Tabla global */}
            <Card hoverable={false}>
                <CardHeader>
                    <h2>Reportes recientes</h2>
                </CardHeader>
                <CardBody>
                    {loading ? (
                        <SkeletonList items={5} />
                    ) : showEmpty ? (
                        <EmptyState
                            icon={FileText}
                            title={filters.q || filters.template || filters.status ? "Sin coincidencias" : "Aún no hay reportes"}
                            message={
                                filters.q || filters.template || filters.status
                                    ? "Ajusta los filtros o limpia la búsqueda."
                                    : "Empieza creando tu primera constancia desde las opciones de arriba."
                            }
                            action={
                                filters.q || filters.template || filters.status ? (
                                    <Button variant="ghost" size="sm" onClick={() => setFilters({ q: "", template: "", status: "" })}>
                                        Limpiar filtros
                                    </Button>
                                ) : (
                                    <Button onClick={() => handleStartTemplate(TBE_TEMPLATE_ID)}>
                                        Crear primera constancia clínica
                                    </Button>
                                )
                            }
                        />
                    ) : (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Folio</th>
                                        <th>Paciente</th>
                                        <th>Tipo</th>
                                        <th>Fecha</th>
                                        <th>Estado</th>
                                        <th className="align-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((r) => (
                                        <tr key={r.id}>
                                            <td><strong>{r.folio}</strong></td>
                                            <td>
                                                <div className="stack-0">
                                                    <span>{r.patientName}</span>
                                                    {r.patientCurp ? (
                                                        <span className="helper-text">{r.patientCurp}</span>
                                                    ) : null}
                                                </div>
                                            </td>
                                            <td>
                                                <Badge variant="info">{getTemplateLabel(r.template)}</Badge>
                                            </td>
                                            <td>{formatDateISOToHuman(r.signedAt || r.createdAt)}</td>
                                            <td>
                                                <Badge variant={statusVariant(r.status)}>{statusLabel(r.status)}</Badge>
                                            </td>
                                            <td className="align-right">
                                                <div className="cluster gap-2 justify-end">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => navigate(`/reports/${r.id}`)}
                                                    >
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
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardBody>
            </Card>
        </section>
    );
}
