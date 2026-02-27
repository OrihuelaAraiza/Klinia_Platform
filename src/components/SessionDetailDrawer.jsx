import React, { useEffect, useState, useCallback } from 'react';
import Drawer from '../components/UI/Drawer';
import Card, { CardBody, CardHeader } from '../components/UI/Card';
import Button from '../components/UI/Button';
import Badge from '../components/UI/Badge';
import Modal from '../components/UI/Modal'; 
import { useToast } from '../components/UI/Toast';
import { getOne, changeStatus, updateSession } from '../services/sessionsService';
import { SESSION_STATUS, SESSION_STATUS_LABEL, SESSION_STATUS_VARIANT } from '../utils/constants';
import { getSessionPatientName, formatSessionModality } from '../utils/sessionHelpers';
import SessionForm from '../components/SessionForm'; 
import LinkNoteDialog from '../components/LinkNoteDialog'; 
import Field from '../components/UI/Field'; 

// --- DEFINICIONES DE ACCIÓN ---
const TRANSITIONS = {
    'SCHEDULED': [SESSION_STATUS.CONFIRMADA, SESSION_STATUS.CANCELADA], 
    [SESSION_STATUS.CONFIRMADA]: [
        SESSION_STATUS.ATENDIDA, 
        SESSION_STATUS.NO_PRESENTADA, 
        SESSION_STATUS.CANCELADA
    ],
    [SESSION_STATUS.ATENDIDA]: [],
    [SESSION_STATUS.NO_PRESENTADA]: [],
    [SESSION_STATUS.CANCELADA]: [],
};

const ACTION_LABEL = {
    [SESSION_STATUS.CONFIRMADA]: "Confirmar",
    [SESSION_STATUS.ATENDIDA]: "Marcar atendida",
    [SESSION_STATUS.NO_PRESENTADA]: "Marcar no atendida", 
    [SESSION_STATUS.CANCELADA]: "Cancelar",
};

const ACTION_VARIANT = {
    [SESSION_STATUS.CONFIRMADA]: "secondary",
    [SESSION_STATUS.ATENDIDA]: "primary",
    [SESSION_STATUS.NO_PRESENTADA]: "secondary",
    [SESSION_STATUS.CANCELADA]: "danger",
};
// --- CONSTANTES DE FALLBACK DE NOTAS ---
const NO_NOTE_GENERIC = 'Sin notas.';
const NO_NOTE_CANCEL_REASON = 'Sin nota de motivo.';


// --- HELPERS ---
function formatDateTime(value) {
    if (!value) return '—';
    return new Date(value).toLocaleString("es-MX", {
        dateStyle: 'medium',
        timeStyle: 'short'
    });
}

function getDetailPatientName(session) {
    if (!session) return '—';
    if (session.patientFirstName && session.patientLastName) {
        return `${session.patientFirstName} ${session.patientLastName}`.trim();
    }
    return getSessionPatientName(session); 
}

function getPatientFullNameForModal(session) {
    if (!session) return "la paciente";
    if (session.patientFirstName && session.patientLastName) {
        return `${session.patientFirstName} ${session.patientLastName}`.trim();
    }
    return getSessionPatientName(session) || "la paciente";
}


