import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import Card, { CardBody, CardHeader } from "../components/UI/Card";
import Button from "../components/UI/Button";
import Badge from "../components/UI/Badge";
import Breadcrumbs from "../components/UI/Breadcrumbs";
import { useToast } from "../components/UI/Toast";
import InputField from "../components/InputField";
import Modal from "../components/UI/Modal";
import { globalSearch, reingressPatient } from "../services/patientsService";
import { exportPatientRecordJson, exportHistoryPdf } from "../services/reportsService"; 
import { formatDateISOToHuman } from "../utils/formatters";
import { ROUTES } from "../utils/constants";

const STORAGE_KEY_LOG = "reports_activity_log";

export default function Reports() {
    const navigate = useNavigate();
    const toast = useToast();
    
    // --- ESTADOS ---
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [results, setResults] = useState([]);
    const [actionLoading, setActionLoading] = useState("");
    
    // Estado para el modal de vinculación
    const [linkModal, setLinkModal] = useState({ open: false, patient: null, reason: "" });

    // Log de actividad (Persiste en la sesión)
    const [activityLog, setActivityLog] = useState(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY_LOG);
            return stored ? JSON.parse(stored) : [];
        } catch { return []; }
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY_LOG, JSON.stringify(activityLog.slice(0, 10)));
    }, [activityLog]);

    const pushLog = (type, patientName) => {
        setActivityLog((prev) => {
            const next = [{ id: crypto.randomUUID(), type, patientName, at: new Date().toISOString() }, ...prev];
            return next.slice(0, 10);
        });
    };

    // --- BÚSQUEDA GLOBAL (Conecta con router.get("/global/search")) ---
    const handleSearch = async (e) => {
        e.preventDefault();
        if (searchQuery.trim().length < 3) {
            return toast.info("Escribe al menos 3 caracteres para buscar en toda la base de datos.");
        }

        setIsSearching(true);
        try {
            const data = await globalSearch(searchQuery);
            setResults(data || []);
        } catch (err) {
            toast.error("Error al realizar la búsqueda global.");
        } finally {
            setIsSearching(false);
        }
    };

    // --- VINCULACIÓN Y REINGRESO ---
    const handleLinkPatient = async () => {
        if (!linkModal.reason.trim()) {
            return toast.error("El motivo es obligatorio para vincular el expediente.");
        }

        setActionLoading("linking");
        try {
            // Llama al endpoint de re-entry que cambia status a ACTIVE y vincula al terapeuta
            await reingressPatient(linkModal.patient.id, linkModal.reason);
            
            toast.success(`${linkModal.patient.firstName} ha sido vinculado y activado.`);
            pushLog("Vinculación", `${linkModal.patient.firstName} ${linkModal.patient.lastName}`);

            // Actualizamos la tabla localmente para mostrar el cambio de estado e icono
            setResults(prev => prev.map(p => 
                p.id === linkModal.patient.id ? { ...p, status: 'ACTIVE', isLinked: true } : p
            ));
            
            setLinkModal({ open: false, patient: null, reason: "" });
        } catch (err) {
            toast.error("No se pudo completar la vinculación.");
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
            toast.error("Error al exportar.");
        } finally { setActionLoading(""); }
    };

    return (
        <section className="page stack-5">
            <Breadcrumbs items={[{ to: "/dashboard", label: "Dashboard" }, { label: "Reportes" }]} />
            
            <div className="page-header">
                <h1>Buscador Global de Expedientes</h1>
                <p className="helper-text">Consulta y vincula pacientes de toda la red o exporta documentos clínicos.</p>
            </div>

            <div className="reports-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '2rem', alignItems: 'start' }}>
                <div className="stack-4">
                    {/* Card de Búsqueda */}
                    <Card>
                        <CardBody>
                            <form onSubmit={handleSearch} className="cluster align-end gap-3">
                                <div style={{ flexGrow: 1 }}>
                                    <InputField 
                                        label="Buscar en toda la base de datos (Nombre o CURP)" 
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Ej: Juan Pérez..."
                                    />
                                </div>
                                <Button type="submit" variant="primary" loading={isSearching}>
                                    Buscar Global
                                </Button>
                            </form>
                        </CardBody>
                    </Card>

                    {/* Tabla de Resultados Globales */}
                    <Card>
                        <CardHeader><h2>Resultados encontrados</h2></CardHeader>
                        <CardBody>
                            {results.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '2rem' }}>
                                    <p className="helper-text">Ingresa un nombre para buscar pacientes registrados.</p>
                                </div>
                            ) : (
                                <div className="table-container">
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                <th>Paciente</th>
                                                <th>Estado</th>
                                                <th className="text-right">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {results.map(p => (
                                                <tr key={p.id}>
                                                    <td>
                                                        <div className="stack-0">
                                                            <strong>{p.firstName} {p.lastName}</strong>
                                                            <small className="helper-text">{p.curp || 'Sin CURP'}</small>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <Badge variant={p.status === 'ACTIVE' ? 'success' : 'danger'}>
                                                            {p.status}
                                                        </Badge>
                                                    </td>
                                                    <td className="text-right">
                                                        <div className="cluster justify-end gap-2">
                                                            {p.isLinked ? (
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="sm"
                                                                    onClick={() => navigate(`${ROUTES.patients}/${p.id}`)}
                                                                >
                                                                    Ver Ficha
                                                                </Button>
                                                            ) : (
                                                                <Button 
                                                                    variant="secondary" 
                                                                    size="sm"
                                                                    onClick={() => setLinkModal({ open: true, patient: p, reason: "" })}
                                                                >
                                                                    Vincular
                                                                </Button>
                                                            )}
                                                            <Button 
                                                                variant="ghost" 
                                                                size="sm" 
                                                                onClick={() => handleExportJson(p)}
                                                                loading={actionLoading === `json-${p.id}`}
                                                            >
                                                                JSON
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
                </div>

                {/* Sidebar: Actividad */}
                <aside>
                    <Card>
                        <CardHeader><h3>Actividad</h3></CardHeader>
                        <CardBody>
                            <ul className="stack-3">
                                {activityLog.map(log => (
                                    <li key={log.id} style={{ fontSize: '0.85rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                                        <div className="cluster justify-between">
                                            <span style={{ fontWeight: 'bold', color: 'var(--color-primary-600)' }}>{log.type}</span>
                                            <small className="helper-text">{new Date(log.at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</small>
                                        </div>
                                        <div>{log.patientName}</div>
                                    </li>
                                ))}
                                {activityLog.length === 0 && <p className="helper-text">Sin actividad reciente.</p>}
                            </ul>
                        </CardBody>
                    </Card>
                </aside>
            </div>

            {/* Modal de Vinculación */}
            <Modal
                open={linkModal.open}
                onClose={() => setLinkModal({ open: false, patient: null, reason: "" })}
                title="Vincular y Activar Expediente"
                footer={
                    <div className="cluster">
                        <Button variant="ghost" onClick={() => setLinkModal({ open: false, patient: null, reason: "" })}>Cancelar</Button>
                        <Button variant="primary" onClick={handleLinkPatient} loading={actionLoading === "linking"}>Confirmar</Button>
                    </div>
                }
            >
                <div className="stack-3">
                    <p>Estás vinculando a <strong>{linkModal.patient?.firstName} {linkModal.patient?.lastName}</strong> a tu perfil. Esto activará su expediente si estaba dado de alta.</p>
                    <div className="stack-1">
                        <label className="ui-field__label">Motivo de vinculación/reingreso *</label>
                        <textarea 
                            className="ui-field__input"
                            rows={4}
                            value={linkModal.reason}
                            onChange={(e) => setLinkModal(prev => ({ ...prev, reason: e.target.value }))}
                            placeholder="Ej: El paciente inicia nuevo proceso terapéutico..."
                        />
                    </div>
                </div>
            </Modal>
        </section>
    );
}