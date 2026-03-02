import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import Card, { CardBody, CardHeader } from "../components/UI/Card";
import Button from "../components/UI/Button";
import Breadcrumbs from "../components/UI/Breadcrumbs";
import DynamicClinicalForm from "../components/clinical/DynamicClinicalForm";
import NOTE_SCHEMA from "../config/clinicalSchemas/note.schema";
import AddendumModal from "../components/AddendumModal";
import Modal from "../components/UI/Modal";
import { getNote, closeNote, addAddendum, updateNote } from "../services/notesService";
import { useToast } from "../components/UI/Toast";
import { formatDateISOToHuman } from "../utils/formatters";
import { ROLES } from "../utils/constants";
import Badge from "../components/UI/Badge";
import { getPatient } from "../services/patientsService";
import { exportNotePdf } from "../services/reportsService";

const STATUS_BADGE = {
  open: "warning",
  closed: "success",
};

function flattenNoteData(note) {
  if (!note) return {};
  const { extraFields, ...rest } = note;
  return {
    ...rest,
    ...(extraFields && typeof extraFields === 'object' ? extraFields : {}),
    diagnosticos: rest.diagnoses || [],
    medicacion_indicada: rest.medications || [],
  };
}

export default function NoteDetail() {
  const { id, noteId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { role, user } = useOutletContext() ?? {};
  const isAssistant = role === ROLES.ASSISTANT;

  const [note, setNote] = useState(null);
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmClose, setConfirmClose] = useState(false);
  const [addendumOpen, setAddendumOpen] = useState(false);
  const [addendumLoading, setAddendumLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!noteId || noteId === "new") {
      setLoading(false);
      setError("ID de nota inválido.");
      return;
    }

    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const noteResponse = await getNote(id, noteId);
        if (!active) return;
        setNote(noteResponse);

        // Usar patientId de la nota si id del param es undefined
        const patientId = id && id !== "undefined" ? id : noteResponse?.patientId;
        if (patientId) {
          const patientResponse = await getPatient(patientId).catch(() => null);
          if (active && patientResponse) setPatient(patientResponse);
        }
      } catch (err) {
        if (!active) return;
        setError(err.message || "No pudimos cargar la nota.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [id, noteId]);

  const professional = useMemo(() => ({
    id: user?.id ?? "user",
    name: user?.name ?? "Profesional BreveMente",
    license: user?.license || user?.kycRecord?.certificateFolio,
  }), [user]);

  const patientName = useMemo(() => {
    if (!patient) return "Paciente";
    return `${patient.firstName ?? ""} ${patient.lastName ?? ""}`.trim() || "Paciente";
  }, [patient]);

  const breadcrumbs = useMemo(() => [
    { to: "/patients", label: "Pacientes" },
    { to: `/patients/${id}`, label: patientName },
    { to: `/patients/${id}/notes`, label: "Notas de evolución" },
    { label: note?.datetime ? formatDateISOToHuman(note.datetime) : "Nota" },
  ], [id, note?.datetime, patientName]);

  const context = useMemo(() => ({
    patient: patient ?? {
      id: note?.patientId || null,
      firstName: note?.patient?.firstName || null,
      lastName: note?.patient?.lastName || null,
      birthDate: note?.patient?.birthDate || null,
      gender: note?.patient?.gender || null,
    },
    patientId: id ?? note?.patientId ?? null,
    professional: note?.professional || professional,
    datetime: note?.datetime || new Date().toISOString(),
  }), [patient, id, note, professional]);

  const handleCloseNote = async () => {
    if (!note || isAssistant || note.status === "closed") return;
    try {
      const updated = await closeNote(id, noteId);
      setNote(updated ?? { ...note, status: "closed", closedAt: new Date().toISOString() });
      toast.success("Nota cerrada correctamente");
      setConfirmClose(false);
    } catch (err) {
      toast.error(err.message || "No pudimos cerrar la nota.");
    }
  };

  const handleUpdate = async (payload) => {
    try {
      const normalized = {
        ...payload,
        diagnoses: payload.diagnosticos || payload.diagnoses || [],
        medications: payload.medicacion_indicada || payload.medications || [],
      };
      const updated = await updateNote(id, noteId, normalized);
      setNote(updated);
      setEditing(false);
      toast.success("Nota actualizada correctamente");
    } catch (err) {
      toast.error(err.message || "No pudimos actualizar la nota.");
      throw err;
    }
  };

  const handleAddAddendum = async (text) => {
    if (!note || isAssistant) return;
    try {
      setAddendumLoading(true);
      const response = await addAddendum(id, noteId, text);
      if (response) {
        setNote(response);
      } else {
        const now = new Date().toISOString();
        setNote((prev) => {
          const base = prev?.addenda ?? prev?.addendums ?? [];
          const next = [...base, { datetime: now, author: professional.name, text }];
          return { ...prev, addenda: next, addendums: next, updatedAt: now };
        });
      }
      toast.success("Addendum agregado");
      setAddendumOpen(false);
    } catch (err) {
      toast.error(err.message || "No pudimos agregar el addendum.");
    } finally {
      setAddendumLoading(false);
    }
  };

  const handleExportPdf = async () => {
    if (isAssistant || !note) return;
    try {
      setExporting(true);
      await exportNotePdf(id, note, { patient });
      toast.success("Nota exportada en PDF");
    } catch (err) {
      toast.error(err?.message || "No pudimos exportar la nota.");
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <p>Cargando nota…</p>;

  if (error) {
    return (
      <section className="page stack-4">
        <Breadcrumbs items={breadcrumbs} />
        <Card hoverable={false}>
          <CardBody>
            <p className="form-error" role="alert">{error}</p>
            <Button variant="secondary" onClick={() => navigate(-1)}>Volver</Button>
          </CardBody>
        </Card>
      </section>
    );
  }

  if (!note) return null;

  const addenda = note.addenda ?? note.addendums ?? [];
  const isClosed = note.status === "closed";
  const canEdit = !isClosed && !isAssistant && !editing;

  return (
    <section className="page stack-5">
      <div className="page-header">
        <Breadcrumbs items={breadcrumbs} />
        <div className="cluster" style={{ justifyContent: "space-between" }}>
          <div className="stack-1">
            <h1>Nota del Paciente{formatDateISOToHuman(note.datetime)}</h1>
            <p className="helper-text">{note.professional?.name}</p>
          </div>
          <div className="cluster">
            <Badge variant={STATUS_BADGE[note.status] || "neutral"}>
              {note.status === "closed" ? "Cerrada" : "Abierta"}
            </Badge>
            <Button variant="ghost" onClick={handleExportPdf} loading={exporting}>
              Exportar PDF
            </Button>
            {canEdit && (
              <Button variant="secondary" onClick={() => setEditing(true)}>
                Editar
              </Button>
            )}
            {!isClosed && !isAssistant && (
              <Button variant="secondary" onClick={() => setConfirmClose(true)}>
                Cerrar nota
              </Button>
            )}
            {isClosed && !isAssistant && (
              <Button variant="ghost" onClick={() => setAddendumOpen(true)}>
                Agregar addendum
              </Button>
            )}
          </div>
        </div>
      </div>

      <Card hoverable={false}>
        <CardHeader>
          <h2>Detalle de la nota</h2>
        </CardHeader>
        <CardBody>
          <DynamicClinicalForm
            schema={NOTE_SCHEMA}
            initialData={flattenNoteData(note)}
            onSubmit={handleUpdate}
            readOnly={!editing}
            context={context}
            showDraftButton={false}
            submitLabel="Guardar cambios"
          />
          {editing && (
            <div className="cluster" style={{ marginTop: "var(--s-4)", justifyContent: "flex-end" }}>
              <Button variant="ghost" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
            </div>
          )}
        </CardBody>
      </Card>

      {addenda.length > 0 && (
        <Card hoverable={false}>
          <CardHeader>
            <h2>Addendums</h2>
          </CardHeader>
          <CardBody className="stack-3">
            {addenda.map((addendum, idx) => (
              <Card key={addendum.datetime || idx} hoverable={false}>
                <CardHeader>
                  <strong>{new Date(addendum.datetime).toLocaleString("es-MX")}</strong>
                </CardHeader>
                <CardBody className="stack-1">
                  <span className="helper-text">{addendum.author}</span>
                  <p>{addendum.text}</p>
                </CardBody>
              </Card>
            ))}
          </CardBody>
        </Card>
      )}

      <Modal
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        title="Cerrar nota"
        footer={
          <div className="cluster">
            <Button variant="ghost" onClick={() => setConfirmClose(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleCloseNote}>
              Confirmar cierre
            </Button>
          </div>
        }
      >
        <p className="helper-text">
          Al cerrar la nota no podrás editarla. Siempre podrás agregar addendums posteriormente.
        </p>
      </Modal>

      <AddendumModal
        open={addendumOpen}
        onClose={() => setAddendumOpen(false)}
        onConfirm={handleAddAddendum}
        loading={addendumLoading}
      />
    </section>
  );
}