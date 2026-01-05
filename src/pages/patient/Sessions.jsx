import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { listSessionsByPatient } from "../../services/sessionsService";
import { formatDateISOToHuman } from "../../utils/formatters";
import Card, { CardHeader, CardBody } from "../../components/UI/Card";
import Badge from "../../components/UI/Badge";
import Button from "../../components/UI/Button";
import { useToast } from "../../components/UI/Toast";
import {
  SESSION_STATUS,
  SESSION_STATUS_LABEL,
  SESSION_STATUS_VARIANT,
  SESSION_MODALITY,
  SESSION_MODALITY_LABEL,
} from "../../utils/constants";

/**
 * Vista de Sesiones para pacientes
 * Muestra historial y próximas sesiones
 */
export default function PatientSessions() {
  const { user } = useOutletContext() ?? {};
  const toast = useToast();
  const patientId = user?.id;

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!patientId) {
      setLoading(false);
      return;
    }

    let alive = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await listSessionsByPatient(patientId, { size: 100 });
        if (!alive) return;
        const items = Array.isArray(response?.items) ? response.items : response || [];
        // Ordenar por fecha (más recientes primero)
        const sorted = items.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
        setSessions(sorted);
      } catch (err) {
        if (!alive) return;
        const message = err.message || "No pudimos cargar tus sesiones.";
        setError(message);
        toast.error(message);
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [patientId, toast]);

  const upcomingSessions = sessions.filter(
    (s) =>
      s.status === SESSION_STATUS.PROGRAMADA ||
      s.status === SESSION_STATUS.CONFIRMADA
  );
  const pastSessions = sessions.filter(
    (s) =>
      s.status === SESSION_STATUS.ATENDIDA ||
      s.status === SESSION_STATUS.NO_PRESENTADA ||
      s.status === SESSION_STATUS.CANCELADA
  );

  const handleConfirmAttendance = (sessionId) => {
    // Stub: implementar cuando el backend lo soporte
    toast.success("Confirmación de asistencia enviada (stub)");
  };

  const handleRequestReschedule = (sessionId) => {
    // Stub: implementar cuando el backend lo soporte
    toast.warn("Solicitud de reprogramación enviada (stub)");
  };

  if (loading) {
    return (
      <section className="page stack-4">
        <div className="page__header">
          <h1>Mis Sesiones</h1>
        </div>
        <p>Cargando tus sesiones...</p>
      </section>
    );
  }

  return (
    <section className="page stack-5">
      <div className="page__header">
        <div className="stack-2">
          <h1>Mis Sesiones</h1>
          <p className="helper-text">
            Aquí puedes ver tus próximas citas y el historial de sesiones.
          </p>
        </div>
      </div>

      {error ? (
        <Card hoverable={false}>
          <CardBody>
            <p className="form-error" role="alert">
              {error}
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="stack-5">
          {/* Próximas sesiones */}
          {upcomingSessions.length > 0 && (
            <div className="stack-3">
              <h2>Próximas sesiones</h2>
              <div className="stack-3">
                {upcomingSessions.map((session) => (
                  <Card key={session.id} hoverable={false}>
                    <CardHeader className="cluster" style={{ justifyContent: "space-between" }}>
                      <div className="stack-1">
                        <strong>{formatDateISOToHuman(session.datetime)}</strong>
                        <span className="helper-text">
                          {SESSION_MODALITY_LABEL[session.modality] || "Presencial"}
                        </span>
                      </div>
                      <Badge variant={SESSION_STATUS_VARIANT[session.status] || "neutral"}>
                        {SESSION_STATUS_LABEL[session.status] || session.status}
                      </Badge>
                    </CardHeader>
                    <CardBody className="stack-3">
                      {session.professional?.name && (
                        <p>
                          <strong>Profesional:</strong> {session.professional.name}
                        </p>
                      )}
                      {session.notes && (
                        <p className="helper-text">{session.notes}</p>
                      )}
                      <div className="cluster" style={{ gap: "var(--s-2)" }}>
                        {session.status === SESSION_STATUS.PROGRAMADA && (
                          <Button
                            size="sm"
                            onClick={() => handleConfirmAttendance(session.id)}
                          >
                            Confirmar asistencia
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRequestReschedule(session.id)}
                        >
                          Solicitar reprogramación
                        </Button>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Historial */}
          {pastSessions.length > 0 && (
            <div className="stack-3">
              <h2>Historial de sesiones</h2>
              <div className="stack-3">
                {pastSessions.map((session) => (
                  <Card key={session.id} hoverable={false}>
                    <CardHeader className="cluster" style={{ justifyContent: "space-between" }}>
                      <div className="stack-1">
                        <strong>{formatDateISOToHuman(session.datetime)}</strong>
                        <span className="helper-text">
                          {SESSION_MODALITY_LABEL[session.modality] || "Presencial"}
                        </span>
                      </div>
                      <Badge variant={SESSION_STATUS_VARIANT[session.status] || "neutral"}>
                        {SESSION_STATUS_LABEL[session.status] || session.status}
                      </Badge>
                    </CardHeader>
                    <CardBody>
                      {session.professional?.name && (
                        <p>
                          <strong>Profesional:</strong> {session.professional.name}
                        </p>
                      )}
                    </CardBody>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {sessions.length === 0 && (
            <Card hoverable={false}>
              <CardBody>
                <div className="stack-3" style={{ textAlign: "center", padding: "var(--s-8)" }}>
                  <p className="helper-text">
                    Aún no tienes sesiones registradas. Tu profesional de salud
                    programará tus citas aquí.
                  </p>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      )}
    </section>
  );
}

