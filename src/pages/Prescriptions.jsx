import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { Search, User, Calendar, FileText } from "lucide-react";
import Card, { CardBody, CardHeader } from "../components/UI/Card";
import Button from "../components/UI/Button";
import ButtonPrimary from "../components/ButtonPrimary";
import InputField from "../components/InputField";
import { useToast } from "../components/UI/Toast";
import { SkeletonCard, SkeletonList } from "../components/UI/Skeleton";
import EmptyState from "../components/UI/EmptyState";
import { PRESCRIPTION_FIELDS, ROLES, ROUTES } from "../utils/constants";
import auditService from "../services/auditService";
import * as patientsService from "../services/patientsService";
import * as prescriptionsService from "../services/prescriptionsService";
import { formatDateISOToHuman } from "../utils/formatters";

// IMPORTA TUS SECCIONES AQUÍ
import DiagnosticNosologico from "../components/Sections/DiagnosticoNosologico";
import DiagnosticEstrategico from "../components/Sections/DiagnosticoEstrategico";
import SessionDetails from "../components/Sections/SessionDetails";
import ClinicalScales from "../components/Sections/ClinicalScales";

const REQUIRED_FIELDS = new Set(["substance", "dose", "frequency", "duration"]);
const DEFAULT_PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 400; 

function buildInitialForm(patientId = "") {
    return {
        // --- Identificación ---
        patientRecordId: patientId,

        // --- 1. Módulo Nosológico 
        motivoConsulta: "",
        dx_dsmvtr: "",
        dx_cie11: "",
        dx_primeraAparicion: "",
        dx_evolucion: "",          
        dx_precipitantes: "",
        dx_dif: "",               
        dx_comorbilidad: "",
        pronostico: "",           
        pronostico_favorables: "",
        pronostico_desfavorables: "",
        hasFarmacos: false,        
        farmacos_lista: "",
        planTratamiento: "",

        // --- 2. Módulo Estratégico 
        trastorno: "",
        dx_op: "",                  // DX Operativo SPR
        dimensiones_spr: "",        // String/JSON de áreas afectadas
        val_yo: "",                 // Valoración áreas Yo
        val_demas: "",              // Valoración áreas Demás
        val_mundo: "",              // Valoración áreas Mundo

        // --- 3. Registro de Sesión
        sesionNumero: 1,
        sesionFecha: new Date().toISOString().split('T')[0], // Formato YYYY-MM-DD para input date
        sesionFase: "",
        cambio_criterio: "",
        notas_reestructuracion: "",
        px1_tipo: "",
        px1_text: "",
        px1_oss: false,
        px1_add: false,
        px1_rss: false,

        // --- 4. Clinimetría 
        escala_beck_dep: "",       
        escala_beck_ans: "",
        escala_pdss: "",
        escala_ybocs: "",
        escala_tlp: "",
        escala_eespr: "",
        notas_escalas: ""
    };
}

function calculateAge(birthDate) {
    if (!birthDate) return "—";
    const date = new Date(birthDate);
    if (Number.isNaN(date.getTime())) return "—";
    const diff = Date.now() - date.getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
}

