import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { listNotes } from "../../services/notesService";
import { formatDateISOToHuman } from "../../utils/formatters";
import Card, { CardHeader, CardBody } from "../../components/UI/Card";
import Badge from "../../components/UI/Badge";
import { useToast } from "../../components/UI/Toast";
import { SkeletonCard, SkeletonLine, SkeletonTitle, SkeletonSubtitle, SkeletonList } from "../../components/UI/Skeleton";
import EmptyState from "../../components/UI/EmptyState";
import { FileText } from "lucide-react";

/**
 * Vista de Notas para pacientes
 * Muestra solo información visible y comprensible, excluyendo SOAP técnico completo
 */
export default function PatientNotes() {
  const { user } = useOutletContext() ?? {};
  const toast = useToast();
  const patientId = user?.id;

  const [notes, setNotes] = useState([]);
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
        const response = await listNotes(patientId, { page: 1, size: 50 });
        if (!alive) return;
        const items = Array.isArray(response?.items) ? response.items : [];
        // Filtrar solo notas cerradas o visibles para pacientes
        const visibleNotes = items.filter((note) => note.status === "closed" || note.visibleToPatient);
        setNotes(visibleNotes);
      } catch (err) {
        if (!alive) return;
        if (err.status === 404) {
          setNotes([]);
        } else {
          const message = err.message || "No pudimos cargar tus notas.";
          setError(message);
          toast.error(message);
        }
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

  if (loading) {
    return (
      <section className="page stack-5">
        <div className="page__header">
          <SkeletonTitle />
          <SkeletonSubtitle />
        </div>
        <SkeletonList count={3} />
      </section>
    );
  }

  return (
    <section className="page stack-5">
      <div className="page__header">
        <div className="stack-2">
          <h1>Mis Notas de Evolución</h1>
          <p className="helper-text">
            Aquí puedes ver el resumen de tus consultas y seguimientos.
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
      ) : notes.length === 0 ? (
        <Card hoverable={false}>
          <CardBody>
            <EmptyState
              icon={FileText}
              title="Aún no hay notas disponibles"
              message="Tu profesional de salud registrará notas de seguimiento después de cada consulta. Aquí podrás ver un resumen de tus sesiones y recomendaciones."
            />
          </CardBody>
        </Card>
      ) : (
        <div className="stack-4">
          {notes.map((note) => (
            <Card key={note.id} hoverable>
              <CardHeader className="cluster" style={{ justifyContent: "space-between" }}>
                <div className="stack-1">
                  <strong>{formatDateISOToHuman(note.datetime)}</strong>
                  {note.professional?.name && (
                    <span className="helper-text">
                      Por: {note.professional.name}
                    </span>
                  )}
                </div>
                <Badge variant={note.status === "closed" ? "success" : "warning"}>
                  {note.status === "closed" ? "Completada" : "En seguimiento"}
                </Badge>
              </CardHeader>
              <CardBody className="stack-3">
                {note.objetivo && (
                  <div className="stack-1">
                    <strong>Objetivo de la consulta:</strong>
                    <p>{note.objetivo}</p>
                  </div>
                )}

                {note.recomendaciones && (
                  <div className="stack-1">
                    <strong>Recomendaciones:</strong>
                    <p>{note.recomendaciones}</p>
                  </div>
                )}

                {note.plan && (
                  <div className="stack-1">
                    <strong>Plan de seguimiento:</strong>
                    <p>{note.plan}</p>
                  </div>
                )}

                {/* No mostrar SOAP técnico completo, diagnósticos internos, etc. */}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

