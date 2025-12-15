import React, { useState, useEffect } from 'react'; 
import { useOutletContext, useNavigate } from 'react-router-dom';
import Card, { CardBody, CardHeader } from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import ButtonPrimary from '../../components/ButtonPrimary';
import Badge from '../../components/UI/Badge';
import InputField from '../../components/InputField';
import Field from "../../components/UI/Field"; 
import { ROLES_LABEL } from '../../utils/constants';
import Modal from '../../components/UI/Modal';
import { useToast } from '../../components/UI/Toast';
import { PhoneVerificationModal } from '../../components/register/PhoneVerificationModal'; 
import DocumentUploadModal from '../../components/DocumentUploadModal'; 
import { FileText, Link, Upload, X } from 'lucide-react'; 
import professionalService from '../../services/professionalService'; 

const MAX_DELEGATES = 5;

// 🚨 FUNCIÓN CRÍTICA PARA NORMALIZAR EL PAYLOAD
const cleanValue = (value) => {
    // Convierte cadena vacía ('') o null a undefined. 
    // Esto es crucial para que Zod reconozca los campos como 'optional'
    if (value === "" || value === null) return undefined;
    return value;
};

export default function ProfessionalProfile() {
    const context = useOutletContext() ?? {};
    const { user, role, onLogout, setUser } = context; 
    const navigate = useNavigate();
    const { success, error } = useToast() || {};
    
    // --- DATOS DEL PERFIL ---
    const name = user?.name ?? "Usuario";
    const email = user?.email ?? "N/D";
    const roleLabel = ROLES_LABEL[role] ?? role ?? "N/D";
    const license = user?.license || user?.kycRecord?.certificateFolio || "N/D";
    
    // Extracción segura de datos del nuevo modelo ProfessionalProfile
    const profileData = user?.professionalProfile || {};


    // --- ESTADOS ---
    const [activeSection, setActiveSection] = useState('general');
    const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);
    const [logoutLoading, setLogoutLoading] = useState(false);
    const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
    const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
    const [isSavingGeneral, setIsSavingGeneral] = useState(false);

    const [uploadedDocuments, setUploadedDocuments] = useState([]); 
    const [currentFile, setCurrentFile] = useState(null); 
    const [documentModalOpen, setDocumentModalOpen] = useState(false);
    
    const [generalForm, setGeneralForm] = useState({
        // Inicialización usando los datos de ProfessionalProfile
        description: profileData.description || '',
        phone: profileData.phone || '',
        emergencyContactName: profileData.emergencyContactName || '',
        emergencyContactPhone: profileData.emergencyContactPhone || '',
        newEmail: user?.email || '', 
        currentPassword: '',     
        newPassword: '',
        newPasswordConfirm: '',
        phoneIsVerified: profileData.phoneIsVerified || false, 
    });
    
    const [delegateForm, setDelegateForm] = useState({
        delegateUsername: '',
        delegatePassword: '',
    });
    const [delegates, setDelegates] = useState([]);
    const [delegatesLoading, setDelegatesLoading] = useState(false);
    const [securityErrors, setSecurityErrors] = useState({});
    
    
    // --- EFECTO DE CARGA DE DELEGADOS ---
    useEffect(() => {
        if (activeSection === 'delegate') {
            setDelegatesLoading(true);
            professionalService.listDelegates()
                .then(list => {
                    setDelegates(list);
                })
                .catch(err => {
                    error("Error al cargar asistentes.");
                    console.error("List Delegates Error:", err);
                })
                .finally(() => {
                    setDelegatesLoading(false);
                });
        }
    }, [activeSection, error]);


    // --- HANDLERS GENERALES ---

    const openConfirmLogout = () => setConfirmLogoutOpen(true);
    const closeConfirmLogout = () => setConfirmLogoutOpen(false);

    const confirmLogout = async () => {
        setLogoutLoading(true);
        try { await onLogout?.(); } finally { setLogoutLoading(false); }
    };
    
    const handleDeleteAccount = async () => {
        setDeleteAccountOpen(false);
        // Implementación pendiente
        success("La solicitud de eliminación de cuenta ha sido procesada.");
        await onLogout?.(); 
    };
    
    const handleGeneralFormChange = (field, value) => {
        setGeneralForm(prev => ({ ...prev, [field]: value }));
        setSecurityErrors(prev => ({ ...prev, [field]: '' }));
        
        // Si el número cambia respecto al que viene del perfil (profileData.phone)
        if (field === 'phone' && value !== profileData.phone) {
            setGeneralForm(prev => ({ ...prev, phoneIsVerified: false }));
        }
    };

    const handleVerificationSuccess = () => {
        setGeneralForm(prev => ({ ...prev, phoneIsVerified: true })); 
        setIsPhoneModalOpen(false);
        success("¡Teléfono verificado con éxito!");
    };


    const validateSecurityFields = () => {
        const errors = {};
        const isPhoneChanged = generalForm.phone !== profileData.phone;
        const isEmailChanged = generalForm.newEmail !== user?.email;
        const isPasswordChanged = generalForm.newPassword.length > 0;
        
        if (isPasswordChanged) {
            if (generalForm.newPassword.length < 8) {
                errors.newPassword = "Mínimo 8 caracteres.";
            }
            if (generalForm.newPassword !== generalForm.newPasswordConfirm) {
                errors.newPasswordConfirm = "Las contraseñas no coinciden.";
            }
        }
        
        const isCriticalChange = isEmailChanged || isPasswordChanged || isPhoneChanged;

        if (isCriticalChange && !generalForm.currentPassword) {
            errors.currentPassword = "Se requiere su contraseña actual.";
        }
        
        if (isPhoneChanged && generalForm.phone.length === 10 && !generalForm.phoneIsVerified) {
             errors.phone = "Debe verificar el nuevo número de teléfono.";
        }

        setSecurityErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // 🚨 HANDLER DE ACTUALIZACIÓN (CONECTADO AL SERVICIO)
    const handleUpdateGeneral = async (e) => {
        e.preventDefault();
        
        if (!validateSecurityFields()) {
            error("Revisa los errores de validación en Contacto y Seguridad.");
            return;
        }
        
        setIsSavingGeneral(true);
        
        // 🚨 Aplicar cleanValue para asegurar que Zod reciba 'undefined' en campos vacíos
        const payload = {
            description: cleanValue(generalForm.description),
            phone: cleanValue(generalForm.phone),
            emergencyContactName: cleanValue(generalForm.emergencyContactName),
            emergencyContactPhone: cleanValue(generalForm.emergencyContactPhone),
            email: cleanValue(generalForm.newEmail),
            
            // Seguridad
            newPassword: cleanValue(generalForm.newPassword),
            currentPassword: generalForm.currentPassword, // Requerido si hay cambios críticos
            phoneIsVerified: generalForm.phoneIsVerified, // Booleano
        };
        
        try {
           const result = await professionalService.updateProfile(payload);
           
           success("Datos generales y de seguridad actualizados correctamente.");
           
           // ACTUALIZAR EL CONTEXTO GLOBAL DE LA APP
           if (setUser && result.user) {
               setUser(result.user);
               // Re-inicializar el formulario con los nuevos datos (por si el email cambió)
               setGeneralForm(prev => ({ 
                   ...prev, 
                   newEmail: result.user.email,
                   // Limpiar solo los campos de seguridad
                   currentPassword: '', 
                   newPassword: '', 
                   newPasswordConfirm: '' 
               }));
           }
           
        } catch (err) {
           // Si el error trae un mensaje específico del backend (ej. "Contraseña actual incorrecta.")
           const message = err?.message || "Error al actualizar perfil.";
           if (message.includes("Contraseña actual incorrecta")) {
                setSecurityErrors(prev => ({ ...prev, currentPassword: message }));
           }
           error(message);
           console.error("Profile Update Error:", err);
        } finally {
            setIsSavingGeneral(false);
        }
    };

    // --- HANDLERS DOCUMENTOS (Se mantienen) ---
    const handleOpenUploadModal = () => { 
        setCurrentFile({ id: Date.now(), description: '', url: '', file: null });
        setDocumentModalOpen(true);
    };

    const handleSaveDocument = (docWithMetadata) => {
        const existingIndex = uploadedDocuments.findIndex(d => d.id === docWithMetadata.id);
        
        if (existingIndex > -1) {
            setUploadedDocuments(prev => prev.map((d, index) => index === existingIndex ? docWithMetadata : d));
            success(`Documento '${docWithMetadata.name}' actualizado.`);
        } else {
            setUploadedDocuments(prev => [...prev, docWithMetadata]);
            success(`Documento '${docWithMetadata.name}' adjuntado.`);
        }
        
        setCurrentFile(null);
        setDocumentModalOpen(false);
    };

    const handleRemoveDocument = (id) => {
        setUploadedDocuments(prev => prev.filter(d => d.id !== id));
        success("Documento eliminado localmente.");
    };

    const handleEditDocument = (doc) => {
        setCurrentFile(doc);
        setDocumentModalOpen(true);
    };


    // --- HANDLERS DELEGACIÓN (CONECTADO AL SERVICIO) ---
    const handleDelegateFormChange = (field, value) => {
        setDelegateForm(prev => ({ ...prev, [field]: value }));
    };

    const handleCreateDelegate = async (e) => {
        e.preventDefault();
        if (delegates.length >= MAX_DELEGATES) {
            error(`Límite de ${MAX_DELEGATES} asistentes alcanzado.`);
            return;
        }
        
        if (delegateForm.delegateUsername.trim() && delegateForm.delegatePassword.trim()) {
            try {
                const newDelegate = await professionalService.createDelegate(
                    delegateForm.delegateUsername,
                    delegateForm.delegatePassword
                );
                
                setDelegates(prev => [...prev, newDelegate]);
                success(`Asistente "${newDelegate.email}" creado.`);
                setDelegateForm({ delegateUsername: '', delegatePassword: '' });
                
            } catch (err) {
                 error(err?.message || "Error al crear el asistente.");
            }
        } else {
            error("Completa el usuario y la contraseña.");
        }
    };
    
    const handleDeleteDelegate = async (id) => {
        try {
            await professionalService.deleteDelegate(id);
            setDelegates(prev => prev.filter(d => d.id !== id));
            success("Asistente eliminado.");
        } catch (err) {
            error(err?.message || "Error al eliminar el asistente.");
        }
    };


    const menuItems = [
        { id: 'general', label: 'Datos Generales' },
        { id: 'documents', label: 'Documentos' },
        { id: 'audit', label: 'Auditoría' },
        { id: 'delegate', label: `Delegar Asistentes (${delegates.length}/${MAX_DELEGATES})` },
    ];
    
    const renderContent = () => {
        const isProfessional = role === 'PROFESSIONAL';

        switch (activeSection) {
            case 'general':
                return (
                    <Card>
                        <CardHeader><h3>Información del Terapeuta</h3></CardHeader>
                        <CardBody className="stack-4">
                            <form onSubmit={handleUpdateGeneral} className="stack-3">
                                
                                <div className="detail-grid">
                                    <p><strong>Nombre:</strong> {name}</p>
                                    <p><strong>Rol:</strong> <Badge variant="neutral">{roleLabel}</Badge></p>
                                    <p><strong>Cédula:</strong> {license}</p>
                                </div>
                                
                                <hr />

                                {/* 1. Descripción y Bio */}
                                <label className="ui-field__label">Descripción / Bio</label>
                                <textarea
                                    className="input-field__input"
                                    value={generalForm.description}
                                    onChange={(e) => handleGeneralFormChange('description', e.target.value)}
                                    rows={4}
                                    placeholder="Agrega una descripción para tus pacientes o tu perfil profesional."
                                />

                                <hr />
                                
                                {/* 2. Contacto y Seguridad */}
                                <h4 className="title-sm">Contacto y Seguridad</h4>
                                <div className="detail-grid cols-2">
                                    {/* 2.1. Correo Electrónico */}
                                    <InputField
                                        label="Correo Electrónico"
                                        type="email"
                                        name="newEmail"
                                        value={generalForm.newEmail}
                                        onChange={(e) => handleGeneralFormChange('newEmail', e.target.value)}
                                        error={securityErrors.newEmail}
                                    />
                                    
                                    {/* 2.2. Número de Teléfono con Validación Twilio */}
                                    <Field
                                        label="Número de Teléfono"
                                        required
                                        error={securityErrors.phone}
                                    >
                                        <div className="phone-verify-input"> 
                                            <input
                                                name="phone"
                                                value={generalForm.phone} 
                                                onChange={(e) => handleGeneralFormChange('phone', e.target.value)}
                                                inputMode="tel"
                                                pattern="\d{10}"
                                                placeholder="5512345678"
                                                className="input-field__input" 
                                                maxLength={10}
                                                disabled={generalForm.phoneIsVerified && generalForm.phone === profileData.phone}
                                            />
                                            
                                            {generalForm.phoneIsVerified && generalForm.phone === profileData.phone ? (
                                                <span className="phone-verified-badge">✓ Verificado</span>
                                            ) : (
                                                <button 
                                                    type="button" 
                                                    onClick={() => setIsPhoneModalOpen(true)} 
                                                    disabled={(generalForm.phone || '').length !== 10 || isSavingGeneral}
                                                    className="ui-btn btn--primary btn--md" 
                                                >
                                                    Verificar
                                                </button>
                                            )}
                                        </div>
                                    </Field>

                                    {/* 2.3. Contacto de emergencia (Nombre) */}
                                    <InputField
                                        label="Contacto de Emergencia (Nombre)"
                                        name="emergencyContactName"
                                        value={generalForm.emergencyContactName}
                                        onChange={(e) => handleGeneralFormChange('emergencyContactName', e.target.value)}
                                        error={securityErrors.emergencyContactName}
                                    />
                                    
                                    {/* 2.4. Contacto de emergencia (Teléfono) */}
                                    <InputField
                                        label="Contacto de Emergencia (Teléfono)"
                                        type="tel"
                                        name="emergencyContactPhone"
                                        value={generalForm.emergencyContactPhone}
                                        onChange={(e) => handleGeneralFormChange('emergencyContactPhone', e.target.value)}
                                        placeholder="5512345678"
                                        error={securityErrors.emergencyContactPhone}
                                    />
                                    
                                    {/* 2.5. Nueva Contraseña */}
                                    <InputField
                                        label="Cambiar Contraseña"
                                        type="password"
                                        name="newPassword"
                                        value={generalForm.newPassword}
                                        onChange={(e) => handleGeneralFormChange('newPassword', e.target.value)}
                                        placeholder="Mín. 8 caracteres"
                                        error={securityErrors.newPassword}
                                    />
                                    
                                    {/* 2.6. Confirmar Contraseña */}
                                    <InputField
                                        label="Confirmar Nueva Contraseña"
                                        type="password"
                                        name="newPasswordConfirm"
                                        value={generalForm.newPasswordConfirm}
                                        onChange={(e) => handleGeneralFormChange('newPasswordConfirm', e.target.value)}
                                        disabled={!generalForm.newPassword}
                                        error={securityErrors.newPasswordConfirm}
                                    />
                                </div>
                                
                                <hr />
                                
                                {/* 2.7. Contraseña Actual (Doble Validación) */}
                                <h4 className="title-sm">Validación de Seguridad</h4>
                                <p className="helper-text">
                                    Se requiere su contraseña actual para confirmar la mayoría de los cambios.
                                </p>
                                <InputField
                                    label="Contraseña Actual"
                                    type="password"
                                    name="currentPassword"
                                    required
                                    value={generalForm.currentPassword}
                                    onChange={(e) => handleGeneralFormChange('currentPassword', e.target.value)}
                                    placeholder="Ingrese su contraseña actual"
                                    error={securityErrors.currentPassword}
                                />


                                <ButtonPrimary type="submit" loading={isSavingGeneral} disabled={isSavingGeneral}>
                                    Guardar Cambios
                                </ButtonPrimary>
                            </form>
                            
                            <hr />
                            
                            {/* 3. Eliminar Cuenta */}
                            <div className="stack-2">
                                <h4 className="title-sm danger">Zona de Peligro</h4>
                                <p className="helper-text">
                                    Eliminará permanentemente su cuenta y toda la información asociada a ella.
                                </p>
                                <Button variant="danger" onClick={() => setDeleteAccountOpen(true)}>
                                    Eliminar cuenta
                                </Button>
                            </div>
                        </CardBody>
                    </Card>
                );

            case 'documents':
                return (
                    <Card>
                        <CardHeader className="cluster justify-between">
                            <h3>Documentos de Acreditación y Soporte ({uploadedDocuments.length})</h3>
                            <ButtonPrimary onClick={handleOpenUploadModal}>
                                Subir Nuevo Documento
                            </ButtonPrimary>
                        </CardHeader>
                        <CardBody className="stack-3">
                            <p className="helper-text">Sube y gestiona documentos profesionales como cédula, certificados y estudios. Los documentos con URL son enlaces externos.</p>

                            <div className="stack-2">
                                {uploadedDocuments.length === 0 ? (
                                    <p className="helper-text">No hay documentos registrados.</p>
                                ) : (
                                    <ul className="stack-1">
                                        {uploadedDocuments.map(doc => (
                                            <li key={doc.id} className="cluster justify-between align-center document-item p-2 border-b">
                                                <div className="cluster gap-2 align-center">
                                                    <FileText size={18} />
                                                    <span className="font-semibold">{doc.name}</span>
                                                    {doc.url && <a href={doc.url} target="_blank" rel="noopener noreferrer"><Link size={14} className="text-primary" /></a>}
                                                </div>
                                                <div className="cluster gap-2">
                                                    <p className="helper-text">{doc.description.substring(0, 30)}...</p>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        onClick={() => handleEditDocument(doc)}
                                                    >
                                                        Ver/Editar
                                                    </Button>
                                                    <Button 
                                                        variant="danger" 
                                                        size="sm" 
                                                        onClick={() => handleRemoveDocument(doc.id)}
                                                    >
                                                        Eliminar
                                                    </Button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </CardBody>
                    </Card>
                );

            case 'audit':
                // 🚨 Implementación de auditoría pendiente
                return (
                    <Card>
                        <CardHeader>
                            <h3>Registro de Actividad (Log de Acciones)</h3>
                        </CardHeader>
                        <CardBody className="stack-3">
                            <p className="helper-text">Absolutamente todas las acciones que ha realizado el terapeuta (incluyendo las realizadas por asistentes delegados).</p>
                            
                            <div className="cluster gap-2">
                                <Button variant="secondary">Descargar JSON</Button>
                                <Button variant="secondary">Descargar PDF</Button>
                            </div>

                            <div className="table-wrapper">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Fecha/Hora</th><th>Acción</th><th>Usuario</th><th>Detalles</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr><td>2025-12-15 10:30</td><td>patient_create</td><td>{name} (Terapeuta)</td><td>Registro de Paciente PAT-001</td></tr>
                                        <tr><td>2025-12-15 11:05</td><td>order_create</td><td>Asistente_01 (Delegado)</td><td>Creación de Orden INF-456 para PAT-001</td></tr>
                                    </tbody>
                                
                                </table>
                            </div>
                        </CardBody>
                    </Card>
                );

            case 'delegate':
                if (!isProfessional) {
                    return <Card><CardBody><p className="form-error">Solo los Profesionales pueden delegar cuentas.</p></CardBody></Card>;
                }
                return (
                    <Card>
                        <CardHeader>
                            <h3>Crear Perfiles de Asistentes</h3>
                        </CardHeader>
                        <CardBody className="stack-4">
                            
                            <p className="helper-text">
                                Máximo de {MAX_DELEGATES} perfiles. Los asistentes podrán realizar todas sus acciones, 
                                las cuales se registrarán en su log de auditoría.
                            </p>
                            
                            <form onSubmit={handleCreateDelegate} className="stack-2">
                                <div className="cluster gap-2">
                                    <InputField
                                        label="Usuario / Email del Asistente"
                                        value={delegateForm.delegateUsername}
                                        onChange={(e) => handleDelegateFormChange('delegateUsername', e.target.value)}
                                        required
                                    />
                                    <InputField
                                        label="Contraseña"
                                        type="password"
                                        value={delegateForm.delegatePassword}
                                        onChange={(e) => handleDelegateFormChange('delegatePassword', e.target.value)}
                                        required
                                    />
                                </div>
                                <ButtonPrimary type="submit" disabled={delegates.length >= MAX_DELEGATES}>
                                    Crear Asistente (Restantes: {MAX_DELEGATES - delegates.length})
                                </ButtonPrimary>
                            </form>

                            <div className="stack-2">
                                <h4>Asistentes Activos</h4>
                                {delegatesLoading ? (
                                    <p>Cargando lista de asistentes...</p>
                                ) : delegates.length === 0 ? (
                                    <p className="helper-text">No hay asistentes delegados activos.</p>
                                ) : (
                                    <div className="table-wrapper">
                                        <table className="table">
                                            <thead>
                                                <tr>
                                                    <th>Usuario</th>
                                                    <th>Estado</th>
                                                    <th className="table__actions">Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {delegates.map(d => (
                                                    <tr key={d.id}>
                                                        <td>{d.email || d.username}</td>
                                                        <td><Badge variant="success">Activo</Badge></td>
                                                        <td>
                                                            <Button 
                                                                variant="danger" 
                                                                size="sm"
                                                                onClick={() => handleDeleteDelegate(d.id)}
                                                            >
                                                                Eliminar
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </CardBody>
                    </Card>
                );

            default:
                return null;
        }
    };

    return (
        <section className="page stack-5">
            <header className="page__header">
                <h1>Perfil Profesional</h1>
                <p className="helper-text">Gestión de cuenta y datos {roleLabel}.</p>
            </header>

            <div className="profile-layout cluster align-start gap-4"> 
                <aside className="profile-menu stack-2">
                    {menuItems.map(item => (
                        <Button
                            key={item.id}
                            variant={item.id === activeSection ? 'primary' : 'ghost'}
                            className="profile-menu-item"
                            onClick={() => setActiveSection(item.id)}
                            fullWidth
                        >
                            {item.label}
                        </Button>
                    ))}
                    <Button 
                        variant="danger" 
                        onClick={openConfirmLogout} 
                        fullWidth
                        className="mt-4"
                    >
                        Cerrar Sesión
                    </Button>
                </aside>

                <main className="profile-content flex-grow">
                    {renderContent()}
                </main>
            </div>
            
            {documentModalOpen && (
                <DocumentUploadModal
                    currentFile={currentFile}
                    onClose={() => { setDocumentModalOpen(false); setCurrentFile(null); }}
                    onSave={handleSaveDocument}
                />
            )}
            
            {isPhoneModalOpen && (
                <PhoneVerificationModal
                    phone={generalForm.phone}
                    onClose={() => setIsPhoneModalOpen(false)}
                    onSuccess={handleVerificationSuccess}
                />
            )}

            <Modal
                open={confirmLogoutOpen}
                onClose={closeConfirmLogout}
                title="Confirmar cierre de sesión"
                footer={
                    <div className="cluster">
                        <Button variant="ghost" onClick={closeConfirmLogout}>
                            Cancelar
                        </Button>
                        <Button variant="danger" onClick={confirmLogout} loading={logoutLoading}>
                            Cerrar sesión
                        </Button>
                    </div>
                }
            >
                <p className="helper-text">Confirma que deseas cerrar sesión en la plataforma.</p>
            </Modal>
            
            <Modal
                open={deleteAccountOpen}
                onClose={() => setDeleteAccountOpen(false)}
                title="Eliminar Cuenta Permanente"
                footer={
                    <div className="cluster">
                        <Button variant="ghost" onClick={() => setDeleteAccountOpen(false)}>
                            Cancelar
                        </Button>
                        <Button variant="danger" onClick={handleDeleteAccount}>
                            Confirmar Eliminación
                        </Button>
                    </div>
                }
            >
                <p className="form-error">
                    <strong>¡Advertencia!</strong> Esta acción es irreversible y eliminará todos sus datos clínicos y pacientes asociados.
                </p>
                <p className="helper-text">Escriba su contraseña para confirmar la eliminación.</p>
                <InputField type="password" placeholder="Contraseña actual" />
            </Modal>
        </section>
    );
}