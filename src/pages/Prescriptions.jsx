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
import uploadService from "../services/uploadService";

// IMPORTA TUS SECCIONES AQUÍ
import DiagnosticNosologico from "../components/Sections/DiagnosticoNosologico";
import DiagnosticEstrategico from "../components/Sections/DiagnosticoEstrategico";
import SessionDetails from "../components/Sections/SessionDetails";
import ClinicalScales from "../components/Sections/ClinicalScales";

const REQUIRED_FIELDS = new Set(["substance", "dose", "frequency", "duration"]);
const DEFAULT_PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 400; 
const CLINICAL_TABS = ["nosologico", "estrategico", "sesion", "escalas"];

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
        dx_op: "",                  
        dimensiones_spr: [],        
        dimensiones_detalles: {},   // <--- NUEVO: Detalles dinámicos
        val_yo: [],                 
        val_yo_detalles: {},        // <--- NUEVO
        val_demas: [],              
        val_demas_detalles: {},     // <--- NUEVO
        val_mundo: [],              
        val_mundo_detalles: {},     // <--- NUEVO
        obj_paciente: "",
        obj_terapeuta: "",

        // --- 3. Registro de Sesión
        sesionNumero: 1,
        sesionFecha: new Date().toISOString().split('T')[0], 
        sesionFase: "",
        cambio_criterio: "",
        notas_reestructuracion: "",
        // Inputs para las 20 PX iniciales (se manejan dinámicamente en el componente hijo)
        
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

