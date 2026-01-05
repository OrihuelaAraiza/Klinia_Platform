import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { getMyDocuments, getMyProfile } from "../../services/patientsService";
import { formatDateISOToHuman } from "../../utils/formatters";
import Card, { CardHeader, CardBody } from "../../components/UI/Card";
import Button from "../../components/UI/Button";
import { useToast } from "../../components/UI/Toast";

/**
 * Vista de Documentos para pacientes
 * Muestra documentos compartidos por el profesional
 */
export default function PatientDocuments() {
  const { user } = useOutletContext() ?? {};
  const toast = useToast();
  const patientId = user?.id;

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        // Intentar primero con endpoint específico para pacientes
        const attachments = await getMyDocuments();
        if (!alive) return;
        setDocuments(attachments);
      } catch (err) {
        if (!alive) return;
        // Si el endpoint no existe, intentar obtener desde el perfil como fallback
        if (err.status === 404 && patientId) {
          try {
            const { getPatient } = await import("../../services/patientsService");
            const patient = await getPatient(patientId);
            const attachments = Array.isArray(patient?.attachments) ? patient.attachments : [];
            setDocuments(attachments);
            return;
          } catch (fallbackErr) {
            // Continuar con el error original
          }
        }
        const message = err.message || "No pudimos cargar tus documentos.";
        setError(message);
        toast.error(message);
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
  }, [toast, patientId]);

  const handleDownload = async (blobName) => {
    try {
      // Intentar primero con endpoint específico para pacientes
      const { api } = await import("../../services/apiClient");
      const response = await api.get(`/patient/documents/${encodeURIComponent(blobName)}/url`, { auth: true });
      const downloadUrl = response.url || response.data?.url;

      if (downloadUrl) {
        window.open(downloadUrl, "_blank");
        toast.success("Descarga iniciada");
      } else {
        // Fallback al método tradicional si está disponible
        if (patientId) {
          const { getAttachmentUrl } = await import("../../services/patientsService");
          const fallbackResponse = await getAttachmentUrl(patientId, blobName);
          const fallbackUrl = fallbackResponse.url || fallbackResponse.data?.url;
          if (fallbackUrl) {
            window.open(fallbackUrl, "_blank");
            toast.success("Descarga iniciada");
            return;
          }
        }
        toast.error("No se pudo obtener la URL de descarga");
      }
    } catch (err) {
      console.error(err);
      // Intentar fallback si el endpoint específico falla
      if (patientId) {
        try {
          const { getAttachmentUrl } = await import("../../services/patientsService");
          const response = await getAttachmentUrl(patientId, blobName);
          const downloadUrl = response.url || response.data?.url;
          if (downloadUrl) {
            window.open(downloadUrl, "_blank");
            toast.success("Descarga iniciada");
            return;
          }
        } catch (fallbackErr) {
          // Continuar con el error original
        }
      }
      toast.error("No se pudo descargar el documento");
    }
  };

  if (loading) {
    return (
      <section className="page stack-4">
        <div className="page__header">
          <h1>Mis Documentos</h1>
        </div>
        <p>Cargando tus documentos...</p>
      </section>
    );
  }

  return (
    <section className="page stack-5">
      <div className="page__header">
        <div className="stack-2">
          <h1>Mis Documentos</h1>
          <p className="helper-text">
            Aquí puedes ver y descargar los documentos compartidos por tu profesional de salud.
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
      ) : documents.length === 0 ? (
        <Card hoverable={false}>
          <CardBody>
            <div className="stack-3" style={{ textAlign: "center", padding: "var(--s-8)" }}>
              <p className="helper-text">
                Aún no hay documentos compartidos. Tu profesional de salud
                compartirá documentos relevantes aquí cuando sea necesario.
              </p>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="stack-3">
          {documents.map((doc) => (
            <Card key={doc.id || doc.blobName} hoverable={false}>
              <CardHeader className="cluster" style={{ justifyContent: "space-between" }}>
                <div className="stack-1">
                  <strong>{doc.name || doc.blobName || "Documento"}</strong>
                  {doc.uploadedAt && (
                    <span className="helper-text">
                      Compartido el {formatDateISOToHuman(doc.uploadedAt)}
                    </span>
                  )}
                </div>
                {doc.type && (
                  <span className="helper-text">{doc.type}</span>
                )}
              </CardHeader>
              <CardBody>
                <div className="cluster" style={{ gap: "var(--s-2)" }}>
                  <Button
                    size="sm"
                    onClick={() => handleDownload(doc.blobName || doc.name)}
                  >
                    Descargar
                  </Button>
                  {doc.size && (
                    <span className="helper-text">
                      Tamaño: {(doc.size / 1024).toFixed(2)} KB
                    </span>
                  )}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

