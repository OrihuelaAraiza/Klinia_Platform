import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import Card, { CardBody, CardHeader } from "../components/UI/Card";
import Button from "../components/UI/Button";
import Drawer from "../components/UI/Drawer";
import Breadcrumbs from "../components/UI/Breadcrumbs";
import NoteForm from "../components/NoteForm";
import auditService from "../services/auditService";
import { listNotes, createNote } from "../services/notesService";
import { getPatient } from "../services/patientsService";
import { useToast } from "../components/UI/Toast";
import { ROLES, ROUTES } from "../utils/constants";
import { formatDateISOToHuman } from "../utils/formatters";
import Badge from "../components/UI/Badge";

const STATUS_BADGE = {
  open: "warning",
  closed: "success",
};

export default function Notes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { role, user } = useOutletContext() ?? {};
  const isAssistant = role === ROLES.ASSISTANT;

  const [data, setData] = useState({ items: [], page: 1, size: 10, total: 0 });
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [patientResp, notesResp] = await Promise.all([
          getPatient(id).catch(() => null),
          listNotes(id, { page: 1, size: 10 }),
        ]);
        if (!alive) return;
        if (patientResp) {
          setPatient(patientResp);
        }
        const items = Array.isArray(notesResp?.items) ? notesResp.items : [];
        setData({
          items,
          page: Number(notesResp?.page ?? 1),
          size: Number(notesResp?.size ?? 10),
          total: Number(notesResp?.total ?? items.length),
        });
        auditService.logAudit("notes_list", { patientId: id });
      } catch (err) {
        if (!alive) return;
        if (err.status === 404) {
          setData({ items: [], page: 1, size: 10, total: 0 });
        } else {
          const message = err.message || "No pudimos cargar las notas.";
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
  }, [id, toast]);

  const patientName = patient ? `${patient.firstName} ${patient.lastName}`.trim() : "Paciente";
  const breadcrumbs = useMemo(
    () => [
      { to: ROUTES.patients, label: "Pacientes" },
      { to: `/patients/${id}`, label: patientName },
      { label: "Notas de evolución" },
    ],
    [id, patientName]
  );

  const handleCreateNote = async (payload) => {
    try {
      const created = await createNote(id, {
        ...payload,
        professional: {
          id: user?.id ?? "user",
          name: user?.name ?? "Profesional Klinia",
        },
        datetime: new Date().toISOString(),
      });
      setError("");
      setData((prev) => {
        const items = Array.isArray(prev.items) ? prev.items : [];
        return {
          ...prev,
          items: [created, ...items],
          total: prev.total + 1,
        };
      });
      auditService.logAudit("note_create", { patientId: id, noteId: created.id, status: created.status });
      toast.success("Nota creada");
      setDrawerOpen(false);
    } catch (err) {
      const message = err.message || "No pudimos guardar la nota.";
      setError(message);
      toast.error(message);
      throw err;
    }
  };

  const notes = Array.isArray(data.items) ? data.items : [];

  return (
    <section className="page stack-5">
      <div className="page-header">
        <Breadcrumbs items={breadcrumbs} />
        <div className="cluster" style={{ justifyContent: "space-between" }}>
          <div className="stack-1">
            <h1>Notas de evolución</h1>
            <p className="helper-text">
              {patientName} • CURP {patient?.curp ?? "-"}
            </p>
          </div>
          {!isAssistant ? (
            <Button onClick={() => setDrawerOpen(true)}>Nueva nota</Button>
          ) : null}
        </div>
      </div>

      <Card hoverable={false}>
        <CardHeader>
          <h2>Notas registradas</h2>
        </CardHeader>
        <CardBody className="stack-3">
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          {loading ? (
            <p>Cargando notas…</p>
          ) : notes.length === 0 ? (
            <p className="helper-text">No hay notas aún. Crea la primera nota para este paciente.</p>
          ) : (
            <div className="stack-3">
              {notes.map((note) => (
                <Card key={note.id} hoverable>
                  <CardHeader className="cluster" style={{ justifyContent: "space-between" }}>
                    <div className="stack-1">
                      <strong>{formatDateISOToHuman(note.datetime)}</strong>
                      <span className="helper-text">{note.professional?.name}</span>
                    </div>
                    <Badge variant={STATUS_BADGE[note.status] || "neutral"}>
                      {note.status === "closed" ? "Cerrada" : "Abierta"}
                    </Badge>
                  </CardHeader>
                  <CardBody className="stack-2">
                    <p>
                      <strong>Diagnóstico(s):</strong>{" "}
                      {(Array.isArray(note.diagnoses) ? note.diagnoses : []).map((dx) => dx.code).join(", ") ||
                        "Sin diagnóstico"}
                    </p>
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/patients/${id}/notes/${note.id}`)}>
                      Ver detalle
                    </Button>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Nueva nota">
        <NoteForm
          onSubmit={handleCreateNote}
          readOnly={isAssistant}
          professional={{ id: user?.id, name: user?.name }}
        />
      </Drawer>
    </section>
  );
}
