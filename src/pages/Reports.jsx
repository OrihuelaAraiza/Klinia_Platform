import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import Card, { CardBody, CardHeader } from "../components/UI/Card";
import Button from "../components/UI/Button";
import Breadcrumbs from "../components/UI/Breadcrumbs";
import { useToast } from "../components/UI/Toast";
import InputField from "../components/InputField";
import { listPatients } from "../services/patientsService";
import * as patientsService from "../services/patientsService";
import { getHistory } from "../services/historyService";
import { exportPatientRecordJson, exportHistoryPdf } from "../services/reportsService"; 
import { formatDateISOToHuman } from "../utils/formatters";
import { ROLES, ROUTES } from "../utils/constants";
import auditService from "../services/auditService";

const MAX_LOG_ITEMS = 12;
const STORAGE_KEY_LOG = "reports_activity_log"; 

const safeToast = {
    success: (msg) => console.log('TOAST SUCCESS:', msg),
    error: (msg) => console.error('TOAST ERROR:', msg),
    info: (msg) => console.log('TOAST INFO:', msg),
};

export default function Reports() {
    const navigate = useNavigate();
    
    const { 
        success = safeToast.success, 
        error = safeToast.error, 
        info = safeToast.info 
    } = useToast() || safeToast;
    
    const { role, user } = useOutletContext() ?? {};
    const professionalId = user?.id;
    const isAssistant = role === ROLES.ASSISTANT;

    const [filters, setFilters] = useState({
        search: "", from: "", to: "", professional: "",
    });
    
    const [activeFilters, setActiveFilters] = useState(filters);
    const [allPatients, setAllPatients] = useState([]); 
    const [patientsState, setPatientsState] = useState({
        items: [], loading: true, error: "",
    });

    const [historyCache, setHistoryCache] = useState({});
    const [professionalOptions, setProfessionalOptions] = useState([]);
    const [actionLoading, setActionLoading] = useState("");
    
    const [activityLog, setActivityLog] = useState(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY_LOG);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    });

    const [importFile, setImportFile] = useState(null); 

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY_LOG, JSON.stringify(activityLog.slice(0, MAX_LOG_ITEMS)));
        } catch (e) {
            console.error("Error saving log to localStorage:", e);
        }
    }, [activityLog]);


    const pushLog = (entry) => {
        const uniqueId = entry.id ?? (globalThis.crypto?.randomUUID?.() || `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
        setActivityLog((prev) => {
            const next = [{ ...entry, id: uniqueId }, ...prev];
            return next.slice(0, MAX_LOG_ITEMS);
        });
    };

    const handleFilterChange = (event) => {
        const { id, value } = event.target;
        setFilters((prev) => ({ ...prev, [id]: value }));
    };
    
    const handleSearchClick = (event) => {
        event.preventDefault();
        setActiveFilters(filters); 
    };
    
    const handleFilterReset = () => {
        const reset = { search: "", from: "", to: "", professional: "" };
        setFilters(reset);
        setActiveFilters(reset);
    };

  useEffect(() => {
        let alive = true;

        async function loadPatients() {
            if (!professionalId) return;
            
            setPatientsState((prev) => ({ ...prev, loading: true, error: "" }));
            
            try {
                const response = await listPatients({ 
                    page: 1, 
                    size: 100, 
                    q: activeFilters.search 
                }); 

                if (!alive) return;
                const items = response?.items || [];
                
                setAllPatients(items);
                setPatientsState(prev => ({ ...prev, loading: false, error: "" }));
            } catch (localError) { 
                if (!alive) return;
                const message = localError?.message || "No pudimos cargar la lista de pacientes.";
                
                setAllPatients([]);
                setPatientsState({ items: [], loading: false, error: message });
                error(message);
            }
        }

        if (professionalId) {
            loadPatients();
        }
        return () => {
            alive = false;
        };
    }, [error, professionalId, activeFilters.search]);

    useEffect(() => {
        if (!allPatients.length) {
            setHistoryCache({});
            setProfessionalOptions([]);
            return;
        }

        let cancelled = false;
        async function buildCache() {
            const entries = {};
            const professionals = new Set();
            
            await Promise.all(
                allPatients.map(async (patient) => {
                    if (cancelled) return;
                    const professionalName = user?.name || "Profesional a cargo"; 
                    entries[patient.id] = { exists: patient.updatedAt } || null; 
                    professionals.add(professionalName);
                })
            );
            
            if (!cancelled) {
                setHistoryCache(entries);
                setProfessionalOptions(Array.from(professionals));
            }
        }
        buildCache();
        
        return () => {
            cancelled = true;
        };
    }, [allPatients, user?.name]); 


    const filteredPatients = useMemo(() => {
        const term = activeFilters.search.trim().toLowerCase();
        const from = activeFilters.from ? new Date(activeFilters.from) : null;
        const to = activeFilters.to ? new Date(activeFilters.to) : null;

        return allPatients.filter((patient) => {
            if (term) {
                const name = `${patient.firstName ?? ""} ${patient.lastName ?? ""}`.toLowerCase();
                const curp = (patient.curp ?? "").toLowerCase();
                if (!name.includes(term) && !curp.includes(term)) {
                    return false;
                }
            }
            const updatedAt = patient.updatedAt ? new Date(patient.updatedAt) : null;
            if (from && updatedAt && updatedAt < from) return false;
            if (to && updatedAt && updatedAt > to) return false;

            if (activeFilters.professional) {
                const professional = user?.name ?? "";
                if (!professional.toLowerCase().includes(activeFilters.professional.toLowerCase())) {
                    return false;
                }
            }

            return true;
        });
    }, [activeFilters, allPatients, user?.name]); 

    const handleExportJson = async (patient) => {
        if (isAssistant) return;
        const actionKey = `json-${patient.id}`;
        setActionLoading(actionKey);
        try {
            await exportPatientRecordJson(patient.id, { patient }); 
            pushLog({
                type: "Expediente JSON (Descarga)",
                patientName: `${patient.firstName ?? ""} ${patient.lastName ?? ""}`.trim() || patient.curp || patient.id,
                at: new Date().toISOString(),
            });
            success("Expediente JSON generado");
        } catch (err) {
            error(err?.message || "No pudimos exportar el expediente.");
        } finally {
            setActionLoading("");
        }
    };

    const handleExportHistory = async (patient) => {
        if (isAssistant) return;
        const actionKey = `history-${patient.id}`;
        const hasHistory = patient.updatedAt && true; 

        if (!hasHistory) {
             error("El paciente no tiene historial registrado.");
             return;
        }

        setActionLoading(actionKey);
        try {
            await exportHistoryPdf(patient.id, { patient }); 
            pushLog({
                type: "Historia PDF (Descarga)",
                patientName: `${patient.firstName ?? ""} ${patient.lastName ?? ""}`.trim() || patient.curp || patient.id,
                at: new Date().toISOString(),
            });
            success("Historia clínica exportada");
        } catch (err) {
            error(err?.message || "No pudimos exportar la historia clínica.");
        } finally {
            setActionLoading("");
        }
    };
    
    const handleImportJson = () => {
        if (!importFile) {
            error("Selecciona un archivo JSON para importar.");
            return;
        }
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (!data.patientData || !data.clinicalData) {
                    throw new Error("El archivo JSON de expediente es inválido o está incompleto.");
                }
                
                setActionLoading("import");
                info("Importando expediente...");

                const reassignPayload = { patientData: data.patientData, clinicalData: data.clinicalData };
                const importedPatient = await patientsService.importAndReassign(reassignPayload); 
                
                setAllPatients((prev) => [...prev, importedPatient]); 
                pushLog({
                    type: "Importación de Paciente",
                    patientName: `${importedPatient.firstName ?? ""} ${importedPatient.lastName ?? ""}`.trim(),
                    at: new Date().toISOString(),
                });

                success(`Expediente de ${importedPatient.firstName} importado y reasignado a tu perfil.`);
                
            } catch (err) {
                console.error("Import error:", err);
                error(err?.message || "Fallo en la importación o archivo inválido.");
            } finally {
                setActionLoading("");
                setImportFile(null); 
            }
        };
        reader.readAsText(importFile);
    };

    const handleViewReports = (patientId) => {
        navigate(`${ROUTES.patients}/${patientId}/reports`);
    };

    const breadcrumbs = [
        { to: "/dashboard", label: "Dashboard" },
        { label: "Reportes" },
    ];

    return (
        <section className="page stack-5">
            <div className="page-breadcrumbs">
                <Breadcrumbs items={breadcrumbs} />
            </div>
            <div className="page-header page-header--single">
                <div className="stack-1">
                    <h1>Reportes y exportaciones</h1>
                    <p className="helper-text">
                        Exporta historias clínicas, expedientes JSON y consulta los registros generados recientemente.
                    </p>
                </div>
            </div>

            <div className="reports-layout">
                <div className="reports-main stack-4">
                    {/* --- FILTROS --- */}
                    <Card hoverable={false}>
                        <CardHeader>
                            <h2>Filtros</h2>
                        </CardHeader>
                        <CardBody>
                            <form className="reports-filters" onSubmit={handleSearchClick}>
                                <div className="reports-filters__field reports-filters__field--search">
                                    <label htmlFor="search">Paciente o CURP</label>
                                    <input
                                        id="search"
                                        className="input"
                                        type="search"
                                        value={filters.search}
                                        onChange={handleFilterChange}
                                        placeholder="Ej. Ana Pérez o CURP"
                                    />
                                </div>
                                <div className="reports-filters__field">
                                    <label htmlFor="from">Desde</label>
                                    <input
                                        id="from"
                                        className="input"
                                        type="date"
                                        value={filters.from}
                                        onChange={handleFilterChange}
                                    />
                                </div>
                                <div className="reports-filters__field">
                                    <label htmlFor="to">Hasta</label>
                                    <input
                                        id="to"
                                        className="input"
                                        type="date"
                                        value={filters.to}
                                        onChange={handleFilterChange}
                                    />
                                </div>
                                <div className="reports-filters__field">
                                    <label htmlFor="professional">Profesional</label>
                                    <input
                                        id="professional"
                                        className="input"
                                        list="professionals"
                                        value={filters.professional}
                                        onChange={handleFilterChange}
                                        placeholder="Nombre o cédula"
                                    />
                                    <datalist id="professionals">
                                        {professionalOptions.map((professional) => (
                                            <option key={professional} value={professional} />
                                        ))}
                                    </datalist>
                                </div>
                                
                                <div className="reports-filters__actions cluster gap-2">
                                    <Button type="submit" variant="secondary">
                                        Buscar
                                    </Button>
                                    <Button type="button" variant="ghost" onClick={handleFilterReset}>
                                        Restablecer
                                    </Button>
                                </div>
                            </form>
                        </CardBody>
                    </Card>
                    
                    {/* BLOQUE DE IMPORTACIÓN JSON */}
                    {!isAssistant && (
                        <Card hoverable={false}>
                            <CardHeader>
                                <h2>Importar Expediente JSON</h2>
                            </CardHeader>
                            <CardBody className="cluster gap-3 items-center">
                                <InputField
                                    label="Seleccionar Archivo (.json)"
                                    type="file"
                                    id="importFile"
                                    accept=".json"
                                    onChange={(e) => setImportFile(e.target.files[0])}
                                    className="flex-grow"
                                />
                                <Button
                                    variant="primary"
                                    onClick={handleImportJson}
                                    disabled={!importFile || actionLoading === "import"}
                                    loading={actionLoading === "import"}
                                >
                                    Importar y Reasignar
                                </Button>
                            </CardBody>
                        </Card>
                    )}


                    {/* --- TABLA DE PACIENTES FILTRADOS --- */}
                    <Card hoverable={false}>
                        <CardHeader>
                            <h2>Pacientes ({filteredPatients.length})</h2>
                        </CardHeader>
                        <CardBody className="stack-3">
                            {patientsState.loading ? (
                                <p>Cargando pacientes…</p>
                            ) : patientsState.error ? (
                                <p className="form-error" role="alert">
                                    {patientsState.error}
                                </p>
                            ) : filteredPatients.length === 0 ? (
                                <p className="helper-text">No se encontraron pacientes con los filtros seleccionados.</p>
                            ) : (
                                <div className="table-wrapper">
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                <th>Paciente</th>
                                                <th>CURP</th>
                                                <th>Actualización</th>
                                                <th>Profesional</th>
                                                <th className="table__actions">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredPatients.map((patient) => {
                                                
                                                const hasHistory = patient.updatedAt && true; 
                                                const professionalName = user?.name ?? "Sin asignar";
                                                
                                                const jsonLoading = actionLoading === `json-${patient.id}`;
                                                const historyLoading = actionLoading === `history-${patient.id}`;

                                                return (
                                                    <tr key={patient.id}>
                                                        <td>
                                                            <button 
                                                                type="button" 
                                                                className="link link--button"
                                                                onClick={() => handleViewReports(patient.id)}
                                                            >
                                                                <strong>
                                                                    {(patient.firstName ?? "") + " " + (patient.lastName ?? "")}
                                                                </strong>
                                                            </button>
                                                        </td>
                                                        <td>{patient.curp || "—"}</td>
                                                        <td>{formatDateISOToHuman(patient.updatedAt) || "—"}</td>
                                                        <td>{professionalName}</td>
                                                        <td>
                                                            <div className="table__actions cluster">
                                                                <Button
                                                                    variant="secondary"
                                                                    size="sm"
                                                                    onClick={() => handleExportJson(patient)}
                                                                    disabled={isAssistant || jsonLoading}
                                                                    loading={jsonLoading}
                                                                >
                                                                    Expediente JSON
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleExportHistory(patient)}
                                                                    disabled={isAssistant || historyLoading || !hasHistory}
                                                                    loading={historyLoading}
                                                                    title={!hasHistory ? "Captura una historia clínica antes de exportar." : undefined}
                                                                >
                                                                    Historia PDF
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => navigate(`${ROUTES.patients}/${patient.id}/notes`)}
                                                                >
                                                                    Ver notas
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
                </div>
                <aside className="reports-sidebar stack-4">
                    <Card hoverable={false}>
                        <CardHeader>
                            <h2>Actividad reciente (persiste en sesión)</h2>
                        </CardHeader>
                        <CardBody className="stack-2">
                            {activityLog.length === 0 ? (
                                <p className="helper-text">Aún no hay actividad registrada en esta sesión.</p>
                            ) : (
                                <ul className="reports-log">
                                    {activityLog.map((item) => (
                                        <li key={item.id} className="reports-log__item">
                                            <span className="reports-log__type">{item.type}</span>
                                            <span className="reports-log__meta">
                                                {item.patientName}
                                                <br />
                                                <time dateTime={item.at}>
                                                    {formatDateISOToHuman(item.at)} •{" "}
                                                    {new Date(item.at).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                                                </time>
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </CardBody>
                    </Card>
                </aside>
            </div>
        </section>
    );
}