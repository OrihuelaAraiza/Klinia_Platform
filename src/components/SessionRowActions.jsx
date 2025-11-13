import { useState } from "react";
import Button from "./UI/Button";
import Modal from "./UI/Modal";
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

const ACTION_TOOLTIP = {
  [SESSION_STATUS.CONFIRMADA]: "Confirmar asistencia",
  [SESSION_STATUS.ATENDIDA]: "Marcar como atendida",
  [SESSION_STATUS.NO_PRESENTADA]: "Marcar inasistencia",
  [SESSION_STATUS.CANCELADA]: "Cancelar sesión",
};

export default function SessionRowActions({ session, isAssistant, onChangeStatus, changing }) {
  const available = TRANSITIONS[session.status] || [];
  if (!available.length || isAssistant) {
    return null;
  }

  const [pendingStatus, setPendingStatus] = useState("");

  return (
    <>
      <div className="session-row-actions">
        {available.map((status) => (
          <Button
            key={status}
            variant={ACTION_VARIANT[status] || "ghost"}
            size="sm"
            onClick={() => setPendingStatus(status)}
            loading={changing === status}
            title={ACTION_TOOLTIP[status] || ACTION_LABEL[status]}
          >
            {ACTION_LABEL[status] || SESSION_STATUS_LABEL[status]}
          </Button>
        ))}
      </div>
      {pendingStatus ? (
        <Modal
          open
          onClose={() => setPendingStatus("")}
          title="Confirmar cambio de estado"
          footer={
            <div className="cluster" style={{ justifyContent: "flex-end" }}>
              <Button variant="ghost" onClick={() => setPendingStatus("")}>
                Volver
              </Button>
              <Button
                onClick={() => {
                  const status = pendingStatus;
                  setPendingStatus("");
                  onChangeStatus?.(status, {
                    label: SESSION_STATUS_LABEL[status] || status,
                  });
                }}
              >
                Confirmar
              </Button>
            </div>
          }
        >
          <p>
            ¿Confirmas cambiar la sesión de {session.patientName || session.patient?.name || "la paciente"} a{" "}
            {SESSION_STATUS_LABEL[pendingStatus] || pendingStatus}?
          </p>
        </Modal>
      ) : null}
    </>
  );
}
