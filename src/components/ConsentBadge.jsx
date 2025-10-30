import Badge from "./UI/Badge";

const STATUS_VARIANT = {
  signed: "success",
  pending: "warning",
  revoked: "danger",
};

const TYPE_LABEL = {
  attention: "Consentimiento de atención",
  recording: "Grabación/Transcripción",
  ai_use: "Uso de IA",
};

export default function ConsentBadge({ type, status }) {
  const label = TYPE_LABEL[type] ?? type;
  const variant = STATUS_VARIANT[status] || "neutral";

  return <Badge variant={variant}>{label}</Badge>;
}