export default function SessionDetailDrawer({ sessionId, onClose, onUpdate, isAssistant, user }) {
    const toast = useToast();
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [statusChanging, setStatusChanging] = useState(null);
    const [mode, setMode] = useState('view'); 
    const [noteDialogOpen, setNoteDialogOpen] = useState(false); 
    const [pendingStatusModal, setPendingStatusModal] = useState(""); 
    const [selectedAction, setSelectedAction] = useState(""); 
    
    const [statusChangeNote, setStatusChangeNote] = useState(""); 

    const professional = { id: user?.id, name: user?.name, license: user?.license };

    const loadSession = useCallback(async (id) => {
        if (!id) return;
        setLoading(true);
        setError(null);
        try {
            const data = await getOne(id); 
            setSession(data);
        } catch (err) {
            setError(err.message || "No se pudo cargar el detalle de la sesión.");
        } finally {
            setLoading(false);
        }
    }, []); 

    useEffect(() => {
        loadSession(sessionId);
        setMode('view');
    }, [sessionId, loadSession]);

    const executeChangeStatus = async (nextStatus, reason = "") => {
        if (!session || statusChanging) return;

        setStatusChanging(nextStatus);
        try {
            const payload = {
                status: nextStatus,
                reason: reason || undefined,
            };

            const response = await changeStatus(sessionId, payload);
            const updated = response || {
                ...session,
                status: nextStatus,
                updatedAt: new Date().toISOString()
            };

            setSession(updated);
            onUpdate?.(updated);
            toast.success(`Estado cambiado a ${SESSION_STATUS_LABEL[nextStatus]}.`);

            if (nextStatus === SESSION_STATUS.ATENDIDA && !updated.noteId) {
                setNoteDialogOpen(true);
            }
        } catch (err) {
            toast.error(err?.message || "Error al actualizar el estado.");
        } finally {
            setStatusChanging(null);
            setSelectedAction(""); 
        }
    };
    
    const handleSaveEdit = async (payload) => {
        try {
            const updated = await updateSession(sessionId, payload); 
            setSession(updated); 
            onUpdate?.(updated); 
            setMode('view'); 
            toast.success("Sesión actualizada.");
        } catch (error) {
             toast.error(error?.message || "Error al guardar la edición.");
        }
    };

    const handleNoteLinked = (noteId, note) => {
        const updatedSession = { ...session, noteId, note };
        setSession(updatedSession);
        onUpdate?.(updatedSession); 
        setNoteDialogOpen(false);
    };

    const handleSelectAction = (event) => {
        const status = event.target.value;
        if (status) setSelectedAction(status);
    };


    if (!sessionId) return null;
    if (loading) return <Drawer open={true} onClose={onClose} title="Cargando Sesión..."><p>Cargando...</p></Drawer>;
    if (error) return <Drawer open={true} onClose={onClose} title="Error" footer={<Button onClick={onClose}>Cerrar</Button>}><p className="form-error">{error}</p></Drawer>;
    if (!session) return null;

    const sessionStatusLabel = SESSION_STATUS_LABEL[session.status] || session.status;
    const sessionStatusVariant = SESSION_STATUS_VARIANT[session.status] || 'neutral';
    
    const patientName = getDetailPatientName(session); 
    const professionalName = session.professionalName || session.professional?.name || '—';
    const isCompletedOrCancelled = session.status === SESSION_STATUS.ATENDIDA || session.status === SESSION_STATUS.CANCELADA;
    
    const availableTransitions = TRANSITIONS[session.status] || [];


    const renderDetailView = () => (
        <section className="stack-4">
            <Card hoverable={false}>
                <CardHeader className="cluster justify-between align-center">
                    <h2>Información General</h2>
                    <div className="cluster gap-2">
                        <Badge variant={sessionStatusVariant}>{sessionStatusLabel}</Badge>
                        
                        {!isAssistant && !isCompletedOrCancelled && (
                             <Button size="sm" variant="secondary" onClick={() => setMode('edit')}>Editar</Button>
                        )}
                    </div>
                </CardHeader>
                <CardBody className="detail-grid">
                    <div className="stack-1">
                        <p><strong>Paciente:</strong> {patientName}</p> 
                        <p><strong>Fecha/Hora:</strong> {formatDateTime(session.datetime)}</p>
                        <p><strong>Duración:</strong> {session.durationMinutes} minutos</p>
                        <p><strong>Modalidad:</strong> {formatSessionModality(session)}</p>
                    </div>
                    <div className="stack-1">
                            <p><strong>Profesional:</strong> {professionalName}</p>
                            
                            {/* Ubicación física */}
                            <p><strong>Ubicación:</strong> {session.location || '—'}</p>
                            
                            {/* Link de llamada condicional y destacado */}
                            {session.callLink && (
                                <p>
                                    <strong>Enlace de llamada:</strong><br />
                                    <a 
                                        href={session.callLink.startsWith('http') ? session.callLink : `https://${session.callLink}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        style={{ 
                                            color: '#007bff', 
                                            fontWeight: 'bold', 
                                            textDecoration: 'underline',
                                            wordBreak: 'break-all'
                                        }}
                                    >
                                        {session.callLink}
                                    </a>
                                </p>
                            )}
                            
                            {session.status === SESSION_STATUS.CANCELADA ? (
                                <p>
                                    <strong>Motivo de Cancelación:</strong>{" "}
                                    {session.notes || NO_NOTE_CANCEL_REASON} 
                                </p>
                            ) : (
                                <p>
                                    <strong>Notas Internas:</strong>{" "}
                                    {session.notes || NO_NOTE_GENERIC}
                                </p>
                            )}

                            {session.noteId && <p><strong>Nota Vinculada:</strong> {session.noteId}</p>}
                    </div>
                </CardBody>
            </Card>

            {!isAssistant && availableTransitions.length > 0 ? (
                <Card hoverable={false}>
                    <CardHeader>
                        <h2>Cambiar Estado</h2>
                    </CardHeader>
                    <CardBody>
                        <div className="cluster gap-2 wrap">
                            <Field label="Transición de Estado">
                                {({ fieldId }) => (
                                    <select 
                                        id={fieldId}
                                        className="role-select"
                                        value={selectedAction}
                                        onChange={handleSelectAction}
                                        disabled={statusChanging}
                                    >
                                        <option value="">Seleccionar la nueva acción...</option>
                                        {availableTransitions.map((status) => (
                                            <option key={status} value={status}>
                                                {ACTION_LABEL[status] || SESSION_STATUS_LABEL[status]}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </Field>
                            
                            {selectedAction && (
                                <Button 
                                    variant={ACTION_VARIANT[selectedAction]} 
                                    size="sm"
                                    onClick={() => {
                                        setStatusChangeNote(""); 
                                        setPendingStatusModal(selectedAction);
                                    }}
                                    loading={statusChanging === selectedAction}
                                >
                                    Ejecutar {ACTION_LABEL[selectedAction]}
                                </Button>
                            )}
                        </div>
                    </CardBody>
                </Card>
            ) : null}
        </section>
    );

    const renderEditView = () => (
        <section className="stack-4">
            <h2 className="text-secondary-600">Editando Sesión</h2>
            <SessionForm
                initialValue={session}
                onSubmit={handleSaveEdit}
                onCancel={() => setMode('view')}
                readOnly={false} 
                presetPatientId={session.patientId} 
                defaultProfessionalId={session.professionalId}
                defaultProfessional={professionalName}
            />
        </section>
    );

    return (
        <>
            <Drawer 
                open={true} 
                onClose={() => { if (mode === 'view') onClose(); }}
                title={`Sesión de ${patientName}`} 
                subtitle={mode === 'view' ? formatDateTime(session.datetime) : 'Modificando datos'}
            >
                {mode === 'edit' ? renderEditView() : renderDetailView()}
            </Drawer>
            
            {pendingStatusModal ? (
                <Modal
                    open={true}
                    onClose={() => setPendingStatusModal("")}
                    title="Confirmar cambio de estado"
                    footer={
                        <div className="cluster" style={{ justifyContent: "flex-end" }}>
                            <Button variant="ghost" onClick={() => setPendingStatusModal("")}>
                                Volver
                            </Button>
                            <Button
                                onClick={() => {
                                    const status = pendingStatusModal;
                                    const reason = statusChangeNote.trim();
                                    setPendingStatusModal("");
                                    setStatusChangeNote("");
                                    executeChangeStatus(status, reason);
                                    setSelectedAction(""); 
                                }}
                            >
                                Confirmar
                            </Button>
                        </div>
                    }
                >
                    <p>
                        ¿Confirmas cambiar la sesión de {getPatientFullNameForModal(session)} a{" "}
                        {SESSION_STATUS_LABEL[pendingStatusModal] || pendingStatusModal}?
                    </p>
                    
                    <div className="stack-3 mt-3">
                        <Field
                            label="Motivo o Nota (Opcional)"
                            assistiveText={
                                pendingStatusModal === SESSION_STATUS.CANCELADA
                                    ? "Motivo de la cancelación o nota interna."
                                    : "Nota interna o aclaración."
                            }
                        >
                            {({ fieldId }) => (
                                <textarea
                                    id={fieldId}
                                    name="statusReason"
                                    rows={3}
                                    value={statusChangeNote}
                                    onChange={(e) => setStatusChangeNote(e.target.value)}
                                    placeholder="Escribe aquí el motivo o nota..."
                                    className="role-textarea"
                                    maxLength={250}
                                />
                            )}
                        </Field>
                    </div>
                </Modal>
            ) : null}

            <LinkNoteDialog
                open={noteDialogOpen}
                onClose={() => setNoteDialogOpen(false)}
                session={session}
                patient={{ id: session.patientId }} 
                professional={professional}
                onLinked={handleNoteLinked}
            />
        </>
    );
}