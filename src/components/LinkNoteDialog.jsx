import { useState } from "react";
import Modal from "./UI/Modal";
import Button from "./UI/Button";
import NoteForm from "./NoteForm";
import InputField from "./InputField";
import { useToast } from "./UI/Toast";
import auditService from "../services/auditService";
import { createNote, getNote } from "../services/notesService";
import { linkNote } from "../services/sessionsService";

export default function LinkNoteDialog({
  open,
  onClose,
  session,
  patient,
  professional,
  onLinked,
  allowExisting = true,
}) {
  const toast = useToast();
  const [mode, setMode] = useState("create");
  const [existingNoteId, setExistingNoteId] = useState("");
  const [linkLoading, setLinkLoading] = useState(false);

  if (!session || !patient) {
    return null;
  }

  const handleClose = () => {
    setExistingNoteId("");
    setMode("create");
    onClose?.();
  };

  const handleCreateNote = async (payload) => {
    setLinkLoading(true);
    try {
      const note = await createNote(patient.id, payload);
      await linkNote(session.id, note.id);
      auditService.logAudit("session_note_link", {
        sessionId: session.id,
        patientId: patient.id,
        noteId: note.id,
      });
      toast.success("Nota creada y vinculada a la sesión");
      onLinked?.(note.id, note);
      handleClose();
    } catch (error) {
      toast.error(error?.message || "No fue posible crear la nota.");
      throw error;
    } finally {
      setLinkLoading(false);
    }
  };

  const handleLinkExisting = async (event) => {
    event.preventDefault();
    if (!existingNoteId?.trim()) {
      toast.error("Ingresa el identificador de la nota");
      return;
    }
    setLinkLoading(true);
    try {
      const note = await getNote(patient.id, existingNoteId.trim());
      await linkNote(session.id, existingNoteId.trim());
      auditService.logAudit("session_note_link", {
        sessionId: session.id,
        patientId: patient.id,
        noteId: existingNoteId.trim(),
      });
      toast.success("Nota vinculada correctamente");
      onLinked?.(existingNoteId.trim(), note);
      handleClose();
    } catch (error) {
      toast.error(error?.message || "No encontramos la nota indicada.");
    } finally {
      setLinkLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Vincular nota de evolución"
      footer={null}
    >
      <div className="link-note-dialog">
        <div className="link-note-dialog__tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "create"}
            className={mode === "create" ? "is-active" : ""}
            onClick={() => setMode("create")}
          >
            Crear nueva nota
          </button>
          {allowExisting ? (
            <button
              type="button"
              role="tab"
              aria-selected={mode === "existing"}
              className={mode === "existing" ? "is-active" : ""}
              onClick={() => setMode("existing")}
            >
              Vincular existente
            </button>
          ) : null}
        </div>

        {mode === "existing" ? (
          <form className="stack-3" onSubmit={handleLinkExisting}>
            <InputField
              label="ID de nota"
              name="noteId"
              value={existingNoteId}
              onChange={(event) => setExistingNoteId(event.target.value)}
              placeholder="Ej. note_123"
              required
            />
            <div className="form__actions">
              <Button variant="ghost" type="button" onClick={handleClose} disabled={linkLoading}>
                Cancelar
              </Button>
              <Button type="submit" loading={linkLoading}>
                Vincular nota
              </Button>
            </div>
          </form>
        ) : (
          <NoteForm
            onSubmit={handleCreateNote}
            professional={professional}
            initialValue={{}}
            readOnly={false}
          />
        )}
      </div>
    </Modal>
  );
}
