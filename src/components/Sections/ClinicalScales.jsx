import { useRef } from "react";
import InputField from "../InputField";
import Button from "../UI/Button";

// Cambiamos 'data' por 'form' para mantener la consistencia con el componente padre
export default function ClinicalScales({
    form = {},
    onChange,
    attachments = [],
    onUploadFiles,
    onRemoveFile,
    uploadError = "",
    uploading = false,
}) {
    const fileInputRef = useRef(null);
    
    const handleChange = (e) => {
        const { name, value } = e.target;
        onChange({ [name]: value });
    };

    const handleFilesSelected = (event) => {
        const files = Array.from(event.target.files || []);
        if (files.length) {
            onUploadFiles?.(files);
        }
        event.target.value = "";
    };

    return (
        <div className="stack-4">
            <h3 className="section-title">Escalas e Inventarios (Puntuaciones)</h3>
            <p className="helper-text text-sm mb-4">
                Registre las puntuaciones obtenidas en la sesión actual para el seguimiento clínico.
            </p>
            
            <div className="grid-2">
                <InputField 
                    label="Beck Depresión (BDI-II)" 
                    name="escala_beck_dep" 
                    type="number" 
                    value={form?.escala_beck_dep || ""} 
                    onChange={handleChange} 
                />
                <InputField 
                    label="Beck Ansiedad (BAI)" 
                    name="escala_beck_ans" 
                    type="number" 
                    value={form?.escala_beck_ans || ""} 
                    onChange={handleChange} 
                />
                <InputField 
                    label="Severidad AP (PDSS)" 
                    name="escala_pdss" 
                    type="number" 
                    value={form?.escala_pdss || ""} 
                    onChange={handleChange} 
                />
                <InputField 
                    label="Yale-Brown (Y-BOCS)" 
                    name="escala_ybocs" 
                    type="number" 
                    value={form?.escala_ybocs || ""} 
                    onChange={handleChange} 
                />
                <InputField 
                    label="Escala TLP (DIB-R)" 
                    name="escala_tlp" 
                    type="number" 
                    value={form?.escala_tlp || ""} 
                    onChange={handleChange} 
                />
                <InputField 
                    label="Estratégica (EESPR)" 
                    name="escala_eespr" 
                    type="number" 
                    value={form?.escala_eespr || ""} 
                    onChange={handleChange} 
                />
            </div>

            <InputField 
                label="Notas sobre la clinimetría" 
                name="notas_escalas" 
                type="textarea" 
                value={form?.notas_escalas || ""} 
                onChange={handleChange} 
                placeholder="Observaciones sobre la aplicación o resultados atípicos..."
            />

            <div className="stack-2">
                <div className="cluster justify-between align-center">
                    <strong>Archivos de soporte de escalas</strong>
                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        loading={uploading}
                    >
                        Subir archivo
                    </Button>
                </div>
                <input
                    ref={fileInputRef}
                    type="file"
                    className="visually-hidden"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFilesSelected}
                />
                {uploadError ? (
                    <p className="ui-field__error" role="alert">{uploadError}</p>
                ) : null}
                {attachments.length === 0 ? (
                    <p className="helper-text">No hay archivos cargados para esta sección.</p>
                ) : (
                    <ul className="attachments-list">
                        {attachments.map((file) => (
                            <li key={file.id} className="attachments-item cluster justify-between align-center">
                                <div className="attachments-item__meta">
                                    <strong>{file.name}</strong>
                                    <p className="helper-text">
                                        {(file.size / 1024).toFixed(1)} KB
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onRemoveFile?.(file.id)}
                                >
                                    Quitar
                                </Button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
