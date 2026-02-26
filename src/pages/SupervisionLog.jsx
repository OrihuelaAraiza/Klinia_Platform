import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SignatureCanvas from "react-signature-canvas";
import Card, { CardBody, CardHeader } from "../components/UI/Card";
import Button from "../components/UI/Button";
import Badge from "../components/UI/Badge";
import { useToast } from "../components/UI/Toast";
import { listPatients } from "../services/patientsService";
import { getProfessionalsList } from "../services/patientsService";
import { createSupervisionLog, listSupervisionLogs, deleteSupervisionLog } from "../services/supervisionService";
import { formatDateISOToHuman } from "../utils/formatters";
import InputField from "../components/InputField";
import Modal from "../components/UI/Modal";

export default function SupervisionLog() {
    const navigate = useNavigate();
    const toast = useToast();
    const sigCanvas = useRef({});

    // Vista: "list" o "form"
    const [view, setView] = useState("list");
    const [detailLog, setDetailLog] = useState(null);

    // Datos para los buscadores
    const [patients, setPatients] = useState([]);
    const [professionals, setProfessionals] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loadingLogs, setLoadingLogs] = useState(true);

    // Búsqueda
    const [searchType, setSearchType] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedPerson, setSelectedPerson] = useState(null);
    const [supervisorLicense, setSupervisorLicense] = useState("");

    // Formulario
    const [form, setForm] = useState({
        supervisorName: "",
        supervisorLicense: "",
        supervisionDate: new Date().toISOString().split("T")[0],
        sessionNumber: "",
        caseSituation: "",
        caseSpr: "",
        caseTs: "",
        therapistRst: "",
        therapistPx: "",
        therapistEff: "",
        therapistDoubt: "",
        therapistBlock: "",
        observations: "",
    });

    const [submitting, setSubmitting] = useState(false);

    // Cargar datos iniciales
    useEffect(() => {
        async function load() {
            try {
                const [patientsRes, professionalsRes, logsRes] = await Promise.allSettled([
                    listPatients({ size: 100 }),
                    getProfessionalsList(),
                    listSupervisionLogs(),
                ]);

                if (patientsRes.status === "fulfilled") {
                    setPatients(patientsRes.value?.items || []);
                }
                if (professionalsRes.status === "fulfilled") {
                    setProfessionals(professionalsRes.value || []);
                }
                if (logsRes.status === "fulfilled") {
                    setLogs(logsRes.value || []);
                }
            } catch (e) {
                toast.error("Error al cargar datos.");
            } finally {
                setLoadingLogs(false);
            }
        }
        load();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const filteredResults = searchType === "patient"
        ? patients.filter((p) =>
            `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : professionals.filter((p) =>
            p.name?.toLowerCase().includes(searchQuery.toLowerCase())
        );

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!searchType) {
            toast.error("Selecciona si es paciente o terapeuta.");
            return;
        }
        if (!selectedPerson) {
            toast.error(`Selecciona un ${searchType === "patient" ? "paciente" : "terapeuta"}.`);
            return;
        }
        if (sigCanvas.current.isEmpty()) {
            toast.error("La firma del supervisor es obligatoria.");
            return;
        }

        const supervisorSignature = sigCanvas.current.getCanvas().toDataURL("image/png");

        const payload = {
            ...form,
            sessionNumber: form.sessionNumber ? parseInt(form.sessionNumber) : null,
            supervisorSignature,
            patientId: searchType === "patient" ? selectedPerson.id : null,
            therapistId: searchType === "therapist" ? selectedPerson.id : null,
        };

        setSubmitting(true);
        try {
            const newLog = await createSupervisionLog(payload);
            setLogs((prev) => [newLog, ...prev]);
            toast.success("Bitácora guardada correctamente.");
            setView("list");
            resetForm();
        } catch (err) {
            toast.error(err?.message || "Error al guardar la bitácora.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (logId) => {
        if (!window.confirm("¿Eliminar esta bitácora?")) return;
        try {
            await deleteSupervisionLog(logId);
            setLogs((prev) => prev.filter((l) => l.id !== logId));
            toast.success("Bitácora eliminada.");
        } catch (err) {
            toast.error("Error al eliminar.");
        }
    };

    const resetForm = () => {
        setForm({
            supervisorName: "",
            supervisorLicense: "",
            supervisionDate: new Date().toISOString().split("T")[0],
            sessionNumber: "",
            caseSituation: "",
            caseSpr: "",
            caseTs: "",
            therapistRst: "",
            therapistPx: "",
            therapistEff: "",
            therapistDoubt: "",
            therapistBlock: "",
            observations: "",
        });
        setSearchType(null);
        setSearchQuery("");
        setSelectedPerson(null);
        setSupervisorLicense("");
        sigCanvas.current.clear();
    };

    // ─── VISTA: LISTADO ───────────────────────────────────────
    if (view === "list") {
        return (
            <section className="page stack-5">
                <div className="page-header">
                    <div className="cluster" style={{ justifyContent: "space-between" }}>
                        <div className="stack-1">
                            <h1>Bitácora de Supervisión</h1>
                            <p className="helper-text">Registro de sesiones de supervisión clínica</p>
                        </div>
                        <Button variant="primary" onClick={() => setView("form")}>
                            Nueva bitácora
                        </Button>
                    </div>
                </div>

                <Card hoverable={false}>
                    <CardBody>
                        {loadingLogs ? (
                            <p>Cargando bitácoras…</p>
                        ) : logs.length === 0 ? (
                            <p className="helper-text">No hay bitácoras registradas.</p>
                        ) : (
                            <div className="table-container">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Fecha</th>
                                            <th>Paciente</th>
                                            <th>Terapeuta</th>
                                            <th>Supervisor</th>
                                            <th>Sesión No.</th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {logs.map((log) => (
                                            <tr key={log.id}>
                                                <td>{formatDateISOToHuman(log.supervisionDate)}</td>
                                                <td>{log.patient ? `${log.patient.firstName} ${log.patient.lastName}` : "—"}</td>
                                                <td>{log.therapist?.name || "—"}</td>
                                                <td>{log.supervisorName || "—"}</td>
                                                <td>{log.sessionNumber || "—"}</td>
                                                <td> {/* 👈 un solo td, sin td anidado */}
                                                    <div className="cluster gap-2">
                                                        <Button variant="ghost" size="sm" onClick={() => setDetailLog(log)}>
                                                            Ver detalle
                                                        </Button>
                                                        <Button variant="ghost" size="sm" onClick={() => handleDelete(log.id)}>
                                                            Eliminar
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardBody>
                </Card>

                <Modal
                    open={!!detailLog}
                    onClose={() => setDetailLog(null)}
                    title="Detalle de Bitácora"
                    footer={
                        <Button variant="ghost" onClick={() => setDetailLog(null)}>
                            Cerrar
                        </Button>
                    }
                >
                    <div style={{ minWidth: "min(600px, 80vw)" }}></div>
                    {detailLog && (
                        <div className="stack-3">
                            <div className="detail-grid cols-2">
                                <div>
                                    <strong>Fecha</strong>
                                    <span>{formatDateISOToHuman(detailLog.supervisionDate)}</span>
                                </div>
                                <div>
                                    <strong>Sesión No.</strong>
                                    <span>{detailLog.sessionNumber || "—"}</span>
                                </div>
                                <div>
                                    <strong>Supervisor</strong>
                                    <span>{detailLog.supervisorName || "—"}</span>
                                </div>
                                <div>
                                    <strong>Cédula</strong>
                                    <span>{detailLog.supervisorLicense || "—"}</span>
                                </div>
                                <div>
                                    <strong>Paciente</strong>
                                    <span>{detailLog.patient ? `${detailLog.patient.firstName} ${detailLog.patient.lastName}` : "—"}</span>
                                </div>
                                <div>
                                    <strong>Terapeuta</strong>
                                    <span>{detailLog.therapist?.name || "—"}</span>
                                </div>
                            </div>

                            {[
                                { label: "Datos del paciente", value: detailLog.casePatientData },
                                { label: "Situación actual", value: detailLog.caseSituation },
                                { label: "SPR", value: detailLog.caseSpr },
                                { label: "TS", value: detailLog.caseTs },
                                { label: "RST", value: detailLog.therapistRst },
                                { label: "PX", value: detailLog.therapistPx },
                                { label: "EFF", value: detailLog.therapistEff },
                                { label: "Duda", value: detailLog.therapistDoubt },
                                { label: "Bloqueo", value: detailLog.therapistBlock },
                                { label: "Observaciones", value: detailLog.observations },
                            ].filter(item => item.value).map(({ label, value }) => (
                                <div key={label} className="stack-1">
                                    <strong>{label}</strong>
                                    <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{value}</p>
                                </div>
                            ))}

                            {detailLog.supervisorSignature && (
                                <div className="stack-1">
                                    <strong>Firma del supervisor</strong>
                                    <img
                                        src={detailLog.supervisorSignature}
                                        alt="Firma"
                                        style={{ maxWidth: "300px", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "#fff" }}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                    <div></div>

                </Modal>
            </section>
        );
    }

    // ─── VISTA: FORMULARIO ────────────────────────────────────
    return (
        <section className="page stack-5">
            <div className="page-header">
                <div className="cluster" style={{ justifyContent: "space-between" }}>
                    <div className="stack-1">
                        <h1>Nueva Bitácora de Supervisión</h1>
                        <p className="helper-text">Completa los campos de la sesión de supervisión</p>
                    </div>
                    <Button variant="ghost" onClick={() => { setView("list"); resetForm(); }}>
                        Cancelar
                    </Button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="stack-4">

                {/* DATOS DEL SUPERVISOR */}
                <Card hoverable={false}>
                    <CardHeader><h2>Datos del Supervisor</h2></CardHeader>
                    <CardBody>
                        <div className="detail-grid cols-2">
                            <InputField
                                label="Supervisor"
                                name="supervisorName"
                                value={form.supervisorName}
                                onChange={handleChange}
                                placeholder="Nombre del supervisor"
                            />
                            <InputField
                                label="Cédula profesional"
                                name="supervisorLicense"
                                value={form.supervisorLicense}
                                onChange={handleChange}
                                placeholder="Cédula del supervisor"
                            />
                            <InputField
                                label="Fecha de supervisión"
                                type="date"
                                name="supervisionDate"
                                value={form.supervisionDate}
                                onChange={handleChange}
                            />
                            <InputField
                                label="Sesión No."
                                type="number"
                                name="sessionNumber"
                                value={form.sessionNumber}
                                onChange={handleChange}
                                placeholder="Número de sesión"
                            />
                        </div>
                    </CardBody>
                </Card>

                {/* BÚSQUEDA DE PACIENTE O TERAPEUTA */}
                <Card hoverable={false}>
                    <CardHeader><h2>Paciente o Terapeuta</h2></CardHeader>
                    <CardBody>
                        <div className="stack-4">

                            {/* Selector tipo */}
                            <div className="stack-2">
                                <label className="ui-field__label">¿A quién se refiere esta bitácora? *</label>
                                <div className="cluster" style={{ gap: "var(--s-2)" }}>
                                    <Button
                                        type="button"
                                        variant={searchType === "patient" ? "primary" : "secondary"}
                                        onClick={() => {
                                            setSearchType("patient");
                                            setSearchQuery("");
                                            setSelectedPerson(null);
                                            setSupervisorLicense("");
                                            setForm(prev => ({ ...prev, casePatientData: "" }));
                                        }}
                                    >
                                        Paciente
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={searchType === "therapist" ? "primary" : "secondary"}
                                        onClick={() => {
                                            setSearchType("therapist");
                                            setSearchQuery("");
                                            setSelectedPerson(null);
                                            setSupervisorLicense("");
                                            setForm(prev => ({ ...prev, casePatientData: "" }));
                                        }}
                                    >
                                        Terapeuta
                                    </Button>
                                </div>
                            </div>

                            {/* Buscador — solo aparece si se seleccionó un tipo */}
                            {searchType && (
                                <div className="stack-2">
                                    <InputField
                                        label={`Buscar ${searchType === "patient" ? "paciente" : "terapeuta"} *`}
                                        placeholder="Escribe el nombre..."
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            setSelectedPerson(null);
                                        }}
                                    />

                                    {/* Resultados del buscador */}
                                    {searchQuery && !selectedPerson && filteredResults.length > 0 && (
                                        <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", maxHeight: "180px", overflowY: "auto" }}>
                                            {filteredResults.map((p) => (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    style={{ padding: "0.5rem 1rem", textAlign: "left", background: "none", border: "none", cursor: "pointer", width: "100%", borderBottom: "1px solid var(--border)" }}
                                                    onClick={() => {
                                                        setSelectedPerson(p);

                                                        if (searchType === "patient") {
                                                            setSearchQuery(`${p.firstName} ${p.lastName}`);
                                                            setForm(prev => ({
                                                                ...prev,
                                                            }));
                                                        } else {
                                                            setSearchQuery(p.name);
                                                            const cedula = p.kycRecord?.certificateFolio || "";
                                                            setSupervisorLicense(cedula);
                                                            setForm(prev => ({
                                                                ...prev,
                                                                supervisorLicense: cedula,
                                                            }));
                                                        }
                                                    }}
                                                >
                                                    {searchType === "patient"
                                                        ? `${p.firstName} ${p.lastName}`
                                                        : p.name}
                                                    <span className="helper-text" style={{ marginLeft: "0.5rem" }}>
                                                        {searchType === "patient" ? (p.curp || "") : (p.email || "")}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Info del seleccionado */}
                                    {selectedPerson && (
                                        <div className="stack-2" style={{ padding: "1rem", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
                                            <Badge variant="success">
                                                ✓ {searchType === "patient"
                                                    ? `${selectedPerson.firstName} ${selectedPerson.lastName}`
                                                    : selectedPerson.name}
                                            </Badge>
                                            <div className="detail-grid cols-2">
                                                <div>
                                                    <strong>ID</strong>
                                                    <span style={{ fontSize: "0.85rem" }}>{selectedPerson.id}</span>
                                                </div>
                                                <div>
                                                    <strong>CURP</strong>
                                                    <span style={{ fontSize: "0.85rem" }}>
                                                        {searchType === "patient"
                                                            ? (selectedPerson.curp || "No registrado")
                                                            : (selectedPerson.kycRecord?.curp || "No registrado")}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Input de cédula — solo para terapeuta */}
                                            {searchType === "therapist" && (
                                                <InputField
                                                    label="Cédula profesional (opcional)"
                                                    value={supervisorLicense}
                                                    onChange={(e) => {
                                                        setSupervisorLicense(e.target.value);
                                                        setForm(prev => ({ ...prev, supervisorLicense: e.target.value }));
                                                    }}
                                                    placeholder="Se autocompleta si está registrada"
                                                />
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </CardBody>
                </Card>

                {/* DEFINICIÓN DEL PROBLEMA - CASO */}
                <Card hoverable={false}>
                    <CardHeader><h2>Definición del problema — Caso</h2></CardHeader>
                    <CardBody>
                        <div className="stack-3">
                            {[
                                { name: "caseSituation", label: "Situación actual" },
                                { name: "caseSpr", label: "SPR" },
                                { name: "caseTs", label: "TS" },
                            ].map(({ name, label }) => (
                                <InputField
                                    key={name}
                                    label={label}
                                    name={name}
                                    value={form[name]}
                                    onChange={handleChange}
                                    placeholder="Escribe aquí..."
                                    multiline
                                    rows={3}
                                />
                            ))}
                        </div>
                    </CardBody>
                </Card>

                {/* DEFINICIÓN DEL PROBLEMA - TERAPEUTA */}
                <Card hoverable={false}>
                    <CardHeader><h2>Definición del problema — Terapeuta</h2></CardHeader>
                    <CardBody>
                        <div className="stack-3">
                            {[
                                { name: "therapistRst", label: "RST" },
                                { name: "therapistPx", label: "PX" },
                                { name: "therapistEff", label: "EFF" },
                                { name: "therapistDoubt", label: "Duda" },
                                { name: "therapistBlock", label: "Bloqueo" },
                            ].map(({ name, label }) => (
                                <InputField
                                    key={name}
                                    label={label}
                                    name={name}
                                    value={form[name]}
                                    onChange={handleChange}
                                    placeholder="Escribe aquí..."
                                    multiline
                                    rows={3}
                                />
                            ))}
                        </div>
                    </CardBody>
                </Card>

                {/* OBSERVACIONES */}
                <Card hoverable={false}>
                    <CardHeader><h2>Observaciones / Recomendaciones</h2></CardHeader>
                    <CardBody>
                        <InputField
                            label="Observaciones del supervisor"
                            name="observations"
                            value={form.observations}
                            onChange={handleChange}
                            placeholder="Escribe aquí..."
                            multiline
                            rows={4}
                        />
                    </CardBody>
                </Card>

                {/* FIRMA */}
                <Card hoverable={false}>
                    <CardHeader><h2>Firma del Supervisor</h2></CardHeader>
                    <CardBody>
                        <div className="stack-2">
                            <label className="ui-field__label">Firma (obligatoria)</label>
                            <div style={{
                                border: "1px solid var(--border)",
                                borderRadius: "var(--radius)",
                                background: "#fff",
                                width: "100%",
                                maxWidth: "500px"
                            }}>
                                <SignatureCanvas
                                    ref={sigCanvas}
                                    penColor="black"
                                    canvasProps={{
                                        width: 500,
                                        height: 180,
                                        style: { display: "block" }
                                    }}
                                />
                            </div>
                            <div>
                                <Button type="button" variant="ghost" size="sm" onClick={() => sigCanvas.current.clear()}>
                                    Limpiar firma
                                </Button>
                            </div>
                        </div>
                    </CardBody>
                </Card>

                {/* ACCIONES */}
                <div className="cluster" style={{ justifyContent: "flex-end", gap: "var(--s-2)" }}>
                    <Button type="button" variant="ghost" onClick={() => { setView("list"); resetForm(); }}>
                        Cancelar
                    </Button>
                    <Button type="submit" variant="primary" loading={submitting} disabled={submitting}>
                        Guardar bitácora
                    </Button>
                </div>

            </form>

        </section>
    );
}