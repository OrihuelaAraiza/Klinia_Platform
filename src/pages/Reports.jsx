import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import Card, { CardBody, CardHeader } from "../components/UI/Card";
import Button from "../components/UI/Button";
import Breadcrumbs from "../components/UI/Breadcrumbs";
import { useToast } from "../components/UI/Toast";
import { listPatients } from "../services/patientsService";
import { getHistory } from "../services/historyService";
import { exportPatientRecordJson, exportHistoryPdf } from "../services/reportsService";
import { formatDateISOToHuman } from "../utils/formatters";
import { ROLES } from "../utils/constants";

const MAX_LOG_ITEMS = 12;

export default function Reports() {
  const navigate = useNavigate();
  const toast = useToast();
  const { role } = useOutletContext() ?? {};
  const isAssistant = role === ROLES.ASSISTANT;

  const [filters, setFilters] = useState({
    search: "",
    from: "",
    to: "",
    professional: "",
  });

  const [patientsState, setPatientsState] = useState({
    items: [],
    loading: true,
    error: "",
  });

  const [historyCache, setHistoryCache] = useState({});
  const [professionalOptions, setProfessionalOptions] = useState([]);
  const [actionLoading, setActionLoading] = useState("");
  const [downloadLog, setDownloadLog] = useState([]);

  useEffect(() => {
    let alive = true;
    async function loadPatients() {
      setPatientsState((prev) => ({ ...prev, loading: true, error: "" }));
      try {
        const response = await listPatients({ page: 1, size: 50 });
        if (!alive) return;
        const items = Array.isArray(response?.items) ? response.items : Array.isArray(response) ? response : [];
        setPatientsState({ items, loading: false, error: "" });
      } catch (error) {
        if (!alive) return;
        const message = error?.message || "No pudimos cargar la lista de pacientes.";
        setPatientsState({ items: [], loading: false, error: message });
        toast.error(message);
      }
    }
    loadPatients();
    return () => {
      alive = false;
    };
  }, [toast]);

  useEffect(() => {
    if (!patientsState.items.length) {
      setHistoryCache({});
      setProfessionalOptions([]);
      return;
    }

    let cancelled = false;
    async function loadHistories() {
      const entries = {};
      const professionals = new Set();
      await Promise.all(
        patientsState.items.map(async (patient) => {
          try {
            const history = await getHistory(patient.id);
            if (cancelled) return;
            entries[patient.id] = history || null;
            if (history?.professional?.name) {
              professionals.add(history.professional.name);
            }
          } catch (error) {
            if (cancelled) return;
            if (error?.status === 404) {
              entries[patient.id] = null;
            }
          }
        })
      );
      if (!cancelled) {
        setHistoryCache(entries);
        setProfessionalOptions(Array.from(professionals));
      }
    }
    loadHistories();
    return () => {
      cancelled = true;
    };
  }, [patientsState.items]);

  const filteredPatients = useMemo(() => {
    const term = filters.search.trim().toLowerCase();
    const from = filters.from ? new Date(filters.from) : null;
    const to = filters.to ? new Date(filters.to) : null;

    return patientsState.items.filter((patient) => {
      if (term) {
        const name = `${patient.firstName ?? ""} ${patient.lastName ?? ""}`.toLowerCase();
        const curp = (patient.curp ?? "").toLowerCase();
        if (!name.includes(term) && !curp.includes(term)) {
          return false;
        }
      }

      const updatedAt = patient.updatedAt ? new Date(patient.updatedAt) : null;
      if (from && updatedAt && updatedAt < from) return false;
      if (to && updatedAt && updatedAt > to) return false;

      if (filters.professional) {
        const history = historyCache[patient.id];
        const professional = history?.professional?.name ?? "";
        if (!professional.toLowerCase().includes(filters.professional.toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  }, [filters, historyCache, patientsState.items]);

  const pushLog = (entry) => {
    const uniqueId = entry.id ?? (globalThis.crypto?.randomUUID?.() || `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    setDownloadLog((prev) => {
      const next = [{ ...entry, id: uniqueId }, ...prev];
      return next.slice(0, MAX_LOG_ITEMS);
    });
  };

  const handleExportJson = async (patient) => {
    if (isAssistant) return;
    const actionKey = `json-${patient.id}`;
    setActionLoading(actionKey);
    try {
      await exportPatientRecordJson(patient.id, { patient, history: historyCache[patient.id] });
      pushLog({
        id: `${actionKey}-${Date.now()}`,
        type: "Expediente JSON",
        patientName: `${patient.firstName ?? ""} ${patient.lastName ?? ""}`.trim() || patient.curp || patient.id,
        at: new Date().toISOString(),
      });
      toast.success("Expediente JSON generado");
    } catch (error) {
      toast.error(error?.message || "No pudimos exportar el expediente.");
    } finally {
      setActionLoading("");
    }
  };

  const handleExportHistory = async (patient) => {
    if (isAssistant) return;
    const actionKey = `history-${patient.id}`;
    setActionLoading(actionKey);
    try {
      await exportHistoryPdf(patient.id, { patient, history: historyCache[patient.id] });
      pushLog({
        id: `${actionKey}-${Date.now()}`,
        type: "Historia clínica PDF",
        patientName: `${patient.firstName ?? ""} ${patient.lastName ?? ""}`.trim() || patient.curp || patient.id,
        at: new Date().toISOString(),
      });
      toast.success("Historia clínica exportada");
    } catch (error) {
      toast.error(error?.message || "No pudimos exportar la historia clínica.");
    } finally {
      setActionLoading("");
    }
  };

  const breadcrumbs = [
    { to: "/dashboard", label: "Dashboard" },
    { label: "Reportes" },
  ];

  return (
    <section className="page stack-5">
      <div className="page-header">
        <Breadcrumbs items={breadcrumbs} />
        <div className="stack-1">
          <h1>Reportes y exportaciones</h1>
          <p className="helper-text">
            Exporta historias clínicas, expedientes JSON y consulta los registros generados recientemente.
          </p>
        </div>
      </div>

      <div className="reports-layout">
        <div className="reports-main stack-4">
          <Card hoverable={false}>
            <CardHeader>
              <h2>Filtros</h2>
            </CardHeader>
            <CardBody>
              <form className="reports-filters">
                <div className="reports-filters__field">
                  <label htmlFor="search">Paciente o CURP</label>
                  <input
                    id="search"
                    className="input"
                    type="search"
                    value={filters.search}
                    onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
                    placeholder="Ej. Ana Pérez o CURP"
                  />
                </div>
                <div className="reports-filters__field">
                  <label htmlFor="from">Desde</label>
                  <input
                    id="from"
                    className="input"
                    type="date"
                    value={filters.from}
                    onChange={(event) => setFilters((prev) => ({ ...prev, from: event.target.value }))}
                  />
                </div>
                <div className="reports-filters__field">
                  <label htmlFor="to">Hasta</label>
                  <input
                    id="to"
                    className="input"
                    type="date"
                    value={filters.to}
                    onChange={(event) => setFilters((prev) => ({ ...prev, to: event.target.value }))}
                  />
                </div>
                <div className="reports-filters__field">
                  <label htmlFor="professional">Profesional</label>
                  <input
                    id="professional"
                    className="input"
                    list="professionals"
                    value={filters.professional}
                    onChange={(event) => setFilters((prev) => ({ ...prev, professional: event.target.value }))}
                    placeholder="Nombre o cédula"
                  />
                  <datalist id="professionals">
                    {professionalOptions.map((professional) => (
                      <option key={professional} value={professional} />
                    ))}
                  </datalist>
                </div>
              </form>
            </CardBody>
          </Card>

          <Card hoverable={false}>
            <CardHeader>
              <h2>Pacientes</h2>
            </CardHeader>
            <CardBody className="stack-3">
              {patientsState.loading ? (
                <p>Cargando pacientes…</p>
              ) : patientsState.error ? (
                <p className="form-error" role="alert">
                  {patientsState.error}
                </p>
              ) : filteredPatients.length === 0 ? (
                <p className="helper-text">No se encontraron pacientes con los filtros seleccionados.</p>
              ) : (
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Paciente</th>
                        <th>CURP</th>
                        <th>Actualización</th>
                        <th>Profesional</th>
                        <th className="table__actions">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPatients.map((patient) => {
                        const history = historyCache[patient.id];
                        const professionalName = history?.professional?.name ?? "Sin asignar";
                        const hasHistory = Boolean(history);
                        return (
                          <tr key={patient.id}>
                            <td>
                              <strong>
                                {(patient.firstName ?? "") + " " + (patient.lastName ?? "")}
                              </strong>
                            </td>
                            <td>{patient.curp || "—"}</td>
                            <td>{formatDateISOToHuman(patient.updatedAt) || "—"}</td>
                            <td>{professionalName}</td>
                            <td>
                              <div className="table__actions cluster">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleExportJson(patient)}
                                  disabled={isAssistant}
                                  loading={actionLoading === `json-${patient.id}`}
                                >
                                  Expediente JSON
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleExportHistory(patient)}
                                  disabled={isAssistant || !hasHistory}
                                  loading={actionLoading === `history-${patient.id}`}
                                  title={!hasHistory ? "Captura una historia clínica antes de exportar." : undefined}
                                >
                                  Historia PDF
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => navigate(`/patients/${patient.id}/notes`)}
                                >
                                  Ver notas
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <aside className="reports-sidebar stack-4">
          <Card hoverable={false}>
            <CardHeader>
              <h2>Descargas recientes</h2>
            </CardHeader>
            <CardBody className="stack-2">
              {downloadLog.length === 0 ? (
                <p className="helper-text">Aún no hay descargas registradas en esta sesión.</p>
              ) : (
                <ul className="reports-log">
                  {downloadLog.map((item) => (
                    <li key={`${item.id}-${item.at}`} className="reports-log__item">
                      <span className="reports-log__type">{item.type}</span>
                      <span className="reports-log__meta">
                        {item.patientName}
                        <br />
                        <time dateTime={item.at}>
                          {formatDateISOToHuman(item.at)} •{" "}
                          {new Date(item.at).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                        </time>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </aside>
      </div>
    </section>
  );
}
