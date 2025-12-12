import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Card, { CardBody, CardHeader } from "../components/UI/Card";
import Button from "../components/UI/Button";
import Badge from "../components/UI/Badge";
import Breadcrumbs from "../components/UI/Breadcrumbs";
import { useToast } from "../components/UI/Toast";
import { formatDateISOToHuman } from "../utils/formatters";
import { ROUTES } from "../utils/constants";
import * as reportsService from "../services/reportsService";
import * as patientsService from "../services/patientsService";

// Función auxiliar para obtener el color del estado
function statusVariant(status) {
    return status === "cerrado" ? "success" : "neutral";
}

export default function PatientReportsList() {
    const { patientId } = useParams();
    const navigate = useNavigate();
    const { error } = useToast() || {};
    
    const [patient, setPatient] = useState(null);
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorState, setErrorState] = useState("");

    // --- EFECTO DE CARGA DE DATOS ---
    useEffect(() => {
        let active = true;
        setLoading(true);
        setErrorState("");

        async function load() {
            try {
                const patientData = await patientsService.getPatient(patientId);
                
                const reportsList = await reportsService.listByPatient(patientId);
                
                if (!active) return;
                
                setPatient(patientData);
                setReports(reportsList);
                
            } catch (err) {
                if (!active) return;
                const message = err?.message || "No pudimos cargar la lista de informes.";
                setErrorState(message);
                error(message);
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        load();
        return () => {
            active = false;
        };
    }, [patientId, error]);


    if (loading) {
        return (
            <section className="page">
                <Card hoverable={false}><CardBody><p>Cargando informes…</p></CardBody></Card>
            </section>
        );
    }

    if (errorState) {
        return (
            <section className="page">
                <Card hoverable={false}>
                    <CardBody className="stack-2">
                        <p className="form-error" role="alert">{errorState}</p>
                        <Button onClick={() => navigate(`/patients/${patientId}`)}>Volver al expediente</Button>
                    </CardBody>
                </Card>
            </section>
        );
    }

    const patientName = patient ? `${patient.firstName} ${patient.lastName}`.trim() : "Paciente";
    
    const breadcrumbs = [
        { to: ROUTES.patients, label: "Pacientes" },
        { to: `/patients/${patientId}`, label: patientName },
        { label: "Informes Clínicos" },
    ];

    return (
        <section className="page stack-5">
            <div className="page-header">
                <Breadcrumbs items={breadcrumbs} />
                <div className="cluster" style={{ justifyContent: "space-between" }}>
                    <div className="stack-1">
                        <h1>Informes Clínicos de {patientName}</h1>
                        <p className="helper-text">
                            {reports.length} {reports.length === 1 ? "informe" : "informes"} registrados.
                        </p>
                    </div>
                    
                    <Button 
                        onClick={() => navigate(ROUTES.reportNew.replace(":patientId", patientId))}
                    >
                        Crear nuevo informe
                    </Button>
                </div>
            </div>

            <Card hoverable={false}>
                <CardHeader>
                    <h2>Lista de Informes</h2>
                </CardHeader>
                <CardBody>
                    {reports.length === 0 ? (
                        <p className="helper-text">No se han creado informes para este paciente.</p>
                    ) : (
                        <div className="table-wrapper">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Folio</th>
                                        <th>Título</th>
                                        <th>Estado</th>
                                        <th>Fecha de Creación</th>
                                        <th className="table__actions">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reports.map((report) => (
                                        <tr key={report.id}>
                                            <td>{report.folio}</td>
                                            <td>{report.titulo}</td>
                                            <td>
                                                <Badge variant={statusVariant(report.status)}>
                                                    {report.status === "cerrado" ? "Cerrado" : "Borrador"}
                                                </Badge>
                                            </td>
                                            <td>{formatDateISOToHuman(report.createdAt)}</td>
                                            <td>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => navigate(ROUTES.reportDetail
                                                        .replace(":patientId", patientId)
                                                        .replace(":reportId", report.id)
                                                    )}
                                                >
                                                    Ver / Editar
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardBody>
            </Card>
        </section>
    );
}