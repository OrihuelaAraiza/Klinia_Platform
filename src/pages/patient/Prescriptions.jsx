import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { listByPatient as listPrescriptions } from "../../services/prescriptionsService";
import { formatDateISOToHuman } from "../../utils/formatters";
import Card, { CardHeader, CardBody } from "../../components/UI/Card";
import Badge from "../../components/UI/Badge";
import Button from "../../components/UI/Button";
import { useToast } from "../../components/UI/Toast";

/**
 * Vista de Prescripciones para pacientes
 * Muestra prescripciones activas e historial
 */
export default function PatientPrescriptions() {
  const { user } = useOutletContext() ?? {};
  const toast = useToast();
  const patientId = user?.id;

  const [prescriptions, setPrescriptions] = useState([]);
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
        const response = await listPrescriptions(patientId);
        if (!alive) return;
        const items = Array.isArray(response) ? response : [];
        // Ordenar: activas primero, luego por fecha
        const sorted = items.sort((a, b) => {
          if (a.suspended !== b.suspended) return a.suspended ? 1 : -1;
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        });
        setPrescriptions(sorted);
      } catch (err) {
        if (!alive) return;
        const message = err.message || "No pudimos cargar tus prescripciones.";
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
  }, [patientId, toast]);

  const activePrescriptions = prescriptions.filter((p) => !p.suspended && !p.completed);
  const inactivePrescriptions = prescriptions.filter((p) => p.suspended || p.completed);

  const handleDownloadPDF = (prescriptionId) => {
    // Stub: implementar cuando el backend lo soporte
    toast.success("Descarga de PDF (stub)");
  };

  if (loading) {
    return (
      <section className="page stack-4">
        <div className="page__header">
          <h1>Mis Prescripciones</h1>
        </div>
        <p>Cargando tus prescripciones...</p>
      </section>
    );
  }

  return (
    <section className="page stack-5">
      <div className="page__header">
        <div className="stack-2">
          <h1>Mis Prescripciones</h1>
          <p className="helper-text">
            Aquí puedes ver tus prescripciones activas y el historial de indicaciones médicas.
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
      ) : (
        <div className="stack-5">
          {/* Prescripciones activas */}
          {activePrescriptions.length > 0 && (
            <div className="stack-3">
              <h2>Prescripciones activas</h2>
              <div className="stack-3">
                {activePrescriptions.map((prescription) => (
                  <Card key={prescription.id} hoverable={false}>
                    <CardHeader className="cluster" style={{ justifyContent: "space-between" }}>
                      <div className="stack-1">
                        <strong>
                          {prescription.substance || "Medicamento"}
                          {prescription.form ? ` - ${prescription.form}` : ""}
                        </strong>
                        {prescription.createdAt && (
                          <span className="helper-text">
                            Prescrita el {formatDateISOToHuman(prescription.createdAt)}
                          </span>
                        )}
                      </div>
                      <Badge variant="success">Activa</Badge>
                    </CardHeader>
                    <CardBody className="stack-3">
                      <div className="stack-2">
                        {prescription.dose && (
                          <p>
                            <strong>Dosis:</strong> {prescription.dose}
                          </p>
                        )}
                        {prescription.frequency && (
                          <p>
                            <strong>Frecuencia:</strong> {prescription.frequency}
                          </p>
                        )}
                        {prescription.duration && (
                          <p>
                            <strong>Duración:</strong> {prescription.duration}
                          </p>
                        )}
                        {prescription.notes && (
                          <div className="stack-1">
                            <strong>Indicaciones:</strong>
                            <p className="helper-text">{prescription.notes}</p>
                          </div>
                        )}
                      </div>
                      {prescription.folio && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDownloadPDF(prescription.id)}
                        >
                          Descargar PDF
                        </Button>
                      )}
                    </CardBody>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Historial */}
          {inactivePrescriptions.length > 0 && (
            <div className="stack-3">
              <h2>Historial de prescripciones</h2>
              <div className="stack-3">
                {inactivePrescriptions.map((prescription) => (
                  <Card key={prescription.id} hoverable={false}>
                    <CardHeader className="cluster" style={{ justifyContent: "space-between" }}>
                      <div className="stack-1">
                        <strong>
                          {prescription.substance || "Medicamento"}
                          {prescription.form ? ` - ${prescription.form}` : ""}
                        </strong>
                        {prescription.createdAt && (
                          <span className="helper-text">
                            Prescrita el {formatDateISOToHuman(prescription.createdAt)}
                          </span>
                        )}
                      </div>
                      <Badge variant={prescription.suspended ? "warning" : "neutral"}>
                        {prescription.suspended ? "Suspendida" : "Completada"}
                      </Badge>
                    </CardHeader>
                    <CardBody>
                      {prescription.notes && (
                        <p className="helper-text">{prescription.notes}</p>
                      )}
                    </CardBody>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {prescriptions.length === 0 && (
            <Card hoverable={false}>
              <CardBody>
                <div className="stack-3" style={{ textAlign: "center", padding: "var(--s-8)" }}>
                  <p className="helper-text">
                    Aún no tienes prescripciones registradas. Tu profesional de salud
                    creará prescripciones cuando sea necesario.
                  </p>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      )}
    </section>
  );
}

