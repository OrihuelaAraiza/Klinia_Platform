import { useEffect, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import Card, { CardBody, CardHeader } from "../components/UI/Card";
import Button from "../components/UI/Button";
import Badge from "../components/UI/Badge";
import { useToast } from "../components/UI/Toast";
import { CONSENT_TYPES, ROLES, ROUTES } from "../utils/constants";
import { formatDateISOToHuman } from "../utils/formatters";
import * as ordersService from "../services/ordersService";
import * as patientsService from "../services/patientsService";

// Datos MOCK de Consentimientos (usaremos estos hasta tener el modelo Consent)
const CONSENTS = [
    { type: CONSENT_TYPES.ATTENTION, label: "Consentimiento de atención", status: "signed", signedAt: "2024-05-02T10:24:00", professional: "Dra. Sofía Méndez" },
    { type: CONSENT_TYPES.RECORDING, label: "Grabación y transcripción", status: "pending", signedAt: null, professional: "" },
    { type: CONSENT_TYPES.AI_USE, label: "Uso de IA asistida", status: "signed", signedAt: "2024-04-15T09:00:00", professional: "Dra. Sofía Méndez" },
];

const STATUS_LABELS = {
    signed: "Firmado",
    pending: "Pendiente",
    revoked: "Revocado",
    vigente: "Vigente",
    cancelada: "Cancelada",
};

function statusVariant(status) {
    if (status === "signed" || status === "vigente") return "success";
    if (status === "pending") return "warning";
    if (status === "revoked" || status === "cancelada") return "danger";
    return "neutral";
}

export default function PatientDocuments() {
    // 🚨 Asumiendo que esta vista ahora está en /patients/:patientId/documents (o similar)
    const { id: patientId } = useParams(); 
    const { role, user } = useOutletContext() ?? {};
    const navigate = useNavigate();
    const { error } = useToast() || {}; 
    
    const [patient, setPatient] = useState(null);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorState, setErrorState] = useState("");

    // --- EFECTO DE CARGA DE DATOS ---
    useEffect(() => {
        let active = true;
        setLoading(true);
        setErrorState("");

        async function load() {
            try {
                // 1. Cargar datos del paciente (para el nombre/metadatos)
                const patientData = await patientsService.getPatient(patientId);
                
                // 2. Cargar la lista de Órdenes
                const ordersList = await ordersService.listByPatient(patientId);
                
                if (!active) return;
                
                setPatient(patientData);
                setOrders(ordersList);
                
            } catch (err) {
                if (!active) return;
                const message = err?.message || "No pudimos cargar los documentos.";
                setErrorState(message);
                error(message);
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        if (patientId) {
             load();
        } else {
             setLoading(false);
        }

        return () => {
            active = false;
        };
    }, [patientId, error]);


    if (loading) {
        return <section className="page"><Card hoverable={false}><CardBody><p>Cargando documentos y órdenes…</p></CardBody></Card></section>;
    }

    if (errorState) {
        return (
            <section className="page">
                <Card hoverable={false}>
                    <CardBody className="stack-2">
                        <p className="form-error" role="alert">{errorState}</p>
                        <Button onClick={() => navigate(-1)}>Volver</Button>
                    </CardBody>
                </Card>
            </section>
        );
    }
    
    const patientName = patient ? `${patient.firstName} ${patient.lastName}`.trim() : "Paciente";
    const isAssistant = role === ROLES.ASSISTANT;

    return (
        <section className="page stack-5">
            <header className="page__header">
                <h1>Documentación y Órdenes</h1>
                <p className="helper-text">
                    {patientName} • CURP {patient?.curp ?? "-"}
                </p>
            </header>
            
            {/* --- SECCIÓN 1: CONSENTIMIENTOS --- */}
            <Card hoverable={false}>
                <CardHeader>
                    <h2>Consentimientos ({CONSENTS.length})</h2>
                </CardHeader>
                <CardBody>
                    <div className="consent-list">
                        {CONSENTS.map((consent) => {
                            const isSigned = consent.status === "signed";
                            return (
                                <article key={consent.type} className="consent-card">
                                    <label className="consent-card__body">
                                        <input type="checkbox" checked={isSigned} readOnly aria-label={consent.label} />
                                        <div>
                                            <h2 className="consent-card__title">{consent.label}</h2>
                                            <p className="consent-card__status">
                                                Estado: <Badge variant={statusVariant(consent.status)}>{STATUS_LABELS[consent.status]}</Badge>
                                            </p>
                                        </div>
                                    </label>
                                </article>
                            );
                        })}
                    </div>
                </CardBody>
            </Card>


            {/* --- SECCIÓN 2: ÓRDENES CLÍNICAS --- */}
            <Card hoverable={false}>
                <CardHeader className="cluster justify-between">
                    <h2>Órdenes Médicas / Interconsulta ({orders.length})</h2>
                    {!isAssistant && (
                        <Button 
                            onClick={() => navigate(ROUTES.orderNew.replace(":patientId", patientId))}
                        >
                            Crear nueva orden
                        </Button>
                    )}
                </CardHeader>
                <CardBody>
                    {orders.length === 0 ? (
                        <p className="helper-text">No hay órdenes clínicas registradas para este paciente.</p>
                    ) : (
                        <div className="table-wrapper">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Folio</th>
                                        <th>Tipo</th>
                                        <th>Descripción</th>
                                        <th>Estado</th>
                                        <th>Fecha</th>
                                        <th className="table__actions">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.map((order) => (
                                        <tr key={order.id}>
                                            <td>{order.folio}</td>
                                            <td>{order.tipo}</td>
                                            <td>{order.descripcion.substring(0, 50)}...</td>
                                            <td>
                                                <Badge variant={statusVariant(order.status)}>
                                                    {STATUS_LABELS[order.status] || order.status}
                                                </Badge>
                                            </td>
                                            <td>{formatDateISOToHuman(order.createdAt)}</td>
                                            <td>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => navigate(ROUTES.orderDetail
                                                        .replace(":patientId", patientId)
                                                        .replace(":orderId", order.id)
                                                    )}
                                                >
                                                    Ver detalle
                                                </Button>
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

