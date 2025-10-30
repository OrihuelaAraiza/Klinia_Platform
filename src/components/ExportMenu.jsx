import { useEffect, useRef, useState } from "react";
import Button from "./UI/Button";
import Card, { CardBody } from "./UI/Card";
import { useToast } from "./UI/Toast";
import { formatDateISOToHuman } from "../utils/formatters";
import {
  fetchPatientBundle,
  exportHistoryPdf,
  exportNotePdf,
  exportPatientRecordJson,
} from "../services/reportsService";

export default function ExportMenu({ patientId, patient, consents, disabled = false, onExport }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState("");
  const [bundle, setBundle] = useState(null);
  const [bundleLoaded, setBundleLoaded] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open || bundleLoaded || disabled) {
      return;
    }
    let alive = true;
    setLoading(true);
    fetchPatientBundle(patientId, { patient, consents })
      .then((data) => {
        if (!alive) return;
        setBundle(data);
        setBundleLoaded(true);
      })
      .catch((error) => {
        if (!alive) return;
        toast.error(error?.message || "No pudimos cargar datos para exportar.");
      })
      .finally(() => {
        if (alive) {
          setLoading(false);
        }
      });
    return () => {
      alive = false;
    };
  }, [open, bundleLoaded, disabled, patientId, patient, consents, toast]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const withAction = async (action, meta) => {
    setLoadingAction(action);
    try {
      const overrides = bundleLoaded ? bundle : undefined;
      const result = await meta.executor(overrides);
      onExport?.({
        type: meta.type,
        patientId,
        noteId: meta.noteId,
        at: new Date().toISOString(),
      });
      toast.success(meta.successMessage);
      return result;
    } catch (error) {
      toast.error(error?.message || meta.errorMessage);
      throw error;
    } finally {
      setLoadingAction("");
      setOpen(false);
    }
  };

  const handleExportJson = () =>
    withAction("json", {
      type: "json",
      successMessage: "Expediente JSON generado",
      errorMessage: "No pudimos generar el expediente JSON.",
      executor: (overrides) => exportPatientRecordJson(patientId, overrides),
    });

  const handleExportHistory = () =>
    withAction("history", {
      type: "history",
      successMessage: "Historia clínica exportada",
      errorMessage: "No pudimos generar el PDF de historia clínica.",
      executor: (overrides) => exportHistoryPdf(patientId, overrides),
    });

  const handleExportNote = (note) =>
    withAction(`note-${note.id}`, {
      type: "note",
      noteId: note.id,
      successMessage: "Nota exportada",
      errorMessage: "No pudimos generar el PDF de la nota.",
      executor: (overrides) => exportNotePdf(patientId, note, overrides),
    });

  const availableHistory = bundleLoaded ? Boolean(bundle?.history) : true;
  const availableNotes = bundleLoaded ? Array.isArray(bundle?.notes) && bundle.notes.length > 0 : true;

  return (
    <div className="export-menu" ref={menuRef}>
      <Button
        variant="secondary"
        onClick={() => setOpen((prev) => !prev)}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-busy={Boolean(loadingAction)}
      >
        {loadingAction ? "Generando…" : "Exportar"}
      </Button>
      {open ? (
        <Card
          className="export-menu__panel"
          hoverable={false}
          role="menu"
          aria-label="Exportaciones"
        >
          <CardBody className="stack-2">
            <button
              type="button"
              className="export-menu__item"
              onClick={handleExportJson}
              disabled={loading}
              aria-busy={loadingAction === "json"}
            >
              Expediente (JSON)
            </button>
            <button
              type="button"
              className="export-menu__item"
              onClick={handleExportHistory}
              disabled={loading || !availableHistory}
              aria-busy={loadingAction === "history"}
              title={!availableHistory ? "No hay historia clínica registrada." : undefined}
            >
              Historia clínica (PDF)
            </button>
            <div className="export-menu__group" role="group" aria-label="Notas PDF">
              <span className="export-menu__group-label">Notas (PDF)</span>
              {loading ? (
                <span className="helper-text">Cargando notas…</span>
              ) : !availableNotes ? (
                <span className="helper-text">No hay notas registradas.</span>
              ) : (
                <ul className="export-menu__notes">
                  {(bundle?.notes ?? []).map((note) => (
                    <li key={note.id}>
                      <button
                        type="button"
                        className="export-menu__item export-menu__item--nested"
                        onClick={() => handleExportNote(note)}
                        disabled={loadingAction === `note-${note.id}`}
                        aria-busy={loadingAction === `note-${note.id}`}
                      >
                        {formatDateISOToHuman(note.datetime)}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
