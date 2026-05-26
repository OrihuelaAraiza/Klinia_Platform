import { useEffect, useMemo, useState } from "react";
import { CalendarPlus } from "lucide-react";
import Modal from "../UI/Modal";
import Button from "../UI/Button";
import ButtonPrimary from "../ButtonPrimary";
import Field from "../UI/Field";
import { useToast } from "../UI/Toast";
import appointmentRequestsService from "../../services/appointmentRequestsService";

const MODALITY_OPTIONS = [
  { value: "PRESENCIAL", label: "Presencial" },
  { value: "VIRTUAL", label: "Virtual (videollamada)" },
];

function toLocalIsoMinute(date) {
  // Devuelve string compatible con <input type="datetime-local"> (sin segundos ni zona)
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export default function RequestAppointmentModal({
  open,
  onClose,
  onSuccess,
  professionalName,
  professionalId,
}) {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [requestedAt, setRequestedAt] = useState("");
  const [modality, setModality] = useState("PRESENCIAL");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const minDate = useMemo(() => {
    const d = new Date();
    d.setHours(d.getHours() + 2, 0, 0, 0);
    return toLocalIsoMinute(d);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (open) {
      setRequestedAt("");
      setModality("PRESENCIAL");
      setReason("");
      setError("");
    }
  }, [open]);

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    setError("");
    if (!requestedAt) {
      setError("Selecciona la fecha y hora preferida.");
      return;
    }
    const requestedDate = new Date(requestedAt);
    if (Number.isNaN(requestedDate.getTime())) {
      setError("La fecha no es válida.");
      return;
    }
    if (requestedDate.getTime() < Date.now()) {
      setError("La fecha debe ser en el futuro.");
      return;
    }
    setSubmitting(true);
    try {
      const created = await appointmentRequestsService.create({
        requestedAt: requestedDate.toISOString(),
        modality,
        reason: reason.trim(),
        professionalId,
      });
      toast.success("Solicitud enviada. Tu terapeuta la revisará pronto.");
      if (onSuccess) onSuccess(created);
      onClose?.();
    } catch (err) {
      const msg = err?.message || "No pudimos enviar la solicitud.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={submitting ? undefined : onClose}
      title={
        <span className="cluster gap-2 align-center">
          <CalendarPlus size={20} aria-hidden="true" />
          Solicitar nueva cita
        </span>
      }
      footer={
        <div className="cluster justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <ButtonPrimary onClick={handleSubmit} loading={submitting}>
            Enviar solicitud
          </ButtonPrimary>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="stack-3">
        {professionalName ? (
          <p className="helper-text">
            Tu solicitud se enviará a <strong>{professionalName}</strong>. Una vez aceptada,
            la cita aparecerá en tu agenda.
          </p>
        ) : (
          <p className="helper-text">
            Tu solicitud se enviará a tu terapeuta asignado.
          </p>
        )}

        <Field label="Fecha y hora preferida" required>
          <input
            type="datetime-local"
            className="input-field__input"
            value={requestedAt}
            onChange={(e) => setRequestedAt(e.target.value)}
            min={minDate}
            disabled={submitting}
          />
        </Field>

        <Field label="Modalidad" required>
          <select
            className="input-field__input"
            value={modality}
            onChange={(e) => setModality(e.target.value)}
            disabled={submitting}
          >
            {MODALITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </Field>

        <Field label="Motivo o nota para tu terapeuta" hint="Opcional pero ayuda a prepararse mejor para la sesión.">
          <textarea
            className="input-field__input"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej. Quiero revisar mis avances con la técnica de exposición."
            maxLength={400}
            disabled={submitting}
          />
          <p className="helper-text" style={{ textAlign: "right", marginTop: 4 }}>
            {reason.length}/400
          </p>
        </Field>

        {error ? (
          <p className="error-text" style={{ color: "var(--danger)" }}>{error}</p>
        ) : null}
      </form>
    </Modal>
  );
}
