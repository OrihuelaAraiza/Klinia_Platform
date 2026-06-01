import { useEffect, useMemo, useRef, useState } from "react";
import {
  Brain,
  Stethoscope,
  HeartHandshake,
  Lock,
  Upload,
  FileText,
  Calendar,
} from "lucide-react";
import Card, { CardHeader, CardBody } from "../UI/Card";
import Button from "../UI/Button";
import Badge from "../UI/Badge";
import EmptyState from "../UI/EmptyState";
import { useToast } from "../UI/Toast";
import {
  listAllHistories,
  HISTORY_TYPE_LABEL,
  HISTORY_TYPE_SUBTITLE,
  SPECIALTY_TO_HISTORY_TYPE,
} from "../../services/clinicalHistoryService";
import { registerDocument, listPatientDocuments, getDocumentUrl } from "../../services/documentsService";
import { formatDateISOToHuman } from "../../utils/formatters";
import { getHistoriaSchema } from "../../config/clinicalSchemas/historiaClinica";
import HistoriaClinicaForm from "./HistoriaClinicaForm";
import HistoriaClinicaReadOnly from "./HistoriaClinicaReadOnly";

const TABS = [
  { type: "PSICOLOGICA", label: "Psicológica", icon: Brain, accent: "lilac" },
  { type: "PSIQUIATRICA", label: "Psiquiátrica", icon: Stethoscope, accent: "blue" },
  { type: "PSICOTERAPEUTICA", label: "Psicoterapéutica", icon: HeartHandshake, accent: "peach" },
];

/**
 * Componente unificado para historias clínicas:
 *  - 3 tabs (psicológica / psiquiátrica / psicoterapéutica)
 *  - El tab que corresponde a la especialidad del usuario es editable
 *  - Los otros 2 son de solo lectura
 *  - Cada tab permite subir una versión física (PDF) que se registra como
 *    documento del paciente (folio progresivo, tipo HISTORY)
 *  - Paciente puede ver las 3 sin edición
 *
 * Props:
 *   patientId — id del paciente
 *   role — rol del usuario (PROFESSIONAL / ASSISTANT / PATIENT / ADMIN)
 *   userSpecialty — especialidad del profesional logueado (si aplica)
 *   editor — render-prop que recibe ({ history, onSave, disabled }) y devuelve
 *            el formulario editable (se reusa el wizard existente)
 *   onSaveActive — callback que el editor invoca para persistir la historia activa
 */
