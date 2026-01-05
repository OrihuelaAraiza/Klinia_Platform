import { useEffect, useState, useMemo } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { Calendar, FileText, Pill, Heart, Clock, CheckCircle } from "lucide-react";
import { listSessionsByPatient } from "../../services/sessionsService";
import { listNotes } from "../../services/notesService";
import { listByPatient as listPrescriptions } from "../../services/prescriptionsService";
import { getClinicalHistory } from "../../services/clinicalHistoryService";
import { formatDateISOToHuman } from "../../utils/formatters";
import Card, { CardHeader, CardBody } from "../../components/UI/Card";
import Badge from "../../components/UI/Badge";
import { SESSION_STATUS, SESSION_STATUS_LABEL, SESSION_MODALITY_LABEL } from "../../utils/constants";
import { useToast } from "../../components/UI/Toast";

export default function PatientDashboard() {
  const { user } = useOutletContext() ?? {};
  const toast = useToast();
  const patientId = user?.id;

  const [loading, setLoading] = useState(true);
  const [nextSession, setNextSession] = useState(null);
  const [lastNote, setLastNote] = useState(null);
  const [activePrescriptions, setActivePrescriptions] = useState([]);
  const [historyComplete, setHistoryComplete] = useState(false);

  useEffect(() => {
    if (!patientId) {
      setLoading(false);
      return;
    }

    let alive = true;
    async function load() {
      setLoading(true);
      try {
        const [sessionsResp, notesResp, prescriptionsResp, historyResp] = await Promise.allSettled([
          listSessionsByPatient(patientId, { size: 10 }),
          listNotes(patientId, { page: 1, size: 1 }),
          listPrescriptions(patientId),
          getClinicalHistory(patientId).catch(() => null),
        ]);

        if (!alive) return;

        // Próxima sesión
        if (sessionsResp.status === "fulfilled") {
          const sessions = Array.isArray(sessionsResp.value?.items)
            ? sessionsResp.value.items
            : sessionsResp.value || [];
          const upcoming = sessions
            .filter(
              (s) =>
                s.status === SESSION_STATUS.PROGRAMADA ||
                s.status === SESSION_STATUS.CONFIRMADA
            )
            .sort((a, b) => new Date(a.datetime) - new Date(b.datetime))[0];
          setNextSession(upcoming || null);
        }

        // Última nota
        if (notesResp.status === "fulfilled") {
          const notes = Array.isArray(notesResp.value?.items)
            ? notesResp.value.items
            : [];
          setLastNote(notes[0] || null);
        }

        // Prescripciones activas
        if (prescriptionsResp.status === "fulfilled") {
          const prescriptions = Array.isArray(prescriptionsResp.value)
            ? prescriptionsResp.value
            : [];
          const active = prescriptions.filter((p) => !p.suspended && !p.completed);
          setActivePrescriptions(active);
        }

        // Estado de historia clínica
        if (historyResp.status === "fulfilled" && historyResp.value) {
          setHistoryComplete(!historyResp.value.isDraft);
        }
      } catch (err) {
        if (!alive) return;
        console.error("Error loading dashboard:", err);
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
  }, [patientId]);

  const firstName = user?.name?.split(" ")[0] || "Paciente";

  if (loading) {
    return (
      <section className="page stack-5 dashboard-page">
        <div className="page__header">
          <h1>Cargando tu información...</h1>
        </div>
      </section>
    );
  }

  return (
    <section className="page stack-5 dashboard-page">
      <div className="page__header">
        <div className="stack-2">
          <h1 className="dashboard-page__title">Hola, {firstName}</h1>
          <p className="dashboard-page__subtitle">
            Aquí puedes revisar tu información de salud y próximas citas.
          </p>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Próxima sesión */}
        <Card hoverable={!!nextSession}>
          <CardHeader>
            <div className="cluster" style={{ alignItems: "center", gap: "var(--s-2)" }}>
              <Calendar size={20} />
              <h2>Tu próxima sesión</h2>
            </div>
          </CardHeader>
          <CardBody>
            {nextSession ? (
              <div className="stack-3">
                <div>
                  <p className="text-lg" style={{ fontWeight: 600 }}>
                    {formatDateISOToHuman(nextSession.datetime)}
                  </p>
                  <p className="helper-text">
                    {SESSION_MODALITY_LABEL[nextSession.modality] || "Presencial"}
                  </p>
                </div>
                <Badge
                  variant={
                    nextSession.status === SESSION_STATUS.CONFIRMADA
                      ? "success"
                      : "warning"
                  }
                >
                  {SESSION_STATUS_LABEL[nextSession.status] || "Programada"}
                </Badge>
                <Link
                  to="/patient/sessions"
                  className="link link--button"
                  style={{ marginTop: "var(--s-2)" }}
                >
                  Ver todas mis sesiones
                </Link>
              </div>
            ) : (
              <div className="stack-2">
                <p className="helper-text">
                  No tienes sesiones programadas en este momento.
                </p>
                <Link to="/patient/sessions" className="link link--button">
                  Ver historial de sesiones
                </Link>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Última nota */}
        <Card hoverable={!!lastNote}>
          <CardHeader>
            <div className="cluster" style={{ alignItems: "center", gap: "var(--s-2)" }}>
              <FileText size={20} />
              <h2>Seguimiento reciente</h2>
            </div>
          </CardHeader>
          <CardBody>
            {lastNote ? (
              <div className="stack-3">
                <div>
                  <p className="text-lg" style={{ fontWeight: 600 }}>
                    {formatDateISOToHuman(lastNote.datetime)}
                  </p>
                  {lastNote.objetivo && (
                    <p className="helper-text" style={{ marginTop: "var(--s-1)" }}>
                      {lastNote.objetivo.length > 100
                        ? `${lastNote.objetivo.substring(0, 100)}...`
                        : lastNote.objetivo}
                    </p>
                  )}
                </div>
                <Link
                  to="/patient/notes"
                  className="link link--button"
                  style={{ marginTop: "var(--s-2)" }}
                >
                  Ver todas mis notas
                </Link>
              </div>
            ) : (
              <div className="stack-2">
                <p className="helper-text">
                  Aún no hay notas de seguimiento registradas.
                </p>
                <Link to="/patient/notes" className="link link--button">
                  Ver mis notas
                </Link>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Prescripciones activas */}
        <Card hoverable={activePrescriptions.length > 0}>
          <CardHeader>
            <div className="cluster" style={{ alignItems: "center", gap: "var(--s-2)" }}>
              <Pill size={20} />
              <h2>Indicaciones activas</h2>
            </div>
          </CardHeader>
          <CardBody>
            {activePrescriptions.length > 0 ? (
              <div className="stack-3">
                <p className="text-lg" style={{ fontWeight: 600 }}>
                  {activePrescriptions.length}{" "}
                  {activePrescriptions.length === 1
                    ? "prescripción activa"
                    : "prescripciones activas"}
                </p>
                <Link
                  to="/patient/prescriptions"
                  className="link link--button"
                  style={{ marginTop: "var(--s-2)" }}
                >
                  Ver todas mis prescripciones
                </Link>
              </div>
            ) : (
              <div className="stack-2">
                <p className="helper-text">
                  No tienes prescripciones activas en este momento.
                </p>
                <Link to="/patient/prescriptions" className="link link--button">
                  Ver historial de prescripciones
                </Link>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Estado del expediente */}
        <Card hoverable={false}>
          <CardHeader>
            <div className="cluster" style={{ alignItems: "center", gap: "var(--s-2)" }}>
              <Heart size={20} />
              <h2>Estado de tu expediente</h2>
            </div>
          </CardHeader>
          <CardBody>
            <div className="stack-3">
              <div className="cluster" style={{ alignItems: "center", gap: "var(--s-2)" }}>
                {historyComplete ? (
                  <>
                    <CheckCircle size={20} style={{ color: "var(--success)" }} />
                    <p style={{ fontWeight: 600 }}>Expediente completo</p>
                  </>
                ) : (
                  <>
                    <Clock size={20} style={{ color: "var(--warning)" }} />
                    <p style={{ fontWeight: 600 }}>Expediente en proceso</p>
                  </>
                )}
              </div>
              <p className="helper-text">
                {historyComplete
                  ? "Tu historia clínica está registrada y actualizada."
                  : "Tu historia clínica está siendo completada por tu profesional de salud."}
              </p>
              <Link to="/patient/clinical-history" className="link link--button">
                Ver mi historia clínica
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>
    </section>
  );
}

