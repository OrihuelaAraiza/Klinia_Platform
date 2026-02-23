import { useEffect, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { 
    Download, 
    Printer, 
    ArrowLeft, 
    Activity, 
    Brain, 
    Target, 
    User, 
    ClipboardCheck,
    Calendar
} from "lucide-react";
import ButtonPrimary from "../components/ButtonPrimary";
import Button from "../components/UI/Button";
import Card, { CardBody, CardHeader } from "../components/UI/Card";
import Badge from "../components/UI/Badge";
import { useToast } from "../components/UI/Toast";
import * as prescriptionsService from "../services/prescriptionsService";
import auditService from "../services/auditService";
import { formatDateISOToHuman } from "../utils/formatters";
import { ROLES, ROUTES } from "../utils/constants";

// --- HELPERS ---

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

const parseJson = (data) => {
    if (!data) return null;
    if (typeof data === 'object') return data;
    try { return JSON.parse(data); } catch { return null; }
};

function statusVariant(status) {
    return status === "SUSPENDIDA" ? "danger" : "success"; 
}

// --- COMPONENTE PRINCIPAL ---

export default function PrescriptionDetail() {
    const { id } = useParams();
    const { role } = useOutletContext() ?? {};
    const { error, success } = useToast() || {}; 
    
    const [prescription, setPrescription] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        let active = true;
        setLoading(true);
        prescriptionsService.getOne(id)
            .then((record) => { if (active) setPrescription(record); })
            .catch((err) => { if (active) error(err?.message || "Error al cargar el registro."); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [id, error]);

    if (loading) return (
        <section className="page flex-center">
            <div className="loader-clinical">Cargando expediente...</div>
        </section>
    );

    if (!prescription) return (
        <section className="page flex-center">
            <Card><CardBody>No se encontró el registro clínico solicitado.</CardBody></Card>
        </section>
    );

    const { nosologico, estrategico, sessionDetail, clinimetria, patientRecord, therapist } = prescription;

    // Parseo de campos estratégicos y PX
    const dimSpr = parseJson(estrategico?.dimensiones_spr) || [];
    const dimDetalles = parseJson(estrategico?.dimensiones_detalles) || {};
    const valYo = parseJson(estrategico?.val_yo) || [];
    const valYoDetalles = parseJson(estrategico?.val_yo_detalles) || {};
    const valDemas = parseJson(estrategico?.val_demas) || [];
    const valDemasDetalles = parseJson(estrategico?.val_demas_detalles) || {};
    const valMundo = parseJson(estrategico?.val_mundo) || [];
    const valMundoDetalles = parseJson(estrategico?.val_mundo_detalles) || {};
    const pxList = parseJson(sessionDetail?.px_data) || {};

    return (
        <section className="page stack-6">
            {/* CABECERA CON DATOS DEL PACIENTE SELECCIONADO */}
            <header className="page__header no-print">
                <div className="cluster justify-between align-end wrap gap-4">
                    <div className="stack-1">
                        <div className="cluster gap-2 align-center">
                            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
                                <ArrowLeft size={18} />
                            </Button>
                            <Badge variant="outline">Expediente Clínico Digital</Badge>
                        </div>
                        <h1 className="text-h2">Folio {prescription.folio}</h1>
                    </div>
                    
                    <div className="patient-quick-info bg-white p-3 rounded border shadow-sm cluster gap-4">
                        <div className="avatar-placeholder avatar-placeholder--sm bg-primary-light text-primary">
                            <User size={20} />
                        </div>
                        <div>
                            <p className="bold m-0 text-lg">{patientRecord?.firstName} {patientRecord?.lastName}</p>
                            <p className="text-xs text-muted m-0">
                                {formatAge(patientRecord?.birthDate)} • {patientRecord?.gender || 'N/A'} • CURP: {patientRecord?.curp || 'N/A'}
                            </p>
                        </div>
                        <div className="border-left pl-4">
                            <p className="text-xs text-muted m-0 uppercase bold">Estatus</p>
                            <Badge variant={statusVariant(prescription.status)} size="sm">
                                {prescription.status}
                            </Badge>
                        </div>
                        <div className="no-print border-left pl-4">
                            <Button size="sm" onClick={() => window.print()}><Printer size={16} /></Button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="grid-detail-layout">
                <div className="stack-5">
                    
                    {/* --- VALORACIÓN ESTRATÉGICA --- */}
                    <Card className="border-top-primary">
                        <CardHeader className="cluster gap-2">
                            <Brain size={20} className="text-primary" /> 
                            <h3>Módulo Estratégico y Valoración SPR</h3>
                        </CardHeader>
                        <CardBody className="stack-4">
                            <div className="grid-2 gap-4">
                                <div className="p-2 bg-light rounded">
                                    <label className="bold text-xs uppercase text-muted">Trastorno / Etiqueta</label>
                                    <p className="m-0">{estrategico?.trastorno || "—"}</p>
                                </div>
                                <div className="p-2 bg-light rounded">
                                    <label className="bold text-xs uppercase text-muted">Diagnóstico Operativo (SPR)</label>
                                    <p className="m-0">{estrategico?.dx_op || "—"}</p>
                                </div>
                            </div>

                            <hr />

                            <div>
                                <h4 className="text-sm uppercase mb-3 text-primary bold">Dimensiones SPR y Observaciones</h4>
                                <div className="stack-2">
                                    {dimSpr.length > 0 ? dimSpr.map(id => (
                                        <div key={id} className="p-3 bg-white rounded border-left border-primary shadow-sm">
                                            <span className="bold text-primary">{id}:</span> 
                                            <p className="m-0 mt-1 text-sm">{dimDetalles[id] || "Sin observaciones adicionales."}</p>
                                        </div>
                                    )) : <p className="text-muted italic">No se registraron dimensiones SPR en este folio.</p>}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-sm uppercase mb-3 text-primary bold">Valoración Global Inicial (VGI)</h4>
                                <div className="grid-3 gap-4">
                                    <div className="vgi-box p-3 bg-light rounded border">
                                        <h5 className="text-xs bold uppercase border-bottom pb-1 mb-2">El Yo</h5>
                                        {valYo.length > 0 ? valYo.map(id => (
                                            <div key={id} className="mb-2">
                                                <p className="text-sm bold m-0">• {id}</p>
                                                <p className="text-xs text-muted m-0">{valYoDetalles[id]}</p>
                                            </div>
                                        )) : <p className="text-xs text-muted">Sin hallazgos.</p>}
                                    </div>
                                    <div className="vgi-box p-3 bg-light rounded border">
                                        <h5 className="text-xs bold uppercase border-bottom pb-1 mb-2">Los Demás</h5>
                                        {valDemas.length > 0 ? valDemas.map(id => (
                                            <div key={id} className="mb-2">
                                                <p className="text-sm bold m-0">• {id}</p>
                                                <p className="text-xs text-muted m-0">{valDemasDetalles[id]}</p>
                                            </div>
                                        )) : <p className="text-xs text-muted">Sin hallazgos.</p>}
                                    </div>
                                    <div className="vgi-box p-3 bg-light rounded border">
                                        <h5 className="text-xs bold uppercase border-bottom pb-1 mb-2">Mundo / Sociedad</h5>
                                        {valMundo.length > 0 ? valMundo.map(id => (
                                            <div key={id} className="mb-2">
                                                <p className="text-sm bold m-0">• {id}</p>
                                                <p className="text-xs text-muted m-0">{valMundoDetalles[id]}</p>
                                            </div>
                                        )) : <p className="text-xs text-muted">Sin hallazgos.</p>}
                                    </div>
                                </div>
                            </div>
                        </CardBody>
                    </Card>

                    {/* --- OBJETIVOS Y PLAN --- */}
                    <Card>
                        <CardHeader className="cluster gap-2">
                            <Target size={20} className="text-success" /> 
                            <h3>Acuerdos y Objetivos Terapéuticos</h3>
                        </CardHeader>
                        <CardBody className="grid-2 gap-6">
                            <div className="p-4 bg-light rounded border-dashed border-2">
                                <label className="bold text-xs uppercase text-muted mb-2 block">Objetivo del Paciente</label>
                                <p className="m-0 italic">"{estrategico?.obj_paciente || "No definido por el paciente."}"</p>
                            </div>
                            <div className="p-4 bg-light rounded border-dashed border-2">
                                <label className="bold text-xs uppercase text-muted mb-2 block">Objetivo del Terapeuta</label>
                                <p className="m-0 italic">"{estrategico?.obj_terapeuta || "No definido por el terapeuta."}"</p>
                            </div>
                        </CardBody>
                    </Card>

                    {/* --- DETALLE DE SESIÓN Y PX --- */}
                    <Card>
                        <CardHeader className="cluster gap-2">
                            <ClipboardCheck size={20} className="text-warning" /> 
                            <h3>Intervención y Tareas (Sesión #{sessionDetail?.sesionNumero})</h3>
                        </CardHeader>
                        <CardBody className="stack-4">
                            <div className="grid-3 gap-4 bg-dark text-white p-4 rounded shadow-lg">
                                <div><label className="text-xs uppercase opacity-70">Fase Actual</label><p className="bold m-0">{sessionDetail?.sesionFase || "No especificada"}</p></div>
                                <div><label className="text-xs uppercase opacity-70">Fecha de Consulta</label><p className="bold m-0">{formatDateISOToHuman(sessionDetail?.sesionFecha)}</p></div>
                                <div><label className="text-xs uppercase opacity-70">Criterio de Cambio</label><p className="bold m-0">{sessionDetail?.cambio_criterio || "N/A"}</p></div>
                            </div>
                            
                            <div className="mt-4">
                                <h4 className="bold text-md mb-3">Prescripciones y Tareas Asignadas (PX)</h4>
                                <div className="table-wrapper border rounded">
                                    <table className="table table--compact">
                                        <thead className="bg-light">
                                            <tr>
                                                <th>Tipo</th>
                                                <th>Tarea / Indicación</th>
                                                <th className="text-center">OSS</th>
                                                <th className="text-center">ADD</th>
                                                <th className="text-center">RSS</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Object.keys(pxList).length > 0 ? Object.values(pxList).map((px, idx) => (
                                                <tr key={idx}>
                                                    <td><Badge variant="ghost" size="sm">{px.tipo}</Badge></td>
                                                    <td className="text-sm">{px.text}</td>
                                                    <td className="text-center">{px.oss ? "✅" : "—"}</td>
                                                    <td className="text-center">{px.add ? "✅" : "—"}</td>
                                                    <td className="text-center">{px.rss ? "✅" : "—"}</td>
                                                </tr>
                                            )) : (
                                                <tr><td colSpan="5" className="text-center py-4 text-muted italic">No se emitieron prescripciones en esta sesión.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                </div>

                <aside className="stack-5">
                    {/* --- CLINIMETRÍA --- */}
                    <Card className="sticky-top">
                        <CardHeader className="cluster gap-2"><Activity size={18} /> <h3>Clinimetría</h3></CardHeader>
                        <CardBody className="stack-2">
                            {[
                                { label: "Beck Depresión", val: clinimetria?.escala_beck_dep },
                                { label: "Beck Ansiedad", val: clinimetria?.escala_beck_ans },
                                { label: "PDSS", val: clinimetria?.escala_pdss },
                                { label: "Yale-Brown", val: clinimetria?.escala_ybocs },
                                { label: "TLP (DIB-R)", val: clinimetria?.escala_tlp },
                                { label: "Estratégica (EESPR)", val: clinimetria?.escala_eespr, primary: true }
                            ].map((s, i) => (
                                <div key={i} className={`stat-card p-3 border rounded cluster justify-between ${s.primary ? 'border-primary bg-primary-light' : ''}`}>
                                    <span className="text-xs bold uppercase">{s.label}</span>
                                    <span className={`text-xl bold ${s.primary ? 'text-primary' : ''}`}>{s.val ?? "—"}</span>
                                </div>
                            ))}
                        </CardBody>
                    </Card>

                    {/* --- NOSOLÓGICO RÁPIDO --- */}
                    <Card>
                        <CardHeader><h3>Resumen Nosológico</h3></CardHeader>
                        <CardBody className="stack-3 text-sm">
                            <div><label className="bold block text-xs text-muted">MOTIVO DE CONSULTA</label><p className="mt-1">{nosologico?.motivoConsulta}</p></div>
                            <hr />
                            <p><strong>CIE-11:</strong> {nosologico?.dx_cie11 || "—"}</p>
                            <p><strong>Evolución:</strong> {nosologico?.dx_evolucion || "—"}</p>
                            <p><strong>Pronóstico:</strong> <Badge variant="ghost">{nosologico?.pronostico || "Reservado"}</Badge></p>
                        </CardBody>
                    </Card>
                </aside>
            </div>

            <footer className="cluster justify-center py-8 no-print border-top">
                <Button onClick={() => window.print()}><Printer className="mr-2" /> Imprimir Expediente</Button>
                <ButtonPrimary onClick={() => success("Iniciando descarga de PDF legal...")}>
                    <Download className="mr-2" /> Descargar PDF Firmado
                </ButtonPrimary>
            </footer>
        </section>
    );
}