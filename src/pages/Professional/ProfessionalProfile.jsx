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
import { FileText, Link, Upload, X, Camera, User, Image as ImageIcon, Trash2, Clock, UserPlus } from 'lucide-react';
import professionalService from '../../services/professionalService';
import auditService from '../../services/auditService';
import api from '../../services/apiClient';

const MAX_DELEGATES = 5;
const MAX_GALLERY_PHOTOS = 6;

const cleanValue = (value) => {
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
    const roleLabel = ROLES_LABEL[role] ?? role ?? "N/D";
    const license = user?.license || user?.kycRecord?.certificateFolio || "N/D";
    const profileData = user?.professionalProfile || {};
    const kycData = user?.kycRecord || {};
    // --- NUEVO ASISTENTE ---
    const [newDelegate, setNewDelegate] = useState({ email: '', password: '', name: '' });
    const [isCreatingDelegate, setIsCreatingDelegate] = useState(false);
    // --- ESTADOS DE UI ---
    const [activeSection, setActiveSection] = useState('general');
    const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);
    const [logoutLoading, setLogoutLoading] = useState(false);
    const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // --- ESTADOS DE DATOS ---
    const [auditLogs, setAuditLogs] = useState([]);
    const [isAuditLoading, setIsAuditLoading] = useState(false);
    const [uploadedDocuments, setUploadedDocuments] = useState(profileData.documentsJson || []);
    const [documentModalOpen, setDocumentModalOpen] = useState(false);
    const [currentFile, setCurrentFile] = useState(null);
    const [delegates, setDelegates] = useState([]);
    const [delegatesLoading, setDelegatesLoading] = useState(false);
    const [securityErrors, setSecurityErrors] = useState({});
    const [isUploading, setIsUploading] = useState(false);
    const [delegatesCount, setDelegatesCount] = useState(0);

    // --- REFS ---
    const fileInputRef = useRef(null);
    const galleryInputRef = useRef(null);

    // --- FORMULARIO ---
    const [generalForm, setGeneralForm] = useState({
        description: profileData.description || '',
        phone: kycData.phone || '',
        emergencyContactName: kycData.emergencyName || '',
        emergencyContactPhone: kycData.emergencyPhone || '',
        newEmail: user?.email || '',
        currentPassword: '',
        newPassword: '',
        newPasswordConfirm: '',
        phoneIsVerified: kycData.phoneIsVerified || false,
        profilePictureUrl: profileData.profilePictureUrl || null,
        galleryPhotos: profileData.galleryPhotos || [],
    });

    useEffect(() => {
        professionalService.countDelegates()
            .then(setDelegatesCount)
            .catch(() => { });
    }, []);

    // --- EFECTOS ---
    useEffect(() => {
        if (activeSection === 'delegate') {
            loadDelegates();
        }
        if (activeSection === 'audit') {
            setIsAuditLoading(true);
            auditService.getProfessionalLogs()
                .then(setAuditLogs)
                .catch(() => error("No se pudo cargar el historial."))
                .finally(() => setIsAuditLoading(false));
        }
    }, [activeSection, error]);

    useEffect(() => {
        const currentProfileData = user?.professionalProfile || {};
        const currentKycData = user?.kycRecord || {};
        setGeneralForm(prev => ({
            ...prev,
            description: currentProfileData.description || '',
            phone: currentKycData.phone || '',
            emergencyContactName: currentKycData.emergencyName || '',
            emergencyContactPhone: currentKycData.emergencyPhone || '',
            newEmail: user?.email || '',
            phoneIsVerified: currentKycData.phoneIsVerified || false,
            profilePictureUrl: currentProfileData.profilePictureUrl || null,
            galleryPhotos: currentProfileData.galleryPhotos || [],
        }));
        setUploadedDocuments(currentProfileData.documentsJson || []);
    }, [user]);

    // --- HANDLERS MULTIMEDIA (FOTOS CON PREVIEW REAL) ---
    const handleUploadImage = async (e, isGallery = false) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (isGallery && generalForm.galleryPhotos.length >= MAX_GALLERY_PHOTOS) {
            error(`Máximo ${MAX_GALLERY_PHOTOS} fotos.`);
            return;
        }

        const formData = new FormData();
        formData.append("file", file);

        setIsUploading(true);
        try {
            const response = await api.post("/uploads/profile-asset", formData);
            // El back devuelve blobName (para guardar) y previewUrl (para mostrar)
            const { blobName, previewUrl } = response;

            if (isGallery) {
                // Para galería guardamos el objeto con preview para verlo ya
                setGeneralForm(prev => ({
                    ...prev,
                    galleryPhotos: [...prev.galleryPhotos, previewUrl]
                }));
            } else {
                setGeneralForm(prev => ({
                    ...prev,
                    profilePictureUrl: previewUrl
                }));
            }
            success("Previsualización lista. Guarda los cambios para confirmar.");
        } catch (err) {
            error("Error al subir archivo al servidor.");
        } finally {
            setIsUploading(false);
            if (e.target) e.target.value = '';
        }
    };

    const removeGalleryPhoto = (index) => {
        setGeneralForm(prev => ({
            ...prev,
            galleryPhotos: prev.galleryPhotos.filter((_, i) => i !== index)
        }));
    };

    const loadDelegates = async () => {
        setDelegatesLoading(true);
        try {
            const data = await professionalService.listDelegates();
            setDelegates(data);
            setDelegatesCount(data.length);
        } catch (e) {
            error("Error al cargar asistentes.");
        } finally {
            setDelegatesLoading(false);
        }
    };

    // --- HANDLERS ASISTENTES ---
    const handleCreateDelegate = async (e) => {
        e.preventDefault();
        if (delegatesCount >= MAX_DELEGATES) {
            return error("Límite alcanzado.");
        }
        setIsCreatingDelegate(true);
        try {
            const payload = {
                name: newDelegate.name,
                email: newDelegate.email,
                password: newDelegate.password,
            };

            await api.post("/delegates", payload);
            success(`Asistente ${payload.name} creado con éxito.`);
            setNewDelegate({ email: '', password: '', name: '' });
            await loadDelegates();
        } catch (err) {
            error(err?.message || "Error al crear asistente.");
        } finally {
            setIsCreatingDelegate(false);
        }
    };


    const handleDeleteDelegate = async (id) => {
        if (!window.confirm("¿Estás seguro de eliminar este asistente? Perderá acceso inmediato.")) return;
        try {
            await professionalService.deleteDelegate(id);
            success("Asistente eliminado.");
            loadDelegates();
        } catch (err) {
            error("No se pudo eliminar.");
        }
    };

    // --- HANDLERS DOCUMENTOS (SUBIDA DIRECTA) ---
    const handleOpenUploadModal = () => {
        setCurrentFile({ id: Date.now(), name: '', description: '', file: null });
        setDocumentModalOpen(true);
    };

    const handleSaveDocument = async (docMetadata) => {
        if (!docMetadata.file) {
            error("No hay archivo seleccionado.");
            return;
        }

        const formData = new FormData();
        formData.append("file", docMetadata.file);

        setIsUploading(true);
        try {
            const response = await api.post("/uploads/profile-asset", formData);

            const finalDoc = {
                id: docMetadata.id || Date.now(),
                name: docMetadata.name || docMetadata.file.name,
                description: docMetadata.description,
                url: response.previewUrl, // URL con SAS para ver el PDF
                blobName: response.blobName
            };

            setUploadedDocuments(prev => [...prev, finalDoc]);
            setDocumentModalOpen(false);
            success("Documento cargado correctamente.");
        } catch (err) {
            error("Error al subir el documento.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleRemoveDocument = (id) => {
        setUploadedDocuments(prev => prev.filter(d => d.id !== id));
        success("Documento removido.");
    };

    // --- HANDLERS GENERALES ---
    const handleGeneralFormChange = (field, value) => {
        setGeneralForm(prev => ({ ...prev, [field]: value }));
        setSecurityErrors(prev => ({ ...prev, [field]: '' }));
    };

    const handleUpdateProfile = async (e) => {
        if (e) e.preventDefault();
        if (!generalForm.currentPassword) {
            setSecurityErrors({ currentPassword: "Campo requerido." });
            return;
        }

        setIsSaving(true);
        const payload = {
            description: cleanValue(generalForm.description),
            phone: cleanValue(generalForm.phone),
            emergencyContactName: cleanValue(generalForm.emergencyContactName),
            emergencyContactPhone: cleanValue(generalForm.emergencyContactPhone),
            email: cleanValue(generalForm.newEmail),
            profilePictureUrl: cleanValue(generalForm.profilePictureUrl),
            galleryPhotos: generalForm.galleryPhotos,
            documentsJson: uploadedDocuments,
            currentPassword: generalForm.currentPassword,
            newPassword: cleanValue(generalForm.newPassword),
            phoneIsVerified: generalForm.phoneIsVerified
        };

        try {
            const result = await professionalService.updateProfile(payload);
            success("Perfil guardado con éxito.");
            if (setUser) setUser(result.user);
            setGeneralForm(prev => ({ ...prev, currentPassword: '', newPassword: '' }));
        } catch (err) {
            error(err?.message || "Error al actualizar.");
        } finally {
            setIsSaving(false);
        }
    };

    const confirmLogout = async () => {
        setLogoutLoading(true);
        try { await onLogout?.(); } finally { setLogoutLoading(false); }
    };



    const menuItems = [
        { id: 'general', label: 'Datos Generales' },
        { id: 'documents', label: 'Documentos' },
        { id: 'audit', label: 'Auditoría' },
        { id: 'delegate', label: `Asistentes (${delegatesCount}/${MAX_DELEGATES})` },
    ];

    const renderContent = () => {
        switch (activeSection) {
            case 'general':
                return (
                    <Card>
                        <CardHeader><h3 style={{ margin: 0 }}>Información del Terapeuta</h3></CardHeader>
                        <CardBody className="stack-4">
                            <form onSubmit={handleUpdateProfile} className="stack-3">
                                <div className="detail-grid">
                                    <div><strong>Nombre</strong><span>{name}</span></div>
                                    <div><strong>Rol</strong><span><Badge variant="neutral">{roleLabel}</Badge></span></div>
                                    <div><strong>Cédula</strong><span>{license}</span></div>
                                </div>
                                <hr />
                                <div className="stack-2">
                                    <label className="ui-field__label">Foto de Perfil Profesional</label>
                                    <div className="cluster align-center gap-3">
                                        <div className="avatar-uploader" onClick={() => fileInputRef.current.click()} style={{ width: '100px', height: '100px', borderRadius: '50%', border: '2px solid var(--ui-primary)', overflow: 'hidden', cursor: 'pointer', position: 'relative' }}>
                                            {generalForm.profilePictureUrl ? <img src={generalForm.profilePictureUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Perfil" /> : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#f0f0f0' }}><User size={40} /></div>}
                                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0 }} className="hover-overlay"><Camera size={20} color="white" /></div>
                                        </div>
                                        <Button type="button" size="sm" variant="ghost" onClick={() => fileInputRef.current.click()}>Cambiar foto</Button>
                                        <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={(e) => handleUploadImage(e, false)} />
                                    </div>
                                </div>
                                <div className="stack-2">
                                    <label className="ui-field__label">Galería del Consultorio</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '1rem' }}>
                                        {generalForm.galleryPhotos.map((url, idx) => (
                                            <div key={idx} style={{ position: 'relative', aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ddd' }}>
                                                <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Galería" />
                                                <button type="button" onClick={() => removeGalleryPhoto(idx)} style={{ position: 'absolute', top: '4px', right: '4px', background: 'red', color: 'white', border: 'none', borderRadius: '50%', cursor: 'pointer' }}><X size={12} /></button>
                                            </div>
                                        ))}
                                        {generalForm.galleryPhotos.length < MAX_GALLERY_PHOTOS && (
                                            <button type="button" onClick={() => galleryInputRef.current.click()} style={{ aspectRatio: '1', border: '2px dashed #ccc', borderRadius: '8px', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageIcon size={24} /></button>
                                        )}
                                    </div>
                                    <input type="file" hidden ref={galleryInputRef} accept="image/*" onChange={(e) => handleUploadImage(e, true)} />
                                </div>
                                <hr />
                                <Field label="Descripción / Bio Professional">
                                    <textarea className="textarea" value={generalForm.description} onChange={(e) => handleGeneralFormChange('description', e.target.value)} rows={4} />
                                </Field>
                                <div className="form-grid">
                                    <InputField label="Email" value={generalForm.newEmail} onChange={(e) => handleGeneralFormChange('newEmail', e.target.value)} error={securityErrors.newEmail} />
                                    <Field label="Teléfono">
                                        <div className="phone-verify-input">
                                            <input name="phone" value={generalForm.phone} onChange={(e) => handleGeneralFormChange('phone', e.target.value)} className="input-field__input" maxLength={10} />
                                            <Button type="button" onClick={() => setIsPhoneModalOpen(true)} variant="primary">Verificar</Button>
                                        </div>
                                    </Field>
                                </div>
                                <hr />
                                <InputField type="password" label="Confirmar con Contraseña Actual" value={generalForm.currentPassword} onChange={(e) => handleGeneralFormChange('currentPassword', e.target.value)} error={securityErrors.currentPassword} required />
                                <ButtonPrimary type="submit" loading={isSaving || isUploading} fullWidth>Guardar Todos los Cambios</ButtonPrimary>
                            </form>
                        </CardBody>
                    </Card>
                );
            case 'documents':
                return (
                    <Card>
                        <CardHeader>
                            <div className="cluster justify-between align-center">
                                <h3 style={{ margin: 0 }}>Documentos</h3>
                                <Button variant="primary" size="sm" onClick={handleOpenUploadModal}>+ Subir Nuevo</Button>
                            </div>
                        </CardHeader>
                        <CardBody className="stack-4">
                            <div className="stack-2">
                                {uploadedDocuments.length === 0 ? <p className="helper-text">Sin documentos.</p> : uploadedDocuments.map(doc => (
                                    <div key={doc.id} style={{ padding: '1rem', border: '1px solid #eee', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div className="cluster gap-2">
                                            <FileText size={20} color="var(--ui-primary)" />
                                            <div>
                                                <strong>{doc.name}</strong>
                                                {doc.url && <a href={doc.url} target="_blank" rel="noreferrer" style={{ display: 'block', fontSize: '0.75rem' }} className="link">Ver archivo ↗</a>}
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="sm" onClick={() => handleRemoveDocument(doc.id)}><Trash2 size={16} color="red" /></Button>
                                    </div>
                                ))}
                            </div>
                            <hr />
                            <div style={{ background: 'var(--ui-bg-muted)', padding: '1.5rem', borderRadius: '8px' }} className="stack-3">
                                <InputField type="password" label="Contraseña Actual" value={generalForm.currentPassword} onChange={(e) => handleGeneralFormChange('currentPassword', e.target.value)} placeholder="Confirma para guardar lista" />
                                <ButtonPrimary onClick={handleUpdateProfile} loading={isSaving || isUploading}>Actualizar Documentación</ButtonPrimary>
                            </div>
                        </CardBody>
                    </Card>
                );
            case 'audit':
                return (
                    <Card>
                        <CardHeader><h3>Auditoría</h3></CardHeader>
                        <CardBody>
                            <div className="ui-table__wrapper">
                                <table className="ui-table">
                                    <thead><tr><th>Fecha</th><th>Acción</th><th>Usuario</th></tr></thead>
                                    <tbody>
                                        {isAuditLoading ? <tr><td colSpan="3">Cargando...</td></tr> : auditLogs.map(log => (
                                            <tr key={log.id}>
                                                <td>{new Date(log.createdAt).toLocaleString()}</td>
                                                <td><Badge>{log.action}</Badge></td>
                                                <td>{log.userName}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardBody>
                    </Card>
                );
            case 'delegate':
                return (
                    <Card>
                        <CardHeader>
                            <div className="cluster justify-between align-center">
                                <h3 style={{ margin: 0 }}>Gestión de Asistentes ({delegatesCount}/{MAX_DELEGATES})</h3>
                                <Badge variant={delegatesCount < MAX_DELEGATES ? 'success' : 'danger'}>
                                    {delegatesCount < MAX_DELEGATES ? 'Cupos disponibles' : 'Límite alcanzado'}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardBody className="stack-5">
                            {/* Formulario de Creación */}
                            <div style={{ background: 'var(--ui-bg-muted)', padding: '1.5rem', borderRadius: '12px' }}>
                                <form onSubmit={handleCreateDelegate} className="stack-3">
                                    <div className="cluster align-center gap-2" style={{ marginBottom: '1rem' }}>
                                        <UserPlus size={20} color="var(--ui-primary)" />
                                        <h4 style={{ margin: 0 }}>Crear Nuevo Asistente</h4>
                                    </div>
                                    <div className="form-grid">
                                        <InputField
                                            label="Nombre Completo"
                                            placeholder="Ej: Juan Pérez"
                                            value={newDelegate.name}
                                            onChange={e => setNewDelegate({ ...newDelegate, name: e.target.value })}
                                            required
                                        />
                                        <InputField
                                            label="Correo Electrónico"
                                            type="email"
                                            placeholder="asistente@brevemente.mx"
                                            value={newDelegate.email}
                                            onChange={e => setNewDelegate({ ...newDelegate, email: e.target.value })}
                                            required
                                        />
                                        <InputField
                                            label="Contraseña temporal"
                                            name="delegatePassword"
                                            type="password"
                                            placeholder="Mínimo 8 caracteres"
                                            assistiveText="Esta será la contraseña inicial del asistente."
                                            value={newDelegate.password}
                                            onChange={(e) => setNewDelegate({ ...newDelegate, password: e.target.value })}
                                            autoComplete="new-password"
                                            required
                                        />
                                    </div>
                                    <div className="cluster justify-end">
                                        <ButtonPrimary type="submit" loading={isCreatingDelegate} disabled={delegatesCount >= MAX_DELEGATES}>
                                            Crear y Dar Acceso
                                        </ButtonPrimary>
                                    </div>
                                </form>
                            </div>

                            {/* Tabla de Asistentes */}
                            <div className="stack-2">
                                <h4 style={{ margin: 0 }}>Asistentes Activos</h4>
                                <div className="ui-table__wrapper">
                                    <table className="ui-table">
                                        <thead>
                                            <tr>
                                                <th>Nombre</th>
                                                <th>Email</th>
                                                <th>Estado</th>
                                                <th style={{ textAlign: 'right' }}>Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {delegatesLoading ? (
                                                <tr><td colSpan="4" style={{ textAlign: 'center' }}>Cargando asistentes...</td></tr>
                                            ) : delegatesCount === 0 ? (
                                                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>No has creado asistentes todavía.</td></tr>
                                            ) : delegates.map(d => (
                                                <tr key={d.id}>
                                                    <td><strong>{d.name}</strong></td>
                                                    <td>{d.email}</td>
                                                    <td><Badge variant="success">Activo</Badge></td>
                                                    <td style={{ textAlign: 'right' }}>
                                                        <Button variant="ghost" size="sm" onClick={() => handleDeleteDelegate(d.id)}>
                                                            <Trash2 size={16} color="var(--ui-danger)" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                );
            default: return null;
        }
    };

    return (
        <section className="page stack-5">
            <header className="page__header">
                <h1>Perfil Profesional</h1>
                <p className="helper-text">Gestiona tu identidad y seguridad.</p>
            </header>
            <div className="profile-layout">
                <aside className="profile-menu">
                    {menuItems.map(item => (
                        <button key={item.id} type="button" className={`profile-menu-item${item.id === activeSection ? ' is-active' : ''}`} onClick={() => setActiveSection(item.id)}>{item.label}</button>
                    ))}
                    <Button variant="danger" onClick={() => setConfirmLogoutOpen(true)} fullWidth style={{ marginTop: '2rem' }}>Cerrar Sesión</Button>
                </aside>
                <main className="profile-content">{renderContent()}</main>
            </div>

            <Modal open={confirmLogoutOpen} onClose={() => setConfirmLogoutOpen(false)} title="¿Cerrar Sesión?">
                <div className="cluster justify-end">
                    <Button variant="ghost" onClick={() => setConfirmLogoutOpen(false)}>Cancelar</Button>
                    <Button variant="danger" onClick={confirmLogout} loading={logoutLoading}>Confirmar Salida</Button>
                </div>
            </Modal>

            {documentModalOpen && <DocumentUploadModal currentFile={currentFile} onClose={() => setDocumentModalOpen(false)} onSave={handleSaveDocument} />}

            {isPhoneModalOpen && (
                <PhoneVerificationModal
                    phone={generalForm.phone}
                    onClose={() => setIsPhoneModalOpen(false)}
                    onSuccess={() => {
                        handleGeneralFormChange('phoneIsVerified', true);
                        success("Teléfono verificado.");
                    }}
                />
            )}
        </section>
    );
}
