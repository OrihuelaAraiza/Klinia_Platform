import { useEffect, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import ButtonPrimary from "../components/ButtonPrimary";
import Button from "../components/UI/Button";
import Card, { CardBody, CardHeader } from "../components/UI/Card";
import Badge from "../components/UI/Badge";
import { useToast } from "../components/UI/Toast";
import * as ordersService from "../services/ordersService";
import { downloadOrderPdf } from "../utils/orderPdf";
import auditService from "../services/auditService";
import { formatDateISOToHuman } from "../utils/formatters";
import { ROLES, ROUTES } from "../utils/constants";
import * as patientsService from "../services/patientsService";

// Helper para formatear edad (se mantiene)
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
    return status === "cancelada" ? "danger" : "success";
}


export default function OrderDetail() {
    const { patientId, orderId } = useParams();
    const { role, user } = useOutletContext() ?? {};
    const [order, setOrder] = useState(null);
    const [patient, setPatient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorState, setErrorState] = useState("");
    const [pdfLoading, setPdfLoading] = useState(false);
    const [cancelling, setCancelling] = useState(false); 
    
    const { success, error } = useToast() || {};
    
    const navigate = useNavigate();
    const isAssistant = role === ROLES.ASSISTANT;

    useEffect(() => {
        let active = true;
        setLoading(true);
        setErrorState("");

        async function load() {
            try {
                // Asumo que getOne devuelve la orden y patientsService.getPatient el paciente.
                const [orderData, patientData] = await Promise.all([
                    ordersService.getOne(orderId),
                    patientsService.getPatient(patientId),
                ]);
                if (!active) return;
                setOrder(orderData);
                setPatient(patientData);
            } catch (err) {
                if (!active) return;
                setErrorState(err?.message || "No pudimos cargar la orden solicitada.");
                error(err?.message || "Error al cargar la orden.");
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        load();
        return () => {
            active = false;
        };
    }, [orderId, patientId, error]);

    // Handler para Cancelar la Orden
    const handleCancel = async () => {
        if (isAssistant || order?.status === "cancelada") return;
        
        setCancelling(true);
        try {
            const updated = await ordersService.cancel(orderId);
            setOrder(updated); 
            success("Orden cancelada exitosamente.");
            
            // Log de auditoría
            await auditService.logAudit("order_cancel", {
                 patientId: order.patientId,
                 orderId: order.id,
                 folio: order.folio,
            });
        } catch (err) {
            error(err?.message || "No se pudo cancelar la orden.");
        } finally {
            setCancelling(false);
        }
    };

    const handlePdf = async () => {
        if (!order || !patient) return;
        setPdfLoading(true);
        try {
            // Se asume que downloadOrderPdf maneja los objetos order, patient y user
            await downloadOrderPdf({
                order,
                patient,
                professional: user,
            });
            await auditService.logAudit("order_pdf_generated", {
                patientId: order.patientId,
                orderId: order.id,
                folio: order.folio,
            });
            success("PDF de orden generado.");
        } catch (err) {
            error(err?.message || "No pudimos generar el PDF.");
        } finally {
            setPdfLoading(false);
        }
    };
    

const handleEdit = () => {
    const editPath = `/patients/${patientId}/orders/${orderId}`; 
    navigate(
        ROUTES.orderNew 
            .replace(':patientId', patientId)
            .replace('new', orderId) 
    );
};


    if (loading) {
        return (
            <section className="page">
                <Card hoverable={false}>
                    <CardBody>
                        <p>Cargando orden…</p>
                    </CardBody>
                </Card>
            </section>
        );
    }

    if (errorState) {
        return (
            <section className="page">
                <Card hoverable={false}>
                    <CardBody className="stack-2">
                        <p className="form-error" role="alert">
                            {errorState}
                        </p>
                        <Button onClick={() => navigate(`/patients/${patientId}#ordenes-informes`)}>
                            Volver
                        </Button>
                    </CardBody>
                </Card>
            </section>
        );
    }

    if (!order || !patient) {
        return null;
    }

    const issuedAt = formatDateISOToHuman(order.createdAt);
    const patientName = `${patient.firstName} ${patient.lastName}`.trim();
    const patientAge = formatAge(patient.birthDate);
    const statusLabel = order.status === "cancelada" ? "Cancelada" : "Vigente"; 
    const isCancelled = order.status === "cancelada";

    return (
        <section className="page stack-5">
            <header className="page__header cluster justify-between align-center wrap">
                <div>
                    <h1>Folio {order.folio}</h1>
                    <p className="helper-text">Creada el {issuedAt}</p>
                </div>
                <Button variant="ghost" onClick={() => navigate(`/patients/${patientId}#ordenes-informes`)}>
                    Volver
                </Button>
            </header>

            <Card hoverable={false}>
                <CardHeader className="cluster justify-between align-center wrap gap-2">
                    <div className="cluster gap-2 align-center">
                        <Badge variant={statusVariant(order.status)}>{statusLabel}</Badge>
                        <span className="helper-text">Paciente: {patientName}</span>
                    </div>
                    <div className="cluster gap-2 wrap">
                        <ButtonPrimary variant="secondary" onClick={handlePdf} loading={pdfLoading}>
                            Descargar PDF
                        </ButtonPrimary>
                        <Button
                            variant="ghost"
                            onClick={() => navigate(`/patients/${patientId}#ordenes-informes`)}
                        >
                            Ver expediente
                        </Button>
                        {/* BOTÓN DE CANCELAR */}
                        {!isAssistant && !isCancelled && (
                            <Button
                                variant="danger"
                                onClick={handleCancel}
                                loading={cancelling}
                            >
                                Cancelar orden
                            </Button>
                        )}
                        {/* BOTÓN DE EDITAR */}
                        {!isAssistant && !isCancelled && (
                            <Button
                                variant="primary"
                                onClick={handleEdit} // 🚨 Usamos el nuevo handler de navegación
                            >
                                Editar
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardBody className="stack-4">
                    <div className="detail-grid">
                        <div className="stack-2">
                            <h3>Datos del paciente</h3>
                            <p>
                                <strong>Nombre:</strong> {patientName}
                            </p>
                            <p>
                                <strong>CURP:</strong> {patient.curp || "—"}
                            </p>
                            <p>
                                <strong>Edad:</strong> {patientAge}
                            </p>
                        </div>

                        <div className="stack-2">
                            <h3>Profesional tratante</h3>
                            <p>
                                <strong>Nombre:</strong> {user?.name || "Profesional BreveMente"}
                            </p>
                            <p>
                                <strong>Rol:</strong> {user?.role || "—"}
                            </p>
                            {/* Cédula: asumiendo que user tiene KycRecord o license */}
                            {user?.kycRecord?.certificateFolio && (
                                <p>
                                    <strong>Cédula:</strong> {user.kycRecord.certificateFolio}
                                </p>
                            )}
                            {user?.license && (
                                <p>
                                    <strong>Cédula:</strong> {user.license}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="stack-2">
                        <h3>Información de la orden</h3>
                        <p>
                            <strong>Tipo:</strong> {order.tipo}
                        </p>
                        <p>
                            <strong>Descripción:</strong>
                        </p>
                        <p>{order.descripcion || "—"}</p>
                        {order.indicaciones && (
                            <>
                                <p>
                                    <strong>Indicaciones:</strong>
                                </p>
                                <p>{order.indicaciones}</p>
                            </>
                        )}
                    </div>

                    <div className="stack-1">
                        <p className="helper-text">
                            <strong>Creado:</strong> {formatDateISOToHuman(order.createdAt)}
                        </p>
                        {order.updatedAt !== order.createdAt && (
                            <p className="helper-text">
                                <strong>Última actualización:</strong> {formatDateISOToHuman(order.updatedAt)}
                            </p>
                        )}
                    </div>
                </CardBody>
            </Card>
        </section>
    );
}