export default function ClinicalHistoryTabs({
  patientId,
  role,
  userSpecialty,
  editor,
}) {
  const toast = useToast();
  const isPatient = role === "PATIENT";
  const isAdmin = role === "ADMIN";
  const isAssistant = role === "ASSISTANT";

  // Tab al que el usuario puede editar (en base a su especialidad)
  const editableType = useMemo(() => {
    if (isPatient || isAdmin || isAssistant) return null;
    return SPECIALTY_TO_HISTORY_TYPE[userSpecialty] || null;
  }, [isPatient, isAdmin, isAssistant, userSpecialty]);

  const [activeType, setActiveType] = useState(editableType || "PSICOLOGICA");
  const [byType, setByType] = useState({});
  const [loading, setLoading] = useState(true);
  const [physicalDocs, setPhysicalDocs] = useState([]); // GeneratedDocument type=HISTORY del paciente
  const [uploadingType, setUploadingType] = useState("");
  const fileInputRef = useRef(null);
  const pendingUploadType = useRef("");

  const refresh = async () => {
    if (!patientId) return;
    setLoading(true);
    try {
      const [{ byType: bt }, docs] = await Promise.all([
        listAllHistories(patientId),
        listPatientDocuments(patientId),
      ]);
      setByType(bt || {});
      const histDocs = (docs || []).filter((d) => d.type === "HISTORY");
      setPhysicalDocs(histDocs);
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener("klinia:document-generated", handler);
    return () => window.removeEventListener("klinia:document-generated", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const handleUploadClick = (type) => {
    pendingUploadType.current = type;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !pendingUploadType.current) return;
    if (file.type !== "application/pdf") {
      toast.error("Solo se aceptan archivos PDF para versión física.");
      return;
    }
    const targetType = pendingUploadType.current;
    setUploadingType(targetType);
    try {
      await registerDocument({
        blob: file,
        type: "HISTORY",
        patientId,
        title: `${HISTORY_TYPE_LABEL[targetType]} — versión física`,
      });
      toast.success("Versión física subida y archivada en el expediente.");
      refresh();
    } catch (err) {
      toast.error(err?.message || "No se pudo subir la versión física.");
    } finally {
      setUploadingType("");
      pendingUploadType.current = "";
    }
  };

  const activeHistory = byType[activeType] || null;
  const activeCanEdit = !isPatient && !isAdmin && !isAssistant && editableType === activeType;
  const physicalForActive = physicalDocs.filter(
    (d) => d.title?.startsWith(HISTORY_TYPE_LABEL[activeType])
  );

  return (
    <div className="clinical-history-tabs">
      {/* TABS */}
      <div className="ch-tabs">
        {TABS.map(({ type, label, icon: Icon }) => {
          const isActive = activeType === type;
          const exists = Boolean(byType[type]);
          const isEditable = editableType === type;
          return (
            <button
              key={type}
              type="button"
              className={`ch-tab${isActive ? " is-active" : ""}`}
              onClick={() => setActiveType(type)}
            >
              <Icon size={16} aria-hidden="true" />
              <span>{label}</span>
              {isEditable ? (
                <Badge variant="success" size="sm">Editable</Badge>
              ) : exists ? (
                <Badge variant="info" size="sm">Disponible</Badge>
              ) : (
                <Badge variant="neutral" size="sm">Sin registro</Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* HEADER del tab activo */}
      <div className="ch-tab-header">
        <div>
          <h2>{HISTORY_TYPE_LABEL[activeType]}</h2>
          <p className="helper-text">{HISTORY_TYPE_SUBTITLE[activeType]}</p>
        </div>
        <div className="cluster gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleUploadClick(activeType)}
            loading={uploadingType === activeType}
            disabled={isPatient || isAssistant}
            title={
              isPatient || isAssistant
                ? "Solo el profesional puede archivar versión física"
                : "Sube un PDF físico (escaneo, formato externo, etc.)"
            }
          >
            <Upload size={16} /> Subir versión física
          </Button>
        </div>
      </div>

      {/* BODY del tab — schema-driven (psicológica/psiquiátrica/psicoterapéutica) */}
      {loading ? (
        <Card hoverable={false}>
          <CardBody>
            <p className="helper-text">Cargando historia…</p>
          </CardBody>
        </Card>
      ) : activeCanEdit ? (
        <HistoriaClinicaForm
          schema={getHistoriaSchema(activeType)}
          initial={activeHistory}
          patientId={patientId}
          onSaved={() => refresh()}
        />
      ) : activeHistory ? (
        <HistoriaClinicaReadOnly
          schema={getHistoriaSchema(activeType)}
          history={activeHistory}
        />
      ) : (
        <Card hoverable={false}>
          <CardBody>
            <EmptyState
              icon={Lock}
              title={`Sin ${HISTORY_TYPE_LABEL[activeType].toLowerCase()} registrada`}
              message={
                isPatient
                  ? "Aún no se ha registrado esta historia. Cuando el profesional correspondiente la complete, aparecerá aquí."
                  : "Esta historia clínica aún no ha sido creada por el profesional correspondiente. Puedes archivar una versión física desde el botón de arriba."
              }
            />
          </CardBody>
        </Card>
      )}

      {/* Versiones físicas archivadas */}
      {physicalForActive.length > 0 ? (
        <Card hoverable={false} style={{ marginTop: "1rem" }}>
          <CardHeader>
            <h3>Versiones físicas archivadas</h3>
          </CardHeader>
          <CardBody>
            <ul className="ch-physical-list">
              {physicalForActive.map((doc) => (
                <li key={doc.id} className="ch-physical-item">
                  <div className="cluster gap-2 align-center">
                    <FileText size={18} />
                    <div>
                      <strong>{doc.folio}</strong>
                      <p className="helper-text small">
                        <Calendar size={12} aria-hidden="true" />{" "}
                        {formatDateISOToHuman(doc.generatedAt)}
                        {doc.generatedBy ? ` · ${doc.generatedBy}` : ""}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      const url = await getDocumentUrl(doc.id);
                      if (url) window.open(url, "_blank");
                    }}
                  >
                    Abrir
                  </Button>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}

