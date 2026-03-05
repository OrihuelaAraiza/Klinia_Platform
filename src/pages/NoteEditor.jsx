import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import Card, { CardBody, CardHeader } from "../components/UI/Card";
import Button from "../components/UI/Button";
import Breadcrumbs from "../components/UI/Breadcrumbs";
import DynamicClinicalForm from "../components/clinical/DynamicClinicalForm";
import NOTE_SCHEMA from "../config/clinicalSchemas/note.schema";
import { getNote, createNote, updateNote, closeNote } from "../services/notesService";
import { getPatient } from "../services/patientsService";
import { useToast } from "../components/UI/Toast";
import { ROLES } from "../utils/constants";
import { formatDateISOToHuman } from "../utils/formatters";
import Modal from "../components/UI/Modal";

export default function NoteEditor() {
  const { id, noteId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { role, user } = useOutletContext() ?? {};
  const isAssistant = role === ROLES.ASSISTANT;
  const isNew = !noteId || noteId === "new";

  const [note, setNote] = useState(null);
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmClose, setConfirmClose] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    // Si es una nueva nota o no hay noteId, no intentar cargar
    if (isNew || !noteId) {
      setLoading(false);
      setError("");
      return;
    }

    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [noteResponse, patientResponse] = await Promise.all([
          getNote(id, noteId),
          getPatient(id).catch(() => null),
        ]);
        if (!active) return;
        setNote(noteResponse);
        if (patientResponse) {
          setPatient(patientResponse);
        }
      } catch (err) {
        if (!active) return;
        const message = err.message || "No pudimos cargar la nota.";
        setError(message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [id, noteId, isNew]);

  useEffect(() => {
    if (isNew) {
      let active = true;
      async function loadPatient() {
        try {
          const patientResp = await getPatient(id);
          if (active) {
            setPatient(patientResp);
          }
        } catch (err) {
          if (active) {
            console.error("Error loading patient:", err);
          }
        }
      }
      loadPatient();
      return () => {
        active = false;
      };
    }
  }, [id, isNew]);

  const patientName = patient ? `${patient.firstName} ${patient.lastName}`.trim() : "Paciente";
  const breadcrumbs = useMemo(
    () => [
      { to: "/patients", label: "Pacientes" },
      { to: `/patients/${id}`, label: patientName },
      { to: `/patients/${id}/notes`, label: "Notas de evolución" },
      { label: isNew ? "Nueva nota" : note?.datetime ? formatDateISOToHuman(note.datetime) : "Editar nota" },
    ],
    [id, patientName, isNew, note?.datetime]
  );

  const context = useMemo(() => {
    const fallbackPatient = note
      ? {
          id: note?.patientId || null,
          firstName: note?.patient?.firstName || null,
          lastName: note?.patient?.lastName || null,
          birthDate: note?.patient?.birthDate || null,
          gender: note?.patient?.gender || null,
        }
      : null;

    return {
      patient: patient ?? fallbackPatient,
      patientId: id || note?.patientId || null,
      professional: {
        id: user?.id,
        name: user?.name,
        license: user?.license || user?.kycRecord?.certificateFolio,
      },
      datetime: note?.datetime || new Date().toISOString(),
    };
  }, [patient, id, note, user]);

  const handleSave = async (payload) => {
    try {
      if (isNew) {
        const created = await createNote(id, {
          ...payload,
          patientId: id,
          professional: context.professional,
          datetime: context.datetime,
          status: "open",
        });
        toast.success("Nota creada correctamente");
        navigate(`/patients/${id}/notes/${created.id}`);
      } else {
        const updated = await updateNote(id, noteId, payload);
        setNote(updated);
        toast.success("Nota actualizada correctamente");
      }
    } catch (err) {
      const message = err.message || "No pudimos guardar la nota.";
      setError(message);
      toast.error(message);
      throw err;
    }
  };

  const handleSaveDraft = async (payload) => {
    try {
      if (isNew) {
        await createNote(id, {
          ...payload,
          patientId: id,
          professional: context.professional,
          datetime: context.datetime,
          status: "open",
          isDraft: true,
        });
        toast.success("Borrador guardado");
        navigate(`/patients/${id}/notes`);
      } else {
        await updateNote(id, noteId, { ...payload, isDraft: true });
        toast.success("Borrador guardado");
      }
    } catch (err) {
      toast.error(err.message || "No pudimos guardar el borrador.");
    }
  };

  const handleCloseNote = async () => {
    if (!note || isAssistant || note.status === "closed" || isNew) {
      return;
    }
    try {
      setClosing(true);
      const updated = await closeNote(id, noteId);
      setNote(updated ?? { ...note, status: "closed", closedAt: new Date().toISOString() });
      toast.success("Nota cerrada correctamente");
      setConfirmClose(false);
    } catch (err) {
      const message = err.message || "No pudimos cerrar la nota.";
      toast.error(message);
    } finally {
      setClosing(false);
    }
  };

  if (loading) {
    return (
      <section className="page stack-4">
        <Breadcrumbs items={breadcrumbs} />
        <p>Cargando nota…</p>
      </section>
    );
  }

  if (error && !note && !isNew) {
    return (
      <section className="page stack-4">
        <Breadcrumbs items={breadcrumbs} />
        <Card hoverable={false}>
          <CardBody>
            <p className="form-error" role="alert">
              {error}
            </p>
            <Button variant="secondary" onClick={() => navigate(-1)}>
              Volver
            </Button>
          </CardBody>
        </Card>
      </section>
    );
  }

  const isClosed = note?.status === "closed";
  const isReadOnly = isAssistant || isClosed;

  return (
    <section className="page stack-5">
      <div className="page-header">
        <Breadcrumbs items={breadcrumbs} />
        <div className="cluster" style={{ justifyContent: "space-between" }}>
          <div className="stack-1">
            <h1>{isNew ? "Nueva nota de evolución" : `Nota del ${formatDateISOToHuman(note?.datetime || new Date().toISOString())}`}</h1>
            {patient ? (
              <p className="helper-text">
                {patient.firstName} {patient.lastName} — CURP {patient.curp || "N/A"}
              </p>
            ) : null}
          </div>
          {!isNew && note && !isClosed && !isAssistant && (
            <Button variant="secondary" onClick={() => setConfirmClose(true)}>
              Cerrar nota
            </Button>
          )}
        </div>
      </div>

      <Card hoverable={false}>
        <CardHeader>
          <h2>{isNew ? "Crear nota" : "Editar nota"}</h2>
        </CardHeader>
        <CardBody>
          {isAssistant ? (
            <p className="helper-text">
              Perfil asistente: no puedes crear o editar notas.
            </p>
          ) : (
            <DynamicClinicalForm
              schema={NOTE_SCHEMA}
              initialData={note || {}}
              onSubmit={handleSave}
              onSaveDraft={handleSaveDraft}
              readOnly={isReadOnly}
              context={context}
              showDraftButton={true}
              submitLabel={isNew ? "Crear nota" : "Guardar cambios"}
              draftLabel="Guardar borrador"
            />
          )}
        </CardBody>
      </Card>

      <Modal
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        title="Cerrar nota"
        footer={
          <div className="cluster">
            <Button variant="ghost" onClick={() => setConfirmClose(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleCloseNote} loading={closing}>
              Confirmar cierre
            </Button>
          </div>
        }
      >
        <p className="helper-text">
          Al cerrar la nota no podrás editarla. Siempre podrás agregar addendums posteriormente.
        </p>
      </Modal>
    </section>
  );
}
