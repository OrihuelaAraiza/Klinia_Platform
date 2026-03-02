import React, { useState, useEffect, useRef } from 'react';
import Modal from './UI/Modal';
import Button, { ButtonPrimary } from './UI/Button'; 
import InputField from './InputField';
import { useToast } from './UI/Toast';
import { FileText, Upload, X } from 'lucide-react'; 

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function DocumentUploadModal({ currentFile, onClose, onSave }) {
    const { error } = useToast() || {};
    const [fileData, setFileData] = useState(null); 
    const [desc, setDesc] = useState('');
    const [name, setName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        if (currentFile) {
            setFileData(currentFile.file || null);
            setDesc(currentFile.description || '');
            setName(currentFile.name || '');
        } else {
            setFileData(null);
            setDesc('');
            setName('');
        }
    }, [currentFile]);

    const handleFileChange = (file) => {
        if (!file) {
            setFileData(null);
            setName('');
            return;
        }
        if (file.size > 10 * 1024 * 1024) { 
            error("El archivo excede los 10MB permitidos.");
            return;
        }

        setFileData(file);
        setName(file.name);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragActive(false);
        const files = e.dataTransfer.files;
        if (files.length > 0) handleFileChange(files[0]);
    };

    const handleSave = async () => {
        if (!fileData) {
            error("Debes seleccionar un archivo primero.");
            return;
        }

        setIsSaving(true);
        
        try {
            await onSave({
                id: currentFile?.id || Date.now(),
                name: name.trim() || fileData.name,
                description: desc.trim(),
                file: fileData, 
            });
        } catch (err) {
            console.error("Error al adjuntar:", err);
        } finally {
            setIsSaving(false);
        }
    };

    const footer = (
        <div className="cluster justify-end">
            <Button variant="ghost" onClick={onClose} disabled={isSaving}>
                Cancelar
            </Button>
            <ButtonPrimary onClick={handleSave} loading={isSaving} disabled={!fileData}>
                Subir y Adjuntar
            </ButtonPrimary>
        </div>
    );

    return (
        <Modal
            open={true} 
            onClose={onClose}
            title={fileData ? `Archivo seleccionado` : "Subir Documento Profesional"}
            footer={footer}
        >
            <div className="stack-3">
                {!fileData ? (
                    <div
                        className={`document-upload-area ${dragActive ? 'drag-active' : ''}`}
                        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                        onDragLeave={() => setDragActive(false)}
                        onDrop={handleDrop}
                        onClick={() => inputRef.current.click()}
                        style={{ 
                            border: '2px dashed var(--ui-border)', 
                            padding: '3rem 2rem', 
                            textAlign: 'center',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            backgroundColor: dragActive ? 'var(--ui-bg-muted)' : 'transparent',
                            transition: 'all 0.2s'
                        }}
                    >
                        <input type="file" ref={inputRef} onChange={(e) => handleFileChange(e.target.files[0])} style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png" />
                        <Upload size={32} style={{ margin: '0 auto 1rem', color: 'var(--ui-primary)' }} />
                        <p style={{ fontWeight: 500 }}>Haz clic o arrastra tu archivo aquí</p>
                        <p className="helper-text">PDF, PNG o JPG (Máx. 10MB)</p>
                    </div>
                ) : (
                    <div className="stack-4">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--ui-bg-muted)', borderRadius: '8px' }}>
                            <FileText size={40} color="var(--ui-primary)" />
                            <div style={{ flex: 1 }}>
                                <InputField 
                                    label="Nombre del documento"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ej: Cédula Profesional"
                                />
                                <p className="helper-text" style={{ marginTop: '0.5rem' }}>
                                    {formatFileSize(fileData.size)} • {fileData.type}
                                </p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => handleFileChange(null)}>
                                <X size={18} />
                            </Button>
                        </div>

                        <InputField 
                            label="Descripción corta"
                            value={desc}
                            onChange={(e) => setDesc(e.target.value)}
                            placeholder="¿De qué trata este documento?"
                            rows={2}
                        />
                    </div>
                )}
            </div>
        </Modal>
    );
}