export default function Prescriptions() {
    const { success, error, info } = useToast() || {}; 
    const { role, user } = useOutletContext() ?? {};
    const navigate = useNavigate();
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const initialPatientId = searchParams.get("patientId")?.trim() || "";
        
    const [selectedPatientId, setSelectedPatientId] = useState(initialPatientId);
    const [patient, setPatient] = useState(null); 
    const [patientError, setPatientError] = useState("");
    const [patientLoading, setPatientLoading] = useState(false);
    
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    
    const [form, setForm] = useState(() => buildInitialForm(initialPatientId));
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState("");
    const [successRecord, setSuccessRecord] = useState(null);
    const [pdfLoading, setPdfLoading] = useState(false);

    const [activeTab, setActiveTab] = useState("nosologico");

    // Definición del menú 
    const menuItems = [
        { id: "nosologico", label: "Nosológico" },
        { id: "estrategico", label: "Estratégico"},
        { id: "sesion", label: "Sesión / PX" },
        { id: "escalas", label: "Escalas"},
    ];

    const [prescriptionsList, setPrescriptionsList] = useState([]);
    const [prescriptionsLoading, setPrescriptionsLoading] = useState(false);

    const isAssistant = role === ROLES.ASSISTANT;
    const isFormDisabled = isAssistant || !patient || Boolean(patientError);

    const handleFormChange = (e) => {
        if (e && e.target) {
            const { name, value, type, checked } = e.target;
            setForm((prev) => ({ 
                ...prev, 
                [name]: type === 'checkbox' ? checked : value 
            }));
            if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }));
        } 
        else if (typeof e === 'object') {
            setForm((prev) => ({ ...prev, ...e }));
        }
        
        if (formError) setFormError("");
    };

    // Efecto para cargar paciente y recetas (se mantiene tu lógica original funcional)
    useEffect(() => {
        if (!selectedPatientId) {
            setPatient(null);
            setPatientError("");
            return;
        }
        setPatientLoading(true);
        patientsService.getPatient(selectedPatientId)
            .then(res => setPatient(res))
            .catch(err => setPatientError(err.message))
            .finally(() => setPatientLoading(false));
    }, [selectedPatientId]);

    // Búsqueda con debounce (tu lógica funcional)
    useEffect(() => {
        const timeout = setTimeout(() => {
            if (searchQuery.trim()) {
                setSearchLoading(true);
                patientsService.listPatients({ q: searchQuery.trim(), professionalId: user?.id })
                    .then(res => setSearchResults(res.items || []))
                    .finally(() => setSearchLoading(false));
            }
        }, SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(timeout);
    }, [searchQuery, user?.id]);

    const selectPatient = (candidate) => {
        navigate(`${ROUTES.prescriptions}?patientId=${candidate.id}`);
        setSelectedPatientId(candidate.id);
        setSearchResults([]);
    };

    const clearSelection = () => {
        navigate(ROUTES.prescriptions);
        setSelectedPatientId("");
        setPatient(null);
    };

const handleSubmit = async (event) => {
    event.preventDefault();
    

    // 1. Validaciones mínimas obligatorias antes de procesar
    if (!form.motivoConsulta || !selectedPatientId) {
        error("El motivo de consulta y la selección del paciente son obligatorios.");
        return;
    }

    setSubmitting(true);
    setFormError("");

    try {
        // 2. Empaquetar las 20 Prescripciones dinámicas en el objeto px_data
        const pxData = {};
        for (let i = 1; i <= 20; i++) {
            if (form[`px${i}_text`] || form[`px${i}_tipo`]) {
                pxData[`px${i}`] = {
                    text: form[`px${i}_text`] || "",
                    tipo: form[`px${i}_tipo`] || "",
                    oss: !!form[`px${i}_oss`],
                    add: !!form[`px${i}_add`],
                    rss: !!form[`px${i}_rss`],
                };
            }
        }

        // 3. Construcción del Payload Final
        const payload = {
            // Datos de Identificación
            patientRecordId: selectedPatientId,

            // --- Módulo Nosológico ---
            motivoConsulta: form.motivoConsulta,
            dx_dsmvtr: form.dx_dsmvtr,
            dx_cie11: form.dx_cie11,
            dx_primeraAparicion: form.dx_primeraAparicion,
            dx_evolucion: form.dx_evolucion,
            dx_precipitantes: form.dx_precipitantes,
            dx_dif: form.dx_dif,
            dx_comorbilidad: form.dx_comorbilidad,
            pronostico: form.pronostico,
            pronostico_favorables: form.pronostico_favorables,
            pronostico_desfavorables: form.pronostico_desfavorables,
            hasFarmacos: !!form.hasFarmacos,
            farmacos_lista: form.farmacos_lista,
            planTratamiento: form.planTratamiento,

            // --- Módulo Estratégico ---
            trastorno: form.trastorno,
            dx_op: form.dx_op,
            dimensiones_spr: form.dimensiones_spr,
            val_yo: form.val_yo,
            val_demas: form.val_demas,
            val_mundo: form.val_mundo,

            // --- Registro de Sesión 
            sesionNumero: parseInt(form.sesionNumero) || 1,
            sesionFecha: form.sesionFecha ? new Date(form.sesionFecha).toISOString() : new Date().toISOString(),
            sesionFase: form.sesionFase,
            cambio_criterio: form.cambio_criterio,
            notas_reestructuracion: form.notas_reestructuracion,
            
            // Aquí inyectamos el JSON de las 20 PX
            px_data: pxData,

            escala_beck_dep: form.escala_beck_dep ? parseFloat(form.escala_beck_dep) : null,
            escala_beck_ans: form.escala_beck_ans ? parseFloat(form.escala_beck_ans) : null,
            escala_pdss: form.escala_pdss ? parseFloat(form.escala_pdss) : null,
            escala_ybocs: form.escala_ybocs ? parseFloat(form.escala_ybocs) : null,
            escala_tlp: form.escala_tlp ? parseFloat(form.escala_tlp) : null,
            escala_eespr: form.escala_eespr ? parseFloat(form.escala_eespr) : null,
            notas_escalas: form.notas_escalas
        };

        const record = await prescriptionsService.create(payload);
        
        setSuccessRecord(record);
        setPrescriptionsList((prev) => [record, ...prev]); 
        success(`Registro guardado exitosamente con folio ${record.folio}`);

    } catch (err) {
        console.error("Submit Error:", err);
        setFormError(err?.message || "Error al procesar el registro.");
        error(err?.message || "Ocurrió un error inesperado.");
    } finally {
        setSubmitting(false);
    }
};

    return (
        <section className="page stack-5">
            <header className="page__header">
                <h1>Prescripciones y Registro Clínico</h1>
            </header>

            {/* Búsqueda y Detalle de Paciente (Se mantienen igual para no romper tu flujo) */}
            {!selectedPatientId ? (
                <Card>
                    <CardBody>
                        <InputField label="Buscar paciente" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                       
                        {searchResults.map(p => (
                            <Button key={p.id} onClick={() => selectPatient(p)}>{p.firstName} {p.lastName}</Button>
                        ))}
                    </CardBody>
                </Card>
            ) : (
                <Card>
                    <CardHeader className="cluster justify-between">
                        <h3>Paciente: {patient?.firstName} {patient?.lastName}</h3>
                        <h3>Fecha de Nacimiento: {patient?.birthDate}</h3>
                        <h3>Curp: {patient?.curp}</h3>
                        <h3>Teléfono: {patient?.phone}</h3>
                        <Button variant="ghost" onClick={clearSelection}>Cambiar</Button>
                    </CardHeader>
                </Card>
            )}

            {/* --- SECCIONES DEL FORMULARIO INTEGRAL --- */}
            {selectedPatientId && patient && (
                <div className="stack-4">
                    
                    {/* Menú de Navegación Estilo Tabs */}
                    <nav className="tabs-container">
                        <div className="cluster gap-2 bg-light p-1 rounded shadow-sm">
                            {menuItems.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => setActiveTab(item.id)}
                                    className={`btn-tab ${activeTab === item.id ? 'active' : ''}`}
                                >
                                    {item.icon ? <span className="tab-icon">{item.icon}</span> : null}
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </nav>

                    <form className="stack-4" onSubmit={handleSubmit}>
                        
                        {/* Contenedor de Secciones con Renderizado Condicional */}
                        <div className="tab-content">
                            {activeTab === "nosologico" && (
                                <Card><CardBody>
                                    <DiagnosticNosologico form={form} onChange={handleFormChange} />
                                </CardBody></Card>
                            )}

                            {activeTab === "estrategico" && (
                                <Card><CardBody>
                                    <DiagnosticEstrategico form={form} onChange={handleFormChange} />
                                </CardBody></Card>
                            )}

                            {activeTab === "sesion" && (
                                <Card><CardBody>
                                    <SessionDetails form={form} onChange={handleFormChange} />
                                </CardBody></Card>
                            )}

                            {activeTab === "escalas" && (
                                <Card><CardBody>
                                    <ClinicalScales form={form} onChange={handleFormChange} />
                                </CardBody></Card>
                            )}
                        </div>

                        {/* Botón de Guardar Permanente */}
                        <div className="form-grid__actions sticky-bottom py-3 bg-white border-top">
                            <div className="cluster justify-between align-center mb-2">
                                <p className="text-sm text-muted">
                                    Editando: <strong>{menuItems.find(i => i.id === activeTab).label}</strong>
                                </p>
                                <div className="cluster gap-2">
                                    <ButtonPrimary type="submit" loading={submitting}>
                                        Guardar Registro Completo
                                    </ButtonPrimary>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            )}
        </section>
    );
}
