import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { getMyDocuments, getAttachmentUrl } from "../../services/patientsService";
import { formatDateISOToHuman } from "../../utils/formatters";
import Card, { CardHeader, CardBody } from "../../components/UI/Card";
import Button from "../../components/UI/Button";
import { useToast } from "../../components/UI/Toast";
import { SkeletonTitle, SkeletonList } from "../../components/UI/Skeleton";
import EmptyState from "../../components/UI/EmptyState";
import { Folder, Download, FileText, Calendar } from "lucide-react";

export default function PatientDocuments() {
  const { user } = useOutletContext() ?? {};
  const toast = useToast();
  const patientId = user?.id;

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!patientId) return;

    let alive = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const attachments = await getMyDocuments(patientId);
        if (alive) setDocuments(attachments);
      } catch (err) {
        if (alive) {
          setError("No pudimos cargar tus documentos compartidos.");
          if (err.status !== 404) toast.error("Error al obtener archivos.");
        }
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, [patientId, toast]);

  const handleDownload = async (blobName, originalName) => {
    const loadingToast = toast.info("Generando enlace de descarga...", { duration: 2000 });
    try {
      const response = await getAttachmentUrl(patientId, blobName);
      const downloadUrl = response.url || response.data?.url;

      if (!downloadUrl) throw new Error();

      // Abrir en pestaña nueva para iniciar descarga
      window.open(downloadUrl, "_blank");
      toast.success(`Descargando: ${originalName || 'Documento'}`);
    } catch (err) {
      toast.error("No se pudo iniciar la descarga. Intenta más tarde.");
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
      ) : documents.length === 0 ? (
        <Card hoverable={false}>
          <CardBody>
            <EmptyState
              icon={Folder}
              title="Tu carpeta está vacía"
              message="Aquí aparecerán estudios, resultados o guías que tu profesional comparta contigo durante tu tratamiento."
            />
          </CardBody>
        </Card>
      ) : (
        <div className="stack-3">
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
      )}
    </section>
  );
}