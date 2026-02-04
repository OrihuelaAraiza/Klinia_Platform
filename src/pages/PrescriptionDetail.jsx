import { useEffect, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import ButtonPrimary from "../components/ButtonPrimary";
import Button from "../components/UI/Button";
import Card, { CardBody, CardHeader } from "../components/UI/Card";
import Badge from "../components/UI/Badge";
import { useToast } from "../components/UI/Toast";
import * as prescriptionsService from "../services/prescriptionsService";
import { downloadPrescriptionPdf } from "../utils/prescriptionPdf"; 
import auditService from "../services/auditService";
import { formatDateISOToHuman } from "../utils/formatters";
import { ROLES, ROUTES } from "../utils/constants";

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

function statusVariant(status) {
    return status === "SUSPENDIDA" ? "danger" : "success"; 
}

export default function PrescriptionDetail() {
    const { id } = useParams();
    const { role, user } = useOutletContext() ?? {};
    const { success, error } = useToast() || {}; 
    
    const [prescription, setPrescription] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorState, setErrorState] = useState(""); 
    const [pdfLoading, setPdfLoading] = useState(false);
    
    const navigate = useNavigate();
    const isAssistant = role === ROLES.ASSISTANT;

    useEffect(() => {
        let active = true;
        setLoading(true);
        prescriptionsService.getOne(id)
            .then((record) => {
                if (!active) return;
                setPrescription(record);
            })
            .catch((err) => {
                if (!active) return;
                setErrorState(err?.message || "Error al cargar.");
            })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [id]);

    if (loading) return <section className="page"><Card><CardBody>Cargando registro clínico...</CardBody></Card></section>;
    if (!prescription) return <section className="page"><Card><CardBody>No se encontró el registro.</CardBody></Card></section>;

    const { nosologico, estrategico, sessionDetail, clinimetria, patientRecord, therapist } = prescription;

    return (
        <section className="page stack-5">
            <header className="page__header cluster justify-between align-center wrap">
                <div>
                    <h1>Folio {prescription.folio}</h1>
                    <Badge variant={statusVariant(prescription.status)}>
                        {prescription.status === "SUSPENDIDA" ? "Suspendida" : "Vigente"}
                    </Badge>
                </div>
                <Button variant="ghost" onClick={() => navigate(ROUTES.prescriptions)}>Volver</Button>
            </header>

            <div className="grid-detail-clinical stack-4">
                {/* --- 1. DATOS GENERALES --- */}
                <Card hoverable={false}>
                    <CardHeader><h3>Información del Paciente y Profesional</h3></CardHeader>
                    <CardBody className="grid-2-cols">
                        <div className="stack-1">
                            <p><strong>Paciente:</strong> {patientRecord?.firstName} {patientRecord?.lastName}</p>
                            <p><strong>Edad:</strong> {formatAge(patientRecord?.birthDate)}</p>
                            <p><strong>CURP:</strong> {patientRecord?.curp}</p>
                        </div>
                        <div className="stack-1">
                            <p><strong>Terapeuta:</strong> {therapist?.name}</p>
                            <p><strong>Cédula:</strong> {therapist?.kycRecord?.certificateFolio || "N/A"}</p>
                        </div>
                    </CardBody>
                </Card>

                {/* --- 2. DIAGNÓSTICO NOSOLÓGICO --- */}
                <Card hoverable={false}>
                    <CardHeader><h3>Diagnóstico Nosológico</h3></CardHeader>
                    <CardBody className="stack-2">
                        <p><strong>Motivo de Consulta:</strong> {nosologico?.motivoConsulta}</p>
                        <div className="cluster gap-4">
                            <p><strong>DSM-V:</strong> {nosologico?.dx_dsmvtr || "—"}</p>
                            <p><strong>CIE-11:</strong> {nosologico?.dx_cie11 || "—"}</p>
                        </div>
                        <p><strong>Evolución:</strong> {nosologico?.dx_evolucion}</p>
                        <p><strong>Pronóstico:</strong> {nosologico?.pronostico}</p>
                    </CardBody>
                </Card>

                {/* --- 3. REGISTRO DE SESIÓN Y TAREAS (PX) --- */}
                <Card hoverable={false}>
                    <CardHeader><h3>Sesión #{sessionDetail?.sesionNumero}</h3></CardHeader>
                    <CardBody className="stack-3">
                        <p><strong>Fecha:</strong> {formatDateISOToHuman(sessionDetail?.sesionFecha)}</p>
                        <p><strong>Criterio de Cambio:</strong> {sessionDetail?.cambio_criterio}</p>
                        
                        <h4>Prescripciones / Tareas:</h4>
                        <div className="table-wrapper">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Tipo</th>
                                        <th>Indicación</th>
                                        <th>OSS</th>
                                        <th>ADD</th>
                                        <th>RSS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sessionDetail?.px_data && Object.values(sessionDetail.px_data).map((px, idx) => (
                                        <tr key={idx}>
                                            <td><Badge variant="ghost">{px.tipo}</Badge></td>
                                            <td>{px.text}</td>
                                            <td>{px.oss ? "SI" : "—"}</td>
                                            <td>{px.add ? "SI" : "—"}</td>
                                            <td>{px.rss ? "SI" : "—"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardBody>
                </Card>

                {/* --- 4. CLINIMETRÍA --- */}
                <Card hoverable={false}>
                    <CardHeader><h3>Resultados de Escalas</h3></CardHeader>
                    <CardBody>
                        <div className="cluster gap-4 wrap">
                            <div className="stat-box"><strong>Beck Depresión:</strong> {clinimetria?.escala_beck_dep ?? "—"}</div>
                            <div className="stat-box"><strong>Beck Ansiedad:</strong> {clinimetria?.escala_beck_ans ?? "—"}</div>
                            <div className="stat-box"><strong>Escala PDSS:</strong> {clinimetria?.escala_pdss ?? "—"}</div>
                            <div className="stat-box"><strong>Yale-Brown:</strong> {clinimetria?.escala_ybocs ?? "—"}</div>
                        </div>
                    </CardBody>
                </Card>
            </div>

            <footer className="cluster justify-center py-4">
                <ButtonPrimary onClick={() => window.print()}>Imprimir Reporte Completo</ButtonPrimary>
            </footer>
        </section>
    );
}