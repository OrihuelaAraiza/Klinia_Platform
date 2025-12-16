import React, { useState, useEffect, useRef } from 'react'; 
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
import { FileText, Link, Upload, X, Camera, User } from 'lucide-react'; 
import professionalService from '../../services/professionalService'; 
import uploadService from '../../services/uploadService'; 

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
        profilePictureUrl: profileData.profilePictureUrl || null,
    });
    
    const [profilePicturePreview, setProfilePicturePreview] = useState(null);
    const [isUploadingPicture, setIsUploadingPicture] = useState(false);
    const profilePictureInputRef = useRef(null);
    
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

    // --- EFECTO PARA ACTUALIZAR FORMULARIO CUANDO CAMBIAN LOS DATOS DEL USUARIO ---
    useEffect(() => {
        const currentProfileData = user?.professionalProfile || {};
        setGeneralForm(prev => ({
            ...prev,
            description: currentProfileData.description || '',
            phone: currentProfileData.phone || '',
            emergencyContactName: currentProfileData.emergencyContactName || '',
            emergencyContactPhone: currentProfileData.emergencyContactPhone || '',
            newEmail: user?.email || '',
            phoneIsVerified: currentProfileData.phoneIsVerified || false,
            profilePictureUrl: currentProfileData.profilePictureUrl || null,
        }));
    }, [user]);


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

    const handleProfilePictureChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validar tipo de archivo
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        if (!validTypes.includes(file.type)) {
            error("Solo se permiten imágenes JPG o PNG.");
            return;
        }

        // Validar tamaño (máximo 5MB)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            error("La imagen no debe exceder 5MB.");
            return;
        }

        setIsUploadingPicture(true);
        
        try {
            // Crear preview local
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfilePicturePreview(reader.result);
            };
            reader.readAsDataURL(file);

            // Subir a Azure Blob Storage
            const uploadResponse = await uploadService.uploadDocument(file, {}, { auth: true });
            
            if (uploadResponse?.blobUrl) {
                setGeneralForm(prev => ({ ...prev, profilePictureUrl: uploadResponse.blobUrl }));
                success("Foto de perfil cargada correctamente. Guarda los cambios para aplicarla.");
            } else {
                throw new Error("No se recibió la URL de la imagen.");
            }
        } catch (err) {
            console.error("Error al subir foto de perfil:", err);
            error(err?.message || "Error al subir la foto de perfil.");
            setProfilePicturePreview(null);
        } finally {
            setIsUploadingPicture(false);
            // Limpiar el input
            if (profilePictureInputRef.current) {
                profilePictureInputRef.current.value = '';
            }
        }
    };

    const handleRemoveProfilePicture = () => {
        setGeneralForm(prev => ({ ...prev, profilePictureUrl: null }));
        setProfilePicturePreview(null);
        if (profilePictureInputRef.current) {
            profilePictureInputRef.current.value = '';
        }
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
            profilePictureUrl: cleanValue(generalForm.profilePictureUrl),
            
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
                   profilePictureUrl: result.user.professionalProfile?.profilePictureUrl || prev.profilePictureUrl,
                   // Limpiar solo los campos de seguridad
                   currentPassword: '', 
                   newPassword: '', 
                   newPasswordConfirm: '' 
               }));
               // Limpiar preview si se guardó exitosamente
               setProfilePicturePreview(null);
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
                        <CardHeader>
                            <h3 style={{ margin: 0 }}>Información del Terapeuta</h3>
                        </CardHeader>
                        <CardBody className="stack-4">
                            <form onSubmit={handleUpdateGeneral} className="stack-3">
                                
                                <div className="detail-grid">
                                    <div>
                                        <strong>Nombre</strong>
                                        <span>{name}</span>
                                    </div>
                                    <div>
                                        <strong>Rol</strong>
                                        <span><Badge variant="neutral">{roleLabel}</Badge></span>
                                    </div>
                                    <div>
                                        <strong>Cédula</strong>
                                        <span>{license}</span>
                                    </div>
                                </div>
                                
                                <hr />

                                {/* Foto de Perfil */}
                                <button
                                    type="button"
                                    className={`profile-picture-section ${profilePicturePreview || generalForm.profilePictureUrl ? 'has-picture' : ''} ${isUploadingPicture ? 'is-uploading' : ''}`}
                                    onClick={() => {
                                        if (!isUploadingPicture && !(profilePicturePreview || generalForm.profilePictureUrl)) {
                                            profilePictureInputRef.current?.click();
                                        }
                                    }}
                                    disabled={isUploadingPicture || !!(profilePicturePreview || generalForm.profilePictureUrl)}
                                >
                                    <div className="profile-picture-header">
                                        <h3 className="title-sm" style={{ marginTop: 0, marginBottom: '0.5rem' }}>Foto de Perfil Profesional</h3>
                                        <p className="helper-text">
                                            Tu foto de perfil será visible para tus pacientes. Utiliza una imagen profesional y de buena calidad. 
                                            Formatos: JPG o PNG (máximo 5MB).
                                        </p>
                                    </div>
                                    
                                    <div className="profile-picture-container">
                                        <div className="profile-picture-wrapper">
                                            {profilePicturePreview || generalForm.profilePictureUrl ? (
                                                <>
                                                    <img 
                                                        src={profilePicturePreview || generalForm.profilePictureUrl} 
                                                        alt="Foto de perfil" 
                                                        className="profile-picture-image"
                                                    />
                                                    {isUploadingPicture && (
                                                        <div className="profile-picture-loading-overlay">
                                                            <div className="profile-picture-spinner"></div>
                                                            <span>Subiendo...</span>
                                                        </div>
                                                    )}
                                                    {!isUploadingPicture && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                className="profile-picture-overlay"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    profilePictureInputRef.current?.click();
                                                                }}
                                                            >
                                                                <Camera size={24} />
                                                                <span>Cambiar foto</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="profile-picture-remove"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleRemoveProfilePicture();
                                                                }}
                                                                title="Eliminar foto"
                                                            >
                                                                <X size={18} />
                                                            </button>
                                                        </>
                                                    )}
                                                </>
                                            ) : (
                                                <div className="profile-picture-placeholder">
                                                    {isUploadingPicture ? (
                                                        <div className="profile-picture-loading-content">
                                                            <div className="profile-picture-spinner"></div>
                                                            <span className="profile-picture-loading-text">Subiendo...</span>
                                                        </div>
                                                    ) : (
                                                        <User size={72} strokeWidth={1.5} />
                                                    )}
                                                </div>
                                            )}
                                            
                                            <input
                                                ref={profilePictureInputRef}
                                                type="file"
                                                accept="image/jpeg,image/jpg,image/png"
                                                onChange={handleProfilePictureChange}
                                                style={{ display: 'none' }}
                                                disabled={isUploadingPicture}
                                            />
                                        </div>
                                        
                                        {!isUploadingPicture && !(profilePicturePreview || generalForm.profilePictureUrl) && (
                                            <div className="profile-picture-action">
                                                <Upload size={20} />
                                                <span>Haz clic para subir tu foto</span>
                                            </div>
                                        )}
                                        
                                        <div className="profile-picture-info">
                                            {generalForm.profilePictureUrl && !profilePicturePreview && !isUploadingPicture && (
                                                <div className="profile-picture-status success">
                                                    <span className="status-icon">✓</span>
                                                    <span>Foto guardada. Los pacientes podrán verla.</span>
                                                </div>
                                            )}
                                            {profilePicturePreview && !isUploadingPicture && (
                                                <div className="profile-picture-status warning">
                                                    <span className="status-icon">ℹ</span>
                                                    <span>Recuerda guardar los cambios para aplicar la nueva foto.</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </button>
                                
                                <hr />

                                {/* 1. Descripción y Bio */}
                                <Field label="Descripción / Bio">
                                    {({ fieldId, describedBy }) => (
                                <textarea
                                            id={fieldId}
                                            className="textarea"
                                    value={generalForm.description}
                                    onChange={(e) => handleGeneralFormChange('description', e.target.value)}
                                    rows={4}
                                    placeholder="Agrega una descripción para tus pacientes o tu perfil profesional."
                                            aria-describedby={describedBy}
                                />
                                    )}
                                </Field>

                                <hr />
                                
                                {/* 2. Contacto y Seguridad */}
                                <h3 className="title-sm" style={{ marginTop: 0 }}>Contacto y Seguridad</h3>
                                <div className="form-grid">
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
                                <h3 className="title-sm" style={{ marginTop: 0 }}>Validación de Seguridad</h3>
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

                                <div className="form-actions">
                                    <Button type="submit" variant="primary" loading={isSavingGeneral} disabled={isSavingGeneral}>
                                    Guardar Cambios
                                    </Button>
                                </div>
                            </form>
                            
                            <hr />
                            
                            {/* 3. Eliminar Cuenta */}
                            <div className="stack-3">
                                <h3 className="title-sm danger" style={{ marginTop: 0 }}>Zona de Peligro</h3>
                                <p className="helper-text">
                                    Eliminará permanentemente su cuenta y toda la información asociada a ella.
                                </p>
                                <div>
                                <Button variant="danger" onClick={() => setDeleteAccountOpen(true)}>
                                    Eliminar cuenta
                                </Button>
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                );

            case 'documents':
                return (
                    <Card>
                        <CardHeader>
                            <div className="cluster justify-between align-center" style={{ flexWrap: 'wrap', gap: 'var(--s-3)' }}>
                                <h3 style={{ margin: 0 }}>Documentos de Acreditación y Soporte ({uploadedDocuments.length})</h3>
                                <Button variant="primary" onClick={handleOpenUploadModal}>
                                Subir Nuevo Documento
                                </Button>
                            </div>
                        </CardHeader>
                        <CardBody className="stack-4">
                            <p className="helper-text">Sube y gestiona documentos profesionales como cédula, certificados y estudios. Los documentos con URL son enlaces externos.</p>

                            <div className="stack-3">
                                {uploadedDocuments.length === 0 ? (
                                    <p className="helper-text">No hay documentos registrados.</p>
                                ) : (
                                    <div className="stack-2">
                                        {uploadedDocuments.map(doc => (
                                            <div key={doc.id} className="document-item">
                                                <div className="cluster gap-2 align-center" style={{ flex: 1, minWidth: 0 }}>
                                                    <FileText size={18} style={{ flexShrink: 0 }} />
                                                    <div style={{ minWidth: 0, flex: 1 }}>
                                                        <div className="cluster gap-2 align-center" style={{ flexWrap: 'wrap' }}>
                                                            <span style={{ fontWeight: 600, wordBreak: 'break-word' }}>{doc.name}</span>
                                                            {doc.url && (
                                                                <a 
                                                                    href={doc.url} 
                                                                    target="_blank" 
                                                                    rel="noopener noreferrer"
                                                                    className="link"
                                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                                                                >
                                                                    <Link size={14} />
                                                                    Enlace
                                                                </a>
                                                            )}
                                                        </div>
                                                        {doc.description && (
                                                            <p className="helper-text" style={{ margin: '0.25rem 0 0', fontSize: '0.85rem' }}>
                                                                {doc.description.length > 50 ? `${doc.description.substring(0, 50)}...` : doc.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="cluster gap-2" style={{ flexWrap: 'wrap' }}>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        onClick={() => handleEditDocument(doc)}
                                                    >
                                                        Editar
                                                    </Button>
                                                    <Button 
                                                        variant="danger" 
                                                        size="sm" 
                                                        onClick={() => handleRemoveDocument(doc.id)}
                                                    >
                                                        Eliminar
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
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
                            <h3 style={{ margin: 0 }}>Registro de Actividad (Log de Acciones)</h3>
                        </CardHeader>
                        <CardBody className="stack-4">
                            <p className="helper-text">Absolutamente todas las acciones que ha realizado el terapeuta (incluyendo las realizadas por asistentes delegados).</p>
                            
                            <div className="cluster gap-2" style={{ flexWrap: 'wrap' }}>
                                <Button variant="secondary">Descargar JSON</Button>
                                <Button variant="secondary">Descargar PDF</Button>
                            </div>

                            <div className="ui-table__wrapper">
                                <table className="ui-table">
                                    <thead>
                                        <tr>
                                            <th>Fecha/Hora</th>
                                            <th>Acción</th>
                                            <th>Usuario</th>
                                            <th>Detalles</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td>2025-12-15 10:30</td>
                                            <td>patient_create</td>
                                            <td>{name} (Terapeuta)</td>
                                            <td>Registro de Paciente PAT-001</td>
                                        </tr>
                                        <tr>
                                            <td>2025-12-15 11:05</td>
                                            <td>order_create</td>
                                            <td>Asistente_01 (Delegado)</td>
                                            <td>Creación de Orden INF-456 para PAT-001</td>
                                        </tr>
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
                            <h3 style={{ margin: 0 }}>Crear Perfiles de Asistentes</h3>
                        </CardHeader>
                        <CardBody className="stack-4">
                            
                            <p className="helper-text">
                                Máximo de {MAX_DELEGATES} perfiles. Los asistentes podrán realizar todas sus acciones, 
                                las cuales se registrarán en su log de auditoría.
                            </p>
                            
                            <form onSubmit={handleCreateDelegate} className="stack-3">
                                <div className="form-grid">
                                    <InputField
                                        label="Usuario / Email del Asistente"
                                        name="delegateUsername"
                                        value={delegateForm.delegateUsername}
                                        onChange={(e) => handleDelegateFormChange('delegateUsername', e.target.value)}
                                        required
                                    />
                                    <InputField
                                        label="Contraseña"
                                        type="password"
                                        name="delegatePassword"
                                        value={delegateForm.delegatePassword}
                                        onChange={(e) => handleDelegateFormChange('delegatePassword', e.target.value)}
                                        required
                                    />
                                </div>
                                <div>
                                    <Button type="submit" variant="primary" disabled={delegates.length >= MAX_DELEGATES}>
                                    Crear Asistente (Restantes: {MAX_DELEGATES - delegates.length})
                                    </Button>
                                </div>
                            </form>

                            <div className="stack-3">
                                <h3 className="title-sm" style={{ marginTop: 0 }}>Asistentes Activos</h3>
                                {delegatesLoading ? (
                                    <p>Cargando lista de asistentes...</p>
                                ) : delegates.length === 0 ? (
                                    <p className="helper-text">No hay asistentes delegados activos.</p>
                                ) : (
                            <div className="ui-table__wrapper">
                                <table className="ui-table">
                                            <thead>
                                                <tr>
                                                    <th>Usuario</th>
                                                    <th>Estado</th>
                                            <th style={{ textAlign: 'right' }}>Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {delegates.map(d => (
                                                    <tr key={d.id}>
                                                        <td>{d.email || d.username}</td>
                                                        <td><Badge variant="success">Activo</Badge></td>
                                                <td style={{ textAlign: 'right' }}>
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

            <div className="profile-layout"> 
                <aside className="profile-menu">
                    {menuItems.map(item => (
                        <button
                            key={item.id}
                            type="button"
                            className={`profile-menu-item${item.id === activeSection ? ' is-active' : ''}`}
                            onClick={() => setActiveSection(item.id)}
                        >
                            {item.label}
                        </button>
                    ))}
                    <button 
                        type="button"
                        className="profile-menu-item ui-btn btn--danger"
                        onClick={openConfirmLogout} 
                    >
                        Cerrar Sesión
                    </button>
                </aside>

                <main className="profile-content">
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