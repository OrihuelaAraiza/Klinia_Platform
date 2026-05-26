import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, UserSearch, X, Download, Link2, FileText } from "lucide-react";
import Card, { CardBody, CardHeader } from "../components/UI/Card";
import Button from "../components/UI/Button";
import Badge from "../components/UI/Badge";
import EmptyState from "../components/UI/EmptyState";
import Modal from "../components/UI/Modal";
import { useToast } from "../components/UI/Toast";
import { SkeletonList } from "../components/UI/Skeleton";
import { globalSearch, reingressPatient } from "../services/patientsService";
import { exportPatientRecordJson } from "../services/reportsService";
import { ROUTES } from "../utils/constants";

const STORAGE_KEY_LOG = "expedientes_activity_log";
const SEARCH_DEBOUNCE_MS = 350;
const MIN_QUERY_LENGTH = 2;

function timeOf(iso) {
    try {
        return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
        return "";
    }
}

export default function Expedientes() {
    const navigate = useNavigate();
    const toast = useToast();

    const [searchQuery, setSearchQuery] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [results, setResults] = useState([]);
    const [hasSearched, setHasSearched] = useState(false);
    const [actionLoading, setActionLoading] = useState("");
    const [linkModal, setLinkModal] = useState({ open: false, patient: null, reason: "" });

    const [activityLog, setActivityLog] = useState(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY_LOG);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY_LOG, JSON.stringify(activityLog.slice(0, 10)));
    }, [activityLog]);

    const pushLog = (type, patientName) => {
        setActivityLog((prev) => {
            const next = [
                { id: crypto.randomUUID(), type, patientName, at: new Date().toISOString() },
                ...prev,
            ];
            return next.slice(0, 10);
        });
    };

    const runSearch = useCallback(async (query) => {
        setIsSearching(true);
        try {
            const data = await globalSearch(query);
            setResults(Array.isArray(data) ? data : []);
        } catch (err) {
            toast.error(err?.message || "Error al realizar la búsqueda global.");
            setResults([]);
        } finally {
            setIsSearching(false);
            setHasSearched(true);
        }
    }, [toast]);

    useEffect(() => {
        const trimmed = searchQuery.trim();
        if (trimmed.length < MIN_QUERY_LENGTH) {
            setResults([]);
            setHasSearched(false);
            return undefined;
        }
        const timer = setTimeout(() => {
            runSearch(trimmed);
        }, SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [searchQuery, runSearch]);

    const handleLinkPatient = async () => {
        if (!linkModal.reason.trim()) {
            toast.error("El motivo es obligatorio para vincular el expediente.");
            return;
        }
        setActionLoading("linking");
        try {
            await reingressPatient(linkModal.patient.id, linkModal.reason);
            toast.success(`${linkModal.patient.firstName} fue vinculado y activado.`);
            pushLog("Vinculación", `${linkModal.patient.firstName} ${linkModal.patient.lastName}`);
            setResults((prev) =>
                prev.map((p) =>
                    p.id === linkModal.patient.id ? { ...p, status: "ACTIVE", isLinked: true } : p
                )
            );
            setLinkModal({ open: false, patient: null, reason: "" });
        } catch (err) {
            toast.error(err?.message || "No se pudo completar la vinculación.");
        } finally {
            setActionLoading("");
        }
    };

    const handleExportJson = async (patient) => {
        setActionLoading(`json-${patient.id}`);
        try {
            await exportPatientRecordJson(patient.id, { patient });
            pushLog("Exportación JSON", `${patient.firstName} ${patient.lastName}`);
            toast.success("Expediente exportado.");
        } catch (err) {
            toast.error(err?.message || "Error al exportar.");
        } finally {
            setActionLoading("");
        }
    };

    const trimmedQuery = searchQuery.trim();
    const showHint = trimmedQuery.length > 0 && trimmedQuery.length < MIN_QUERY_LENGTH;
    const showEmptyNoResults = hasSearched && !isSearching && results.length === 0 && trimmedQuery.length >= MIN_QUERY_LENGTH;
    const showInitialEmpty = !hasSearched && !isSearching && trimmedQuery.length === 0;

    return (
        <section className="page stack-5">
            <header className="page-header">
                <div className="stack-1">
                    <h1>Buscar expediente</h1>
                    <p className="helper-text">
                        Consulta pacientes de toda la red, vincúlalos a tu perfil o exporta su expediente clínico.
                    </p>
                </div>
            </header>

            <div className="reports-layout">
                <div className="stack-4">
                    <Card hoverable={false}>
                        <CardBody className="stack-3">
                            <div className="search-bar">
                                <Search size={18} className="search-bar__icon" aria-hidden="true" />
                                <input
                                    type="search"
                                    className="search-bar__input"
                                    placeholder="Busca por nombre, apellido o CURP en toda la red…"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    aria-label="Buscar expediente"
                                    autoFocus
                                />
                                {isSearching ? <span className="search-bar__spinner" aria-hidden="true" /> : null}
                                {searchQuery && !isSearching ? (
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
                            {showHint ? (
                                <p className="helper-text">Escribe al menos {MIN_QUERY_LENGTH} caracteres para iniciar la búsqueda.</p>
                            ) : null}
                        </CardBody>
                    </Card>

                    <Card hoverable={false}>
                        <CardHeader>
                            <h2>Resultados</h2>
                            {results.length > 0 ? (
                                <span className="helper-text">{results.length} coincidencias</span>
                            ) : null}
                        </CardHeader>
                        <CardBody>
                            {isSearching ? (
                                <SkeletonList items={4} />
                            ) : showInitialEmpty ? (
                                <EmptyState
                                    icon={UserSearch}
                                    title="Inicia una búsqueda"
                                    message="Escribe el nombre o CURP del paciente para consultar la red completa."
                                />
                            ) : showEmptyNoResults ? (
                                <EmptyState
                                    icon={FileText}
                                    title="Sin coincidencias"
                                    message={`No encontramos pacientes para "${trimmedQuery}". Verifica la escritura o intenta con la CURP.`}
                                    action={
                                        <Button variant="ghost" size="sm" onClick={() => setSearchQuery("")}>
                                            Limpiar búsqueda
                                        </Button>
                                    }
                                />
                            ) : (
                                <ul className="patient-picker patient-picker--results" role="list">
                                    {results.map((p) => {
                                        const isActive = p.status === "ACTIVE";
                                        const statusLabel = isActive ? "Activo" : "Dado de alta";
                                        return (
                                            <li key={p.id}>
                                                <div className="patient-picker__row">
                                                    <span className="patient-picker__avatar" aria-hidden="true">
                                                        <UserSearch size={18} />
                                                    </span>
                                                    <div className="patient-picker__meta">
                                                        <span className="patient-picker__name">
                                                            {p.firstName} {p.lastName}
                                                        </span>
                                                        <span className="patient-picker__sub">
                                                            {p.curp || "Sin CURP"}
                                                            {p.email ? ` · ${p.email}` : ""}
                                                        </span>
                                                    </div>
                                                    <Badge variant={isActive ? "success" : "danger"}>{statusLabel}</Badge>
                                                    <div className="cluster gap-2 patient-picker__actions">
                                                        {p.isLinked || isActive ? (
                                                            <Button
                                                                variant="primary"
                                                                size="sm"
                                                                onClick={() => navigate(`${ROUTES.patients}/${p.id}`)}
                                                            >
                                                                Ver expediente
                                                            </Button>
                                                        ) : (
                                                            <Button
                                                                variant="primary"
                                                                size="sm"
                                                                onClick={() => setLinkModal({ open: true, patient: p, reason: "" })}
                                                            >
                                                                <Link2 size={14} aria-hidden="true" style={{ marginRight: 4 }} />
                                                                Vincular
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleExportJson(p)}
                                                            loading={actionLoading === `json-${p.id}`}
                                                            aria-label={`Exportar JSON de ${p.firstName} ${p.lastName}`}
                                                        >
                                                            <Download size={14} aria-hidden="true" style={{ marginRight: 4 }} />
                                                            JSON
                                                        </Button>
                                                    </div>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </CardBody>
                    </Card>
                </div>

                <aside>
                    <Card hoverable={false}>
                        <CardHeader>
                            <h3 style={{ margin: 0 }}>Actividad reciente</h3>
                        </CardHeader>
                        <CardBody>
                            {activityLog.length === 0 ? (
                                <p className="helper-text">Sin actividad reciente.</p>
                            ) : (
                                <ul className="activity-log">
                                    {activityLog.map((log) => (
                                        <li key={log.id} className="activity-log__item">
                                            <div className="cluster justify-between">
                                                <span className="activity-log__type">{log.type}</span>
                                                <span className="helper-text">{timeOf(log.at)}</span>
                                            </div>
                                            <span className="activity-log__name">{log.patientName}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </CardBody>
                    </Card>
                </aside>
            </div>

            <Modal
                open={linkModal.open}
                onClose={() => setLinkModal({ open: false, patient: null, reason: "" })}
                title="Vincular y activar expediente"
                footer={
                    <div className="cluster">
                        <Button variant="ghost" onClick={() => setLinkModal({ open: false, patient: null, reason: "" })}>
                            Cancelar
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleLinkPatient}
                            loading={actionLoading === "linking"}
                        >
                            Confirmar
                        </Button>
                    </div>
                }
            >
                <div className="stack-3">
                    <p>
                        Estás vinculando a <strong>{linkModal.patient?.firstName} {linkModal.patient?.lastName}</strong>{" "}
                        a tu perfil. Esto activará su expediente si estaba dado de alta.
                    </p>
                    <div className="stack-1">
                        <label className="ui-field__label">Motivo de vinculación / reingreso *</label>
                        <textarea
                            className="ui-field__input"
                            rows={4}
                            value={linkModal.reason}
                            onChange={(e) => setLinkModal((prev) => ({ ...prev, reason: e.target.value }))}
                            placeholder="Ej: el paciente inicia un nuevo proceso terapéutico…"
                        />
                    </div>
                </div>
            </Modal>
        </section>
    );
}
