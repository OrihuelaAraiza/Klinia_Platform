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
import { ROLES } from "../utils/constants";
import * as patientsService from "../services/patientsService";

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

export default function OrderDetail() {
  const { patientId, orderId } = useParams();
  const { role, user } = useOutletContext() ?? {};
  const [order, setOrder] = useState(null);
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();
  const isAssistant = role === ROLES.ASSISTANT;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    async function load() {
      try {
        const [orderData, patientData] = await Promise.all([
          ordersService.getOne(orderId),
          patientsService.getPatient(patientId),
        ]);
        if (!active) return;
        setOrder(orderData);
        setPatient(patientData);
      } catch (err) {
        if (!active) return;
        setError(err?.message || "No pudimos cargar la orden solicitada.");
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
  }, [orderId, patientId]);

  const handlePdf = async () => {
    if (!order || !patient) return;
    setPdfLoading(true);
    try {
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
    } catch (err) {
      toast.error(err?.message || "No pudimos generar el PDF.");
    } finally {
      setPdfLoading(false);
    }
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

  if (error) {
    return (
      <section className="page">
        <Card hoverable={false}>
          <CardBody className="stack-2">
            <p className="form-error" role="alert">
              {error}
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
  const statusVariant = order.status === "cancelada" ? "danger" : "success";

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
            <Badge variant={statusVariant}>{statusLabel}</Badge>
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
                <strong>Nombre:</strong> {user?.name || "Profesional Klinia"}
              </p>
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

