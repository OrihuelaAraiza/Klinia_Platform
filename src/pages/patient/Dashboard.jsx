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
import { SkeletonGrid, SkeletonCard, SkeletonLine, SkeletonTitle, SkeletonSubtitle } from "../../components/UI/Skeleton";

export default function PatientDashboard() {
  const { user } = useOutletContext() ?? {};
  const toast = useToast();
  const patientId = user?.id;

  const [loading, setLoading] = useState(true);
  const [loadingStates, setLoadingStates] = useState({
    sessions: true,
    notes: true,
    prescriptions: true,
    history: true,
  });
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
      setLoadingStates({ sessions: true, notes: true, prescriptions: true, history: true });
      
      try {
        // Cargar datos en paralelo con estados individuales
        const loadSessions = async () => {
          try {
            const sessionsResp = await listSessionsByPatient(patientId, { size: 10 });
            if (!alive) return;
            const sessions = Array.isArray(sessionsResp?.items)
              ? sessionsResp.items
              : sessionsResp || [];
            const upcoming = sessions
              .filter(
                (s) =>
                  s.status === SESSION_STATUS.PROGRAMADA ||
                  s.status === SESSION_STATUS.CONFIRMADA
              )
              .sort((a, b) => new Date(a.datetime) - new Date(b.datetime))[0];
            setNextSession(upcoming || null);
          } finally {
            if (alive) {
              setLoadingStates((prev) => ({ ...prev, sessions: false }));
            }
          }
        };

        const loadNotes = async () => {
          try {
            const notesResp = await listNotes(patientId, { page: 1, size: 1 });
            if (!alive) return;
            const notes = Array.isArray(notesResp?.items) ? notesResp.items : [];
            setLastNote(notes[0] || null);
          } finally {
            if (alive) {
              setLoadingStates((prev) => ({ ...prev, notes: false }));
            }
          }
        };

        const loadPrescriptions = async () => {
          try {
            const prescriptionsResp = await listPrescriptions(patientId);
            if (!alive) return;
            const prescriptions = Array.isArray(prescriptionsResp) ? prescriptionsResp : [];
            const active = prescriptions.filter((p) => !p.suspended && !p.completed);
            setActivePrescriptions(active);
          } finally {
            if (alive) {
              setLoadingStates((prev) => ({ ...prev, prescriptions: false }));
            }
          }
        };

        const loadHistory = async () => {
          try {
            const historyResp = await getClinicalHistory(patientId).catch(() => null);
            if (!alive) return;
            if (historyResp) {
              setHistoryComplete(!historyResp.isDraft);
            }
          } finally {
            if (alive) {
              setLoadingStates((prev) => ({ ...prev, history: false }));
            }
          }
        };

        // Cargar todo en paralelo
        await Promise.allSettled([
          loadSessions(),
          loadNotes(),
          loadPrescriptions(),
          loadHistory(),
        ]);
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
          <SkeletonTitle />
          <SkeletonSubtitle />
        </div>
        <SkeletonGrid count={4} />
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
            {loadingStates.sessions ? (
              <div className="stack-3">
                <SkeletonLine width="60%" />
                <SkeletonLine width="40%" />
                <SkeletonLine width="30%" style={{ height: "2rem" }} />
              </div>
            ) : nextSession ? (
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
            {loadingStates.notes ? (
              <div className="stack-3">
                <SkeletonLine width="50%" />
                <SkeletonLine width="80%" />
                <SkeletonLine width="25%" style={{ height: "2rem" }} />
              </div>
            ) : lastNote ? (
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
            {loadingStates.prescriptions ? (
              <div className="stack-3">
                <SkeletonLine width="40%" />
                <SkeletonLine width="30%" style={{ height: "2rem" }} />
              </div>
            ) : activePrescriptions.length > 0 ? (
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
            {loadingStates.history ? (
              <div className="stack-3">
                <SkeletonLine width="50%" />
                <SkeletonLine width="80%" />
                <SkeletonLine width="40%" style={{ height: "2rem" }} />
              </div>
            ) : (
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
            )}
          </CardBody>
        </Card>
      </div>
    </section>
  );
}

