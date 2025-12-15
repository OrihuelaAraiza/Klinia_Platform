import React, { useState, useEffect } from 'react';
import Modal from './UI/Modal';
import Button, { ButtonPrimary } from './UI/Button'; 
import InputField from './InputField';
import { useToast } from './UI/Toast';
import { FileText, Upload, Link, X } from 'lucide-react'; 

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function DocumentUploadModal({ currentFile, onClose, onSave }) {
    const { error } = useToast() || {};
    const [document, setDocument] = useState(currentFile);
    const [desc, setDesc] = useState(currentFile?.description || '');
    const [url, setUrl] = useState(currentFile?.url || '');
    const [isSaving, setIsSaving] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const inputRef = React.useRef(null);

    useEffect(() => {
        setDocument(currentFile);
        setDesc(currentFile?.description || '');
        setUrl(currentFile?.url || '');
    }, [currentFile]);


    const handleFileChange = (file) => {
        if (file) {
            setDocument({
                ...document,
                name: file.name,
                size: file.size,
                file: file,
                description: document?.file ? '' : desc, 
                url: document?.file ? '' : url,
            });
            setDesc(document?.file ? '' : desc);
            setUrl(document?.file ? '' : url);
        } else {
            error("Tipo de archivo no válido.");
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragActive(false);
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileChange(files[0]);
        }
    };

    const handleSelect = (e) => {
        handleFileChange(e.target.files[0]);
        e.target.value = null; 
    };
    
    const handleSave = () => {
        if (!document || !document.file) {
            error("Debes adjuntar un archivo.");
            return;
        }

        setIsSaving(true);
        onSave({ 
            ...document, 
            description: desc.trim(), 
            url: url.trim(), 
            isReady: true 
        });
    };

    const footer = (
        <div className="cluster">
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <ButtonPrimary onClick={handleSave} loading={isSaving} disabled={!document?.file}>
                Guardar Metadatos y Adjuntar
            </ButtonPrimary>
        </div>
    );

    const isFileLoaded = document && document.file;

    return (
        <Modal
            open={true} 
            onClose={onClose}
            title={isFileLoaded ? `Detalle: ${document.name}` : "Subir Nuevo Documento"}
            footer={footer}
        >
            <div className="stack-3">
                {!isFileLoaded && (
                    <div
                        className={`document-upload-area ${dragActive ? 'drag-active' : ''}`}
                        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                        onDragLeave={() => setDragActive(false)}
                        onDrop={handleDrop}
                        onClick={() => inputRef.current.click()}
                        style={{ 
                            border: `2px dashed ${dragActive ? 'var(--color-primary)' : 'var(--color-border)'}`, 
                            padding: '2rem', 
                            textAlign: 'center',
                            borderRadius: 'var(--radius)',
                            cursor: 'pointer',
                        }}
                    >
                        <input type="file" ref={inputRef} onChange={handleSelect} style={{ display: 'none' }} />
                        <Upload size={24} style={{ margin: '0 auto' }} aria-hidden="true" />
                        <p>Arrastra y suelta aquí, o haz clic para subir.</p>
                    </div>
                )}
                
                {isFileLoaded && (
                    <div className="stack-3">
                        <div className="cluster gap-4 detail-preview-grid">
                            <FileText size={40} className="text-primary" />
                            <div className="stack-1">
                                <h4>{document.name}</h4>
                                <p className="helper-text">Tamaño: {formatFileSize(document.size)}</p>
                                <p className="helper-text">Tipo: {document.file.type}</p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => handleFileChange(null)}>
                                Cambiar Archivo
                            </Button>
                        </div>

                        <InputField 
                            label="Descripción (Opcional)"
                            value={desc}
                            onChange={(e) => setDesc(e.target.value)}
                            placeholder="Certificado de especialidad, Foto de perfil, etc."
                            rows={3}
                        />
                        <InputField 
                            label="URL de Referencia (Opcional)"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://ejemplo.com/doc-externo"
                        />
                    </div>
                )}
            </div>
        </Modal>
    );
}