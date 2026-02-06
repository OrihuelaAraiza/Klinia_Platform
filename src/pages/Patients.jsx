import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
// Corregir rutas de importación de componentes/servicios
import Button from "../components/UI/Button.jsx";
import Drawer from "../components/UI/Drawer.jsx";
import Modal from "../components/UI/Modal.jsx";
import Breadcrumbs from "../components/UI/Breadcrumbs.jsx";
import { Table, TableEmpty } from "../components/UI/Table.jsx";
import PatientForm from "../components/PatientForm.jsx";
import auditService from "../services/auditService.js";
import {
  listPatients,
  createPatient,
  updatePatient,
} from "../services/patientsService.js";
import cieCatalog from "../assets/data/cie10-min.json";
import { ROLES } from "../utils/constants.js";
import InputField from "../components/InputField.jsx";
import { formatDateISOToHuman } from "../utils/formatters.js";
import { useToast } from "../components/UI/Toast.jsx";

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
    const fullPayload = {
      // 1. Identidad
      firstName: payload.firstName,
      lastName: payload.lastName,
      curp: payload.curp?.toUpperCase() || "", // Cambiado null por ""
      birthDate: payload.birthDate,
      gender: payload.gender,
      genderIdentity: payload.genderIdentity || "", // Zod esperaba string

      // 2. Contacto
      phone: payload.phone,
      email: payload.email,
      homePhone: payload.homePhone || "",
      workPhone: payload.workPhone || "",

      // 3. Dirección
      street: payload.street || "",
      postalCode: payload.postalCode || "",
      neighborhood: payload.neighborhood || "",
      state: payload.state || "",
      municipality: payload.city || payload.municipality || "",

      // 4. Información adicional
      rfc: payload.rfc?.toUpperCase() || "",
      nationality: payload.nationality || "Mexicana",
      occupation: payload.occupation || "",
      civilStatus: payload.civilStatus || "",
      religion: payload.religion || "", // Zod esperaba string
      education: payload.education || "", // Zod esperaba string

      // 5. Emergencia y Responsables
      emergencyName: payload.emergencyName,
      emergencyPhone: payload.emergencyPhone,
      emergencyRelation: payload.emergencyRelation || "",
      legalGuardianName: payload.legalGuardianName || "",
      legalGuardianRelation: payload.legalGuardianRelation || "",
      legalGuardianPhone: payload.legalGuardianPhone || "",

      // 6. Otros
      referral: payload.referral,
      purpose: payload.purpose,
      attachments: payload.attachments || [],
    };

    console.log("🚀 Enviando Payload Corregido:", fullPayload);
    

    try {
      if (editingPatient) {
        await updatePatient(editingPatient.id, fullPayload);
        toast.success("Expediente actualizado");
      } else {
        await createPatient(fullPayload);
        toast.success("Paciente registrado con éxito");
      }
      await refreshList();
      handleCloseDrawer();
    } catch (err) {
      const msg = err.response?.data?.message || "Error al procesar la solicitud";
      toast.error(msg);
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
          <Table
            density="compact"
            aria-label="Listado de pacientes"
            className="table--responsive"
          >
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
                      <div className="cluster" style={{ gap: "0.5rem" }}>
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          onClick={() => navigate(`/patients/${patient.id}/notes`)}
                          style={{ minWidth: "auto", padding: "0.35rem 0.75rem" }}
                        >
                          Notas
                        </Button>
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
                      </div>
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