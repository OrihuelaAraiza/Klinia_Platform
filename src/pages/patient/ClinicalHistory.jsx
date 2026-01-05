import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { getClinicalHistory } from "../../services/clinicalHistoryService";
import Card, { CardHeader, CardBody } from "../../components/UI/Card";
import { useToast } from "../../components/UI/Toast";

/**
 * Vista de Historia Clínica para pacientes
 * Muestra solo información permitida en modo lectura
 */
export default function PatientClinicalHistory() {
  const { user } = useOutletContext() ?? {};
  const toast = useToast();
  const patientId = user?.id;

  const [history, setHistory] = useState(null);
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
        const response = await getClinicalHistory(patientId);
        if (!alive) return;
        setHistory(response);
      } catch (err) {
        if (!alive) return;
        if (err.status === 404) {
          setHistory(null);
        } else {
          const message = err.message || "No pudimos cargar tu historia clínica.";
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
  }, [patientId, toast]);

  if (loading) {
    return (
      <section className="page stack-4">
        <div className="page__header">
          <h1>Mi Historia Clínica</h1>
        </div>
        <p>Cargando tu información...</p>
      </section>
    );
  }

  if (error && !history) {
    return (
      <section className="page stack-4">
        <div className="page__header">
          <h1>Mi Historia Clínica</h1>
        </div>
        <Card hoverable={false}>
          <CardBody>
            <p className="form-error" role="alert">
              {error}
            </p>
          </CardBody>
        </Card>
      </section>
    );
  }

  if (!history) {
    return (
      <section className="page stack-4">
        <div className="page__header">
          <h1>Mi Historia Clínica</h1>
          <p className="helper-text">
            Tu historia clínica está siendo completada por tu profesional de salud.
          </p>
        </div>
        <Card hoverable={false}>
          <CardBody>
            <div className="stack-3" style={{ textAlign: "center", padding: "var(--s-8)" }}>
              <p className="helper-text">
                Tu expediente clínico aún no está disponible. Tu profesional de salud
                completará esta información durante tus consultas.
              </p>
            </div>
          </CardBody>
        </Card>
      </section>
    );
  }

  // Filtrar y mostrar solo información permitida para pacientes
  const allowedSections = [
    { key: "datosGenerales", label: "Datos Generales", data: history.datosGenerales },
    { key: "antecedentes", label: "Antecedentes", data: history.antecedentes },
    // Excluir información técnica sensible como diagnósticos internos
  ];

  return (
    <section className="page stack-5">
      <div className="page__header">
        <div className="stack-2">
          <h1>Mi Historia Clínica</h1>
          <p className="helper-text">
            Esta es la información de tu expediente clínico. Si necesitas actualizar algo,
            contacta a tu profesional de salud.
          </p>
        </div>
      </div>

      {history.isDraft && (
        <Card hoverable={false} style={{ borderLeft: "4px solid var(--warning)" }}>
          <CardBody>
            <p className="helper-text">
              <strong>Nota:</strong> Tu historia clínica está en proceso de completarse.
            </p>
          </CardBody>
        </Card>
      )}

      <div className="stack-4">
        {allowedSections.map((section) => {
          if (!section.data) return null;
          return (
            <Card key={section.key} hoverable={false}>
              <CardHeader>
                <h2>{section.label}</h2>
              </CardHeader>
              <CardBody>
                <div className="stack-3">
                  {Object.entries(section.data).map(([key, value]) => {
                    if (!value || (typeof value === "object" && Object.keys(value).length === 0)) {
                      return null;
                    }
                    const label = key
                      .replace(/([A-Z])/g, " $1")
                      .replace(/^./, (str) => str.toUpperCase())
                      .trim();
                    return (
                      <div key={key} className="stack-1">
                        <strong>{label}:</strong>
                        <p className="helper-text">
                          {typeof value === "object" ? JSON.stringify(value, null, 2) : String(value)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </CardBody>
            </Card>
          );
        })}

        {history.updatedAt && (
          <Card hoverable={false}>
            <CardBody>
              <p className="helper-text">
                <strong>Última actualización:</strong>{" "}
                {new Date(history.updatedAt).toLocaleString("es-MX")}
              </p>
            </CardBody>
          </Card>
        )}
      </div>
    </section>
  );
}

