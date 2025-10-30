import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Button from "../components/UI/Button";
import Drawer from "../components/UI/Drawer";
import Modal from "../components/UI/Modal";
import Breadcrumbs from "../components/UI/Breadcrumbs";
import { Table, TableEmpty } from "../components/UI/Table";
import PatientForm from "../components/PatientForm";
import auditService from "../services/auditService";
import {
  listPatients,
  createPatient,
  updatePatient,
} from "../services/patientsService";
import cieCatalog from "../assets/data/cie10-min.json";
import { ROLES } from "../utils/constants";
import InputField from "../components/InputField";
import { formatDateISOToHuman } from "../utils/formatters";
import { useToast } from "../components/UI/Toast";

const DEFAULT_PAGE_SIZE = 10;

function getAge(birthDate) {
  if (!birthDate) return "-";
  const date = new Date(birthDate);
  if (Number.isNaN(date.getTime())) return "-";
  const diff = Date.now() - date.getTime();
  const ageDate = new Date(diff);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
}

const rowVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

export default function Patients() {
  const { role } = useOutletContext() ?? {};
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const isAssistant = role === ROLES.ASSISTANT;

  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [cieModalOpen, setCieModalOpen] = useState(false);
  const [cieQuery, setCieQuery] = useState("");
  const [page] = useState(1);

  useEffect(() => {
    auditService.logAudit("patient_list", {});
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function fetchPatients() {
      setLoading(true);
      setError("");
      try {
        const result = await listPatients({ q: query, page, size: DEFAULT_PAGE_SIZE, signal: controller.signal });
        if (!active) return;
        const items = result?.items ?? result ?? [];
        setPatients(items);
      } catch (err) {
        if (!active) return;
        if (err.status === 404) {
          setPatients([]);
          setError("No se encontraron pacientes. Puedes registrar uno nuevo.");
        } else {
          const message = err.message || "No pudimos cargar los pacientes.";
          setError(message);
          toast.error(message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchPatients();

    return () => {
      active = false;
      controller.abort();
    };
  }, [query, page, toast]);

  useEffect(() => {
    if (!searchTerm) {
      setQuery("");
      return undefined;
    }
    const handle = setTimeout(() => {
      setQuery(searchTerm.trim());
      auditService.logAudit("patient_search", { q: searchTerm.trim() });
    }, 300);
    return () => clearTimeout(handle);
  }, [searchTerm]);

  useEffect(() => {
    const editId = location.state?.editId;
    if (!editId || loading) {
      return;
    }
    const match = patients.find((item) => item.id === editId);
    if (match) {
      handleOpenEdit(match);
      navigate(location.pathname, { replace: true });
    }
  }, [location.state, patients, loading, navigate, location.pathname]);

  const cieResults = useMemo(() => {
    if (!cieQuery.trim()) {
      return cieCatalog;
    }
    const qLower = cieQuery.trim().toLowerCase();
    return cieCatalog.filter(
      (entry) =>
        entry.code.toLowerCase().includes(qLower) ||
        entry.label.toLowerCase().includes(qLower)
    );
  }, [cieQuery]);

  const handleOpenCreate = () => {
    setEditingPatient(null);
    setDrawerOpen(true);
  };

  const handleOpenEdit = (patient) => {
    setEditingPatient(patient);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setEditingPatient(null);
  };

  const refreshList = async () => {
    try {
      const result = await listPatients({ q: query, page, size: DEFAULT_PAGE_SIZE });
      setPatients(result?.items ?? result ?? []);
    } catch (err) {
      if (err.status === 404) {
        setPatients([]);
      } else {
        toast.error(err.message || "No pudimos actualizar la lista.");
      }
    }
  };

  const handleCreateOrUpdate = async (payload) => {
    const basePayload = {
      firstName: payload.firstName,
      lastName: payload.lastName,
      curp: payload.curp.toUpperCase(),
      birthDate: payload.birthDate,
      sex: payload.sex,
      phone: payload.phone,
      email: payload.email,
      attachments: payload.attachments,
    };

    try {
      if (editingPatient) {
        await updatePatient(editingPatient.id, basePayload);
        auditService.logAudit("patient_update", {
          id: editingPatient.id,
          curp: basePayload.curp,
        });
        toast.success("Paciente actualizado correctamente");
      } else {
        const created = await createPatient(basePayload);
        auditService.logAudit("patient_create", {
          id: created?.id,
          curp: basePayload.curp,
        });
        toast.success("Paciente creado");
      }

      await refreshList();
      handleCloseDrawer();
    } catch (err) {
      const message = err.message || "No pudimos guardar el paciente.";
      setError(message);
      toast.error(message);
      throw err;
    }
  };

  const breadcrumbs = useMemo(
    () => [
      { to: "/dashboard", label: "Dashboard" },
      { label: "Pacientes" },
    ],
    []
  );

  return (
    <section className="page">
      <div className="page-header page-header--sticky">
        <Breadcrumbs items={breadcrumbs} />
        <div className="cluster">
          <div className="stack-2">
            <h1>Pacientes</h1>
            <p className="helper-text">
              Gestiona expedientes cumpliendo con NOM-004/NOM-024.
            </p>
          </div>
          <div className="cluster patients-header__actions">
            <InputField
              label="Buscar pacientes"
              placeholder="Nombre, CURP o email"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              name="patient-search"
              assistiveText="La búsqueda se actualiza automáticamente"
            />
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setCieModalOpen(true);
                setCieQuery("");
              }}
            >
              Ver catálogo CIE-10
            </Button>
            {!isAssistant ? (
              <Button onClick={handleOpenCreate}>Nuevo paciente</Button>
            ) : null}
          </div>
        </div>
      </div>

      {error ? (
        <div className="panel panel--outline" role="alert">
          {error}
        </div>
      ) : null}

      <div className="panel">
        {loading ? (
          <p>Cargando pacientes…</p>
        ) : patients.length === 0 ? (
          <TableEmpty
            title="No hay pacientes registrados"
            description="Crea tu primer expediente clínico para comenzar a documentar sesiones."
            action={
              !isAssistant ? (
                <Button onClick={handleOpenCreate}>Crear paciente</Button>
              ) : null
            }
          />
        ) : (
          <Table density="compact" aria-label="Listado de pacientes">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>CURP</th>
                <th>Edad</th>
                <th>Teléfono</th>
                <th>Correo</th>
                <th>Actualizado</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {patients.map((patient) => (
                  <motion.tr
                    key={patient.id}
                    variants={rowVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    transition={{ duration: 0.25, ease: "easeOut" }}
                  >
                    <td>
                      <button
                        type="button"
                        className="link link--button"
                        onClick={() => navigate(`/patients/${patient.id}`)}
                      >
                        {`${patient.firstName} ${patient.lastName}`.trim() || "Sin nombre"}
                      </button>
                    </td>
                    <td>{patient.curp}</td>
                    <td>{getAge(patient.birthDate)}</td>
                    <td>{patient.phone || "-"}</td>
                    <td>{patient.email || "-"}</td>
                    <td>{formatDateISOToHuman(patient.updatedAt)}</td>
                    <td>
                      {!isAssistant ? (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenEdit(patient)}
                        >
                          Editar
                        </Button>
                      ) : (
                        <span className="helper-text">Solo lectura</span>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </Table>
        )}
      </div>

      <Drawer
        open={drawerOpen}
        onClose={handleCloseDrawer}
        title={editingPatient ? "Editar paciente" : "Nuevo paciente"}
      >
        <PatientForm
          initialValue={editingPatient}
          onSubmit={handleCreateOrUpdate}
          onCancel={handleCloseDrawer}
          readOnly={Boolean(isAssistant)}
        />
      </Drawer>

      <Modal
        open={cieModalOpen}
        onClose={() => setCieModalOpen(false)}
        title="Catálogo CIE-10 (subset)"
      >
        <div className="stack-3">
          <InputField
            label="Buscar en catálogo"
            placeholder="Código o descripción"
            value={cieQuery}
            onChange={(event) => setCieQuery(event.target.value)}
            name="cie-search"
          />
          <ul className="cie-list">
            {cieResults.map((entry) => (
              <li key={entry.code}>
                <strong>{entry.code}</strong> — {entry.label}
              </li>
            ))}
          </ul>
        </div>
      </Modal>
    </section>
  );
}
