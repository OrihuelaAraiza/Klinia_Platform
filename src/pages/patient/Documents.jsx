import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { getMyDocuments, getAttachmentUrl } from "../../services/patientsService";
import { listPatientDocuments, getDocumentUrl } from "../../services/documentsService";
import { formatDateISOToHuman } from "../../utils/formatters";
import Card, { CardHeader, CardBody } from "../../components/UI/Card";
import Button from "../../components/UI/Button";
import { useToast } from "../../components/UI/Toast";
import { SkeletonTitle, SkeletonList } from "../../components/UI/Skeleton";
import EmptyState from "../../components/UI/EmptyState";
import { Folder, Download, FileText, Calendar } from "lucide-react";

const DOC_TYPE_LABEL = {
  NOTE: "Nota clínica",
  REPORT: "Reporte",
  PRESCRIPTION: "Receta",
  ORDER: "Orden / estudio",
  HISTORY: "Historia clínica",
  OTHER: "Documento",
};

export default function PatientDocuments() {
  const { user } = useOutletContext() ?? {};
  const toast = useToast();
  const patientId = user?.patientId || user?.id;

  const [documents, setDocuments] = useState([]);
  const [generated, setGenerated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!patientId) return;
    let alive = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [attachments, generatedDocs] = await Promise.all([
          getMyDocuments(patientId).catch(() => []),
          listPatientDocuments(patientId).catch(() => []),
        ]);
        if (!alive) return;
        setDocuments(Array.isArray(attachments) ? attachments : []);
        setGenerated(Array.isArray(generatedDocs) ? generatedDocs : []);
      } catch (err) {
        if (alive) {
          setError("No pudimos cargar tus documentos.");
          if (err.status !== 404) toast.error("Error al obtener archivos.");
        }
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();

    // Refresca cuando se genera un nuevo PDF en cualquier parte de la app
    const refresh = () => listPatientDocuments(patientId).then((d) => alive && setGenerated(d || []));
    window.addEventListener("klinia:document-generated", refresh);
    return () => {
      alive = false;
      window.removeEventListener("klinia:document-generated", refresh);
    };
  }, [patientId, toast]);

  const handleDownload = async (blobName, originalName) => {
    try {
      const response = await getAttachmentUrl(patientId, blobName);
      const downloadUrl = response?.url || response?.data?.url;
      if (!downloadUrl) throw new Error();
      window.open(downloadUrl, "_blank");
      toast.success(`Descargando: ${originalName || "Documento"}`);
    } catch {
      toast.error("No se pudo iniciar la descarga. Intenta más tarde.");
    }
  };

  const handleDownloadGenerated = async (doc) => {
    try {
      const url = await getDocumentUrl(doc.id);
      if (!url) throw new Error();
      window.open(url, "_blank");
      toast.success(`Descargando: ${doc.folio}`);
    } catch {
      toast.error("No se pudo abrir el documento.");
    }
  };

  if (loading) {
    return (
      <section className="page stack-5">
        <SkeletonTitle />
        <SkeletonList count={3} />
      </section>
    );
  }

  return (
    <section className="page stack-5">
      <div className="page__header">
        <div className="stack-2">
          <h1>Mis Documentos</h1>
          <p className="helper-text">
            Archivos, estudios y documentos compartidos por tu equipo médico.
          </p>
        </div>
      </div>

      {error ? (
        <Card hoverable={false} className="border-error">
          <CardBody>
            <p className="form-error">{error}</p>
          </CardBody>
        </Card>
      ) : null}

      {/* Documentos generados por la plataforma (notas, recetas, reportes...) */}
      {generated.length > 0 ? (
        <div className="stack-3">
          <h2 className="page__section-title">Generados por tu equipo clínico</h2>
          {generated.map((doc) => (
            <Card key={doc.id} hoverable={false}>
              <CardHeader className="cluster" style={{ justifyContent: "space-between" }}>
                <div className="cluster gap-3">
                  <div className="icon-box variant-soft">
                    <FileText size={20} />
                  </div>
                  <div className="stack-0">
                    <strong className="text-main">
                      {doc.title || DOC_TYPE_LABEL[doc.type] || "Documento"}
                    </strong>
                    <div className="cluster gap-2 helper-text small">
                      <Calendar size={12} />
                      {formatDateISOToHuman(doc.generatedAt)} · Folio {doc.folio}
                      {doc.generatedBy ? ` · ${doc.generatedBy}` : ""}
                    </div>
                  </div>
                </div>
                <span className="badge badge--info no-print">
                  {DOC_TYPE_LABEL[doc.type] || doc.type}
                </span>
              </CardHeader>
              <CardBody>
                <div className="cluster" style={{ justifyContent: "space-between", alignItems: "center" }}>
                  <Button size="sm" onClick={() => handleDownloadGenerated(doc)} className="gap-2">
                    <Download size={16} /> Descargar PDF
                  </Button>
                  {doc.size ? (
                    <span className="helper-text small">{(doc.size / 1024).toFixed(1)} KB</span>
                  ) : null}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      ) : null}

      {/* Adjuntos subidos manualmente */}
      {generated.length === 0 && documents.length === 0 ? (
        <Card hoverable={false}>
          <CardBody>
            <EmptyState
              icon={Folder}
              title="Tu carpeta está vacía"
              message="Aquí aparecerán reportes, recetas y estudios que tu profesional comparta contigo."
            />
          </CardBody>
        </Card>
      ) : documents.length > 0 ? (
        <div className="stack-3">
          <h2 className="page__section-title">Adjuntos personales</h2>
          {documents.map((doc) => (
            <Card key={doc.blobName || doc.id} hoverable={false}>
              <CardHeader className="cluster" style={{ justifyContent: "space-between" }}>
                <div className="cluster gap-3">
                  <div className="icon-box variant-soft">
                    <FileText size={20} />
                  </div>
                  <div className="stack-0">
                    <strong className="text-main">{doc.name || "Archivo sin nombre"}</strong>
                    <div className="cluster gap-2 helper-text small">
                       <Calendar size={12} />
                       {doc.uploadedAt ? formatDateISOToHuman(doc.uploadedAt) : "Fecha no disponible"}
                    </div>
                  </div>
                </div>
                {doc.type && (
                  <span className="badge badge--neutral no-print">{doc.type.split('/')[1]?.toUpperCase() || 'DOC'}</span>
                )}
              </CardHeader>
              <CardBody>
                <div className="cluster" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="cluster gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleDownload(doc.blobName, doc.name)}
                      className="gap-2"
                    >
                      <Download size={16} />
                      Descargar
                    </Button>
                    {doc.size && (
                      <span className="helper-text small">
                        {(doc.size / 1024).toFixed(1)} KB
                      </span>
                    )}
                  </div>
                  <span className="helper-text small italic no-print">
                    Seguro mediante cifrado de extremo a extremo
                  </span>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      ) : null}
    </section>
  );
}