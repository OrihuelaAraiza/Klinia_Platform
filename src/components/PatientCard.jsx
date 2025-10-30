import Card, { CardBody, CardHeader } from "./UI/Card";
import Badge from "./UI/Badge";
import { formatDateISOToHuman, formatPhone } from "../utils/formatters";

function cx(...values) {
  return values
    .flatMap((value) => {
      if (!value) return [];
      if (typeof value === "string") return value.split(" ");
      if (Array.isArray(value)) return value;
      return Object.entries(value)
        .filter(([, truthy]) => Boolean(truthy))
        .map(([key]) => key);
    })
    .filter(Boolean)
    .join(" ");
}

export default function PatientCard({ patient, to, onClick, className = "" }) {
  if (!patient) {
    return null;
  }

  const fullName = `${patient.firstName ?? ""} ${patient.lastName ?? ""}`.trim();
  const Wrapper = to ? "a" : "div";
  const wrapperProps = to
    ? {
        href: to,
        onClick: (event) => {
          event.preventDefault();
          onClick?.(event);
        },
      }
    : { onClick };

  return (
    <Wrapper
      className={cx("patient-card-link", className)}
      aria-label={`Ver detalle de ${fullName || "paciente"}`}
      {...wrapperProps}
    >
      <Card hoverable>
        <CardHeader className="stack-2">
          <div className="cluster">
            <h3>{fullName || "Paciente sin nombre"}</h3>
            {patient.curp ? <Badge variant="neutral">CURP: {patient.curp}</Badge> : null}
          </div>
          <p className="helper-text">
            Nacimiento: {formatDateISOToHuman(patient.birthDate)}
          </p>
        </CardHeader>
        <CardBody className="stack-2">
          <p>
            <strong>Teléfono:</strong> {formatPhone(patient.phone) || "Sin teléfono"}
          </p>
          <p>
            <strong>Correo:</strong> {patient.email || "Sin correo"}
          </p>
        </CardBody>
      </Card>
    </Wrapper>
  );
}