export default function Prescriptions() {
    const { success, error, info } = useToast() || {}; 
    const { role, user } = useOutletContext() ?? {};
    const professionalId = user?.therapistId || user?.id || "";
    const shouldFilterByProfessional = role === ROLES.PROFESSIONAL || role === ROLES.ASSISTANT;
    const navigate = useNavigate();
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const initialPatientId = searchParams.get("patientId")?.trim() || "";
    const initialTab = CLINICAL_TABS.includes(searchParams.get("tab"))
      ? searchParams.get("tab")
      : "nosologico";
        
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
    const [activeTab, setActiveTab] = useState(initialTab);
    const [scalesAttachments, setScalesAttachments] = useState([]);
    const [scalesUploadLoading, setScalesUploadLoading] = useState(false);
    const [scalesUploadError, setScalesUploadError] = useState("");

    const menuItems = [
        { id: "nosologico", label: "Nosológico" },
        { id: "estrategico", label: "Estratégico"},
        { id: "sesion", label: "Sesión / PX" },
        { id: "escalas", label: "Escalas"},
    ];

    const [prescriptionsList, setPrescriptionsList] = useState([]);

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

    // Carga de datos del paciente
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

    const loadSearchResults = useCallback(async (rawQuery = "") => {
        setSearchLoading(true);
        try {
            const response = await patientsService.listPatients({
                q: rawQuery.trim(),
                size: 100,
                ...(shouldFilterByProfessional && professionalId ? { professionalId } : {}),
            });
            const items = Array.isArray(response?.items) ? response.items : response;
            setSearchResults(items || []);
        } catch (err) {
            setSearchResults([]);
            error(err?.message || "No pudimos cargar pacientes.");
        } finally {
            setSearchLoading(false);
        }
    }, [professionalId, shouldFilterByProfessional, error]);

    // Cargar pacientes y filtrar conforme se escribe
    useEffect(() => {
        const trimmed = searchQuery.trim();
        if (!trimmed) {
            loadSearchResults("");
            return;
        }
        const timeout = setTimeout(() => {
            loadSearchResults(trimmed);
        }, SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(timeout);
    }, [searchQuery, loadSearchResults]);

    const selectPatient = (candidate) => {
        navigate(`${ROUTES.prescriptions}?patientId=${candidate.id}&tab=${activeTab}`);
        setSelectedPatientId(candidate.id);
        setSearchResults([]);
        setForm(prev => ({ ...prev, patientRecordId: candidate.id }));
    };

    const clearSelection = () => {
        navigate(`${ROUTES.prescriptions}?tab=${activeTab}`);
        setSelectedPatientId("");
        setPatient(null);
        setForm(buildInitialForm(""));
        setScalesAttachments([]);
        setScalesUploadError("");
    };

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const nextTab = params.get("tab");
        if (nextTab && CLINICAL_TABS.includes(nextTab) && nextTab !== activeTab) {
            setActiveTab(nextTab);
        }
    }, [location.search, activeTab]);

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        const params = new URLSearchParams(location.search);
        if (selectedPatientId) {
            params.set("patientId", selectedPatientId);
        } else {
            params.delete("patientId");
        }
        params.set("tab", tabId);
        navigate(`${ROUTES.prescriptions}?${params.toString()}`, { replace: true });
    };

    const handleScalesUpload = async (files) => {
        if (!selectedPatientId || files.length === 0) return;

        setScalesUploadLoading(true);
        setScalesUploadError("");
        try {
            const uploaded = [];
            for (const file of files) {
                const response = await uploadService.uploadDocument(file, {
                    module: "clinical_scales",
                    patientId: selectedPatientId,
                });
                const uploadId = response?.id || response?.data?.id || crypto.randomUUID();
                uploaded.push({
                    id: uploadId,
                    name: file.name,
                    size: file.size,
                });
            }
            setScalesAttachments((prev) => [...prev, ...uploaded]);
            success("Archivo(s) de escalas cargado(s) correctamente.");
        } catch (err) {
            const message = err?.message || "No se pudieron subir los archivos de escalas.";
            setScalesUploadError(message);
            error(message);
        } finally {
            setScalesUploadLoading(false);
        }
    };

    const handleRemoveScaleFile = (fileId) => {
        setScalesAttachments((prev) => prev.filter((file) => file.id !== fileId));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!form.motivoConsulta || !selectedPatientId) {
            error("El motivo de consulta y la selección del paciente son obligatorios.");
            return;
        }

        setSubmitting(true);
        setFormError("");

        try {
            // 1. Procesar las 20 PX dinámicas
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

            // 2. Construir Payload Final combinando el form y los detalles dinámicos
            const payload = {
                ...form,
                patientRecordId: selectedPatientId,
                px_data: pxData,
                // Conversión de tipos para el Backend/Prisma
                sesionNumero: parseInt(form.sesionNumero) || 1,
                sesionFecha: form.sesionFecha ? new Date(form.sesionFecha).toISOString() : new Date().toISOString(),
                escala_beck_dep: form.escala_beck_dep ? parseFloat(form.escala_beck_dep) : null,
                escala_beck_ans: form.escala_beck_ans ? parseFloat(form.escala_beck_ans) : null,
                escala_pdss: form.escala_pdss ? parseFloat(form.escala_pdss) : null,
                escala_ybocs: form.escala_ybocs ? parseFloat(form.escala_ybocs) : null,
                escala_tlp: form.escala_tlp ? parseFloat(form.escala_tlp) : null,
                escala_eespr: form.escala_eespr ? parseFloat(form.escala_eespr) : null,
            };

            const record = await prescriptionsService.create(payload);
            
            setSuccessRecord(record);
            success(`Registro guardado exitosamente. Folio: ${record.folio}`);
            auditService.logAudit("clinical_record_created", { patientId: selectedPatientId, folio: record.folio });

        } catch (err) {
            const msg = err.response?.data?.message || err.message || "Error al procesar el registro.";
            setFormError(msg);
            error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <section className="page stack-5">
            <header className="page__header">
                <h1>Prescripciones y Registro Clínico</h1>
                <Button variant="secondary" onClick={() => navigate(selectedPatientId ? `/patients/${selectedPatientId}` : ROUTES.patients)}>
                    Regresar
                </Button>
            </header>

            {!selectedPatientId ? (
                <Card>
                    <CardBody className="stack-3">
                        <InputField 
                            label="Buscar paciente para iniciar registro" 
                            placeholder="Nombre, apellido o CURP..."
                            value={searchQuery} 
                            onChange={(e) => setSearchQuery(e.target.value)} 
                        />
                        {searchLoading && <SkeletonList items={3} />}
                        <div className="grid-3 gap-2">
                            {searchResults.map(p => (
                                <Button key={p.id} variant="secondary" onClick={() => selectPatient(p)}>
                                    <User size={16} className="mr-2" /> {p.firstName} {p.lastName}
                                </Button>
                            ))}
                        </div>
                    </CardBody>
                </Card>
            ) : (
                <Card className="bg-primary-light border-primary">
                    <CardHeader className="cluster justify-between align-center">
                        <div className="cluster gap-4">
                            <div className="avatar-placeholder"><User /></div>
                            <div>
                                <h3 className="m-0">{patient?.firstName} {patient?.lastName}</h3>
                                <p className="text-sm m-0">CURP: {patient?.curp || 'No registrada'}</p>
                            </div>
                        </div>
                        <div className="cluster gap-2">
                {/* NUEVO BOTÓN: Ver Historial / Recetas del paciente */}
                    <Button
                        variant="secondary"
                        onClick={() => navigate(`/patients/${selectedPatientId}`)}
                    >
                        Volver al perfil
                    </Button>
                    <Button 
                        variant="secondary" 
                        onClick={() => navigate(`/prescriptions/${selectedPatientId}`)} 
                    >
                        <FileText size={16} className="mr-2" /> Ver Detalle de Registro
                    </Button>
                
                <Button variant="ghost" onClick={clearSelection}>Cambiar Paciente</Button>
            </div>
                    </CardHeader>
                </Card>
            )}

            {selectedPatientId && patient && (
                <div className="stack-4">
                    <nav className="tabs-container sticky-top">
                        <div className="cluster gap-1 bg-white p-1 rounded border shadow-sm">
                            {menuItems.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => handleTabChange(item.id)}
                                    className={`btn-tab ${activeTab === item.id ? 'active' : ''}`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </nav>

                    <form onSubmit={handleSubmit} className="stack-4">
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
                                    <ClinicalScales
                                        form={form}
                                        onChange={handleFormChange}
                                        attachments={scalesAttachments}
                                        onUploadFiles={handleScalesUpload}
                                        onRemoveFile={handleRemoveScaleFile}
                                        uploadError={scalesUploadError}
                                        uploading={scalesUploadLoading}
                                    />
                                </CardBody></Card>
                            )}
                        </div>

                        <div className="cluster justify-end sticky-bottom py-4 bg-white border-top gap-3">
                            <p className="text-sm text-muted mr-auto">
                                Estás en el módulo: <strong>{activeTab.toUpperCase()}</strong>
                            </p>
                            <Button variant="ghost" type="button" onClick={() => navigate(ROUTES.dashboard)}>
                                Cancelar
                            </Button>
                            <Button
                                variant="secondary"
                                type="button"
                                onClick={() => navigate(`/patients/${selectedPatientId}`)}
                            >
                                Regresar al perfil
                            </Button>
                            <ButtonPrimary type="submit" loading={submitting}>
                                Finalizar y Guardar Registro
                            </ButtonPrimary>
                        </div>
                    </form>
                </div>
            )}
        </section>
    );
}
