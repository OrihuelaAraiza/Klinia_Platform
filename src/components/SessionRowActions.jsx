import Button from "./UI/Button";
import { SESSION_STATUS, SESSION_STATUS_LABEL } from "../utils/constants";

const TRANSITIONS = {
  [SESSION_STATUS.PROGRAMADA]: [SESSION_STATUS.CONFIRMADA, SESSION_STATUS.CANCELADA],
  [SESSION_STATUS.CONFIRMADA]: [SESSION_STATUS.ATENDIDA, SESSION_STATUS.NO_PRESENTADA, SESSION_STATUS.CANCELADA],
  [SESSION_STATUS.ATENDIDA]: [],
  [SESSION_STATUS.NO_PRESENTADA]: [],
  [SESSION_STATUS.CANCELADA]: [],
};

const ACTION_LABEL = {
  [SESSION_STATUS.CONFIRMADA]: "Confirmar",
  [SESSION_STATUS.ATENDIDA]: "Marcar atendida",
  [SESSION_STATUS.NO_PRESENTADA]: "No presentada",
  [SESSION_STATUS.CANCELADA]: "Cancelar",
};

const ACTION_VARIANT = {
  [SESSION_STATUS.CONFIRMADA]: "secondary",
  [SESSION_STATUS.ATENDIDA]: "primary",
  [SESSION_STATUS.NO_PRESENTADA]: "secondary",
  [SESSION_STATUS.CANCELADA]: "danger",
};

export default function SessionRowActions({ session, isAssistant, onChangeStatus, changing }) {
  const available = TRANSITIONS[session.status] || [];
  if (!available.length || isAssistant) {
    return null;
  }

  const handleClick = (status) => {
    onChangeStatus?.(status, {
      label: SESSION_STATUS_LABEL[status] || status,
    });
  };

  return (
    <div className="session-row-actions">
      {available.map((status) => (
        <Button
          key={status}
          variant={ACTION_VARIANT[status] || "ghost"}
          size="sm"
          onClick={() => handleClick(status)}
          loading={changing === status}
        >
          {ACTION_LABEL[status] || SESSION_STATUS_LABEL[status]}
        </Button>
      ))}
    </div>
  );
}
