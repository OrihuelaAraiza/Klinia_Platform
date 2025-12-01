import { useEffect, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import Card, { CardBody, CardHeader } from "../components/UI/Card";
import Button from "../components/UI/Button";
import ButtonPrimary from "../components/ButtonPrimary";
import InputField from "../components/InputField";
import Badge from "../components/UI/Badge";
import { useToast } from "../components/UI/Toast";
import { ROLES } from "../utils/constants";
import { formatDateISOToHuman } from "../utils/formatters";
import * as ordersService from "../services/ordersService";
import * as patientsService from "../services/patientsService";

const ORDER_TYPES = [
  { value: "Laboratorio", label: "Laboratorio" },
  { value: "Imagenología", label: "Imagenología" },
  { value: "Interconsulta", label: "Interconsulta" },
  { value: "Otro", label: "Otro" },
];

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

export default function OrderForm() {
  const { patientId, orderId } = useParams();
  const { role, user } = useOutletContext() ?? {};
  const navigate = useNavigate();
  const toast = useToast();
  const isAssistant = role === ROLES.ASSISTANT;
  const isEdit = Boolean(orderId);

  const [patient, setPatient] = useState(null);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    tipo: "",
    descripcion: "",
    indicaciones: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    async function load() {
      try {
        const patientData = await patientsService.getPatient(patientId);
        if (!active) return;
        setPatient(patientData);

        if (orderId) {
          const orderData = await ordersService.getOne(orderId);
          if (!active) return;
          setOrder(orderData);
          setForm({
            tipo: orderData.tipo || "",
            descripcion: orderData.descripcion || "",
            indicaciones: orderData.indicaciones || "",
          });
        }
      } catch (err) {
        if (!active) return;
        setError(err?.message || "No pudimos cargar la información.");
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
  }, [patientId, orderId]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!form.tipo?.trim()) {
      newErrors.tipo = "Selecciona un tipo de orden.";
    }
    if (!form.descripcion?.trim()) {
      newErrors.descripcion = "La descripción es requerida.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isAssistant || !validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        patientId,
        tipo: form.tipo.trim(),
        descripcion: form.descripcion.trim(),
        indicaciones: form.indicaciones?.trim() || null,
      };

      let result;
      if (isEdit) {
        result = await ordersService.update(orderId, payload);
        toast.success("Orden actualizada correctamente.");
      } else {
        result = await ordersService.create(payload);
        toast.success("Orden creada correctamente.");
      }

      navigate(`/patients/${patientId}#ordenes-informes`);
    } catch (err) {
      toast.error(err?.message || "No pudimos guardar la orden.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <section className="page">
        <Card hoverable={false}>
          <CardBody>
            <p>Cargando…</p>
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
            <Button onClick={() => navigate(`/patients/${patientId}`)}>Volver</Button>
          </CardBody>
        </Card>
      </section>
    );
  }

  if (!patient) {
    return null;
  }

  const patientName = `${patient.firstName} ${patient.lastName}`.trim();
  const patientAge = formatAge(patient.birthDate);
  const statusLabel = order?.status === "cancelada" ? "Cancelada" : "Vigente";
  const statusVariant = order?.status === "cancelada" ? "danger" : "success";

  return (
    <section className="page stack-5">
      <header className="page__header">
        <h1>{isEdit ? "Editar orden clínica" : "Nueva orden clínica"}</h1>
        {isEdit && order && (
          <div className="cluster gap-2 align-center">
            <Badge variant={statusVariant}>{statusLabel}</Badge>
            <span className="helper-text">Folio: {order.folio}</span>
          </div>
        )}
      </header>

      <Card hoverable={false}>
        <CardHeader>
          <h2>Datos del paciente</h2>
        </CardHeader>
        <CardBody className="stack-2">
          <p>
            <strong>Nombre:</strong> {patientName}
          </p>
          <p>
            <strong>Edad:</strong> {patientAge}
          </p>
          <p>
            <strong>CURP:</strong> {patient.curp || "—"}
          </p>
        </CardBody>
      </Card>

      <Card hoverable={false}>
        <CardHeader>
          <h2>Información de la orden</h2>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit} className="stack-4">
            <div>
              <label htmlFor="tipo" className="ui-field__label">
                Tipo de orden * <span className="ui-field__required">*</span>
              </label>
              <select
                id="tipo"
                className={`input-field__input${errors.tipo ? " has-error" : ""}`}
                value={form.tipo}
                onChange={(e) => handleChange("tipo", e.target.value)}
                disabled={isAssistant || order?.status === "cancelada"}
                required
              >
                <option value="">Selecciona un tipo</option>
                {ORDER_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              {errors.tipo && (
                <p className="ui-field__error" role="alert">
                  {errors.tipo}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="descripcion" className="ui-field__label">
                Descripción * <span className="ui-field__required">*</span>
              </label>
              <textarea
                id="descripcion"
                className={`input-field__input${errors.descripcion ? " has-error" : ""}`}
                value={form.descripcion}
                onChange={(e) => handleChange("descripcion", e.target.value)}
                disabled={isAssistant || order?.status === "cancelada"}
                rows={4}
                required
              />
              {errors.descripcion && (
                <p className="ui-field__error" role="alert">
                  {errors.descripcion}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="indicaciones" className="ui-field__label">
                Indicaciones
              </label>
              <textarea
                id="indicaciones"
                className={`input-field__input${errors.indicaciones ? " has-error" : ""}`}
                value={form.indicaciones}
                onChange={(e) => handleChange("indicaciones", e.target.value)}
                disabled={isAssistant || order?.status === "cancelada"}
                rows={3}
              />
              {errors.indicaciones && (
                <p className="ui-field__error" role="alert">
                  {errors.indicaciones}
                </p>
              )}
            </div>

            {isEdit && order && (
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
            )}

            <div className="cluster gap-2">
              {!isAssistant && order?.status !== "cancelada" && (
                <ButtonPrimary type="submit" loading={submitting}>
                  {isEdit ? "Actualizar orden" : "Crear orden"}
                </ButtonPrimary>
              )}
              <Button variant="ghost" onClick={() => navigate(`/patients/${patientId}#ordenes-informes`)}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </section>
  );
}

