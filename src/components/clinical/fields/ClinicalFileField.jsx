import { useState, useRef } from "react";
import Field from "../../UI/Field";
import Button from "../../UI/Button";
import { Upload, X, File } from "lucide-react";
import uploadService from "../../../services/uploadService";
import { useToast } from "../../UI/Toast";

export default function ClinicalFileField({
  field,
  value = [],
  onChange,
  error,
  readOnly,
}) {
  const toast = useToast();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState(null);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const maxSize = field.maxSize || 5 * 1024 * 1024; // 5MB default
    const acceptedTypes = field.accept?.split(",").map(t => t.trim()) || [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Validate size
      if (file.size > maxSize) {
        toast.error(`${file.name} excede el tamaño máximo de ${maxSize / 1024 / 1024}MB`);
        continue;
      }

      // Validate type
      if (acceptedTypes.length > 0) {
        const isValidType = acceptedTypes.some(accepted => {
          if (accepted.includes("*")) return true;
          return file.type === accepted || file.name.toLowerCase().endsWith(accepted.split("/")[1]?.toLowerCase());
        });
        if (!isValidType) {
          toast.error(`${file.name} no es un formato permitido`);
          continue;
        }
      }

      setUploading(true);
      setUploadingIndex(i);
      
      try {
        const uploadResponse = await uploadService.uploadDocument(file, {}, { auth: true });
        const newFile = {
          id: uploadResponse.fileId || crypto.randomUUID(),
          name: uploadResponse.name || file.name,
          size: uploadResponse.size || file.size,
          mime: uploadResponse.mime || file.type,
          blobUrl: uploadResponse.blobUrl,
          uploadedAt: new Date().toISOString(),
        };
        onChange(field.id, [...value, newFile]);
        toast.success(`${file.name} subido correctamente`);
      } catch (err) {
        toast.error(`Error al subir ${file.name}: ${err.message || "Error desconocido"}`);
      } finally {
        setUploading(false);
        setUploadingIndex(null);
      }
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemove = (index) => {
    const newValue = value.filter((_, i) => i !== index);
    onChange(field.id, newValue);
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <Field label={field.label} required={field.required} error={error} hint={field.helperText || field.helperText}>
      <div className="clinical-file-field">
        {value.length > 0 && (
          <div className="stack-2" style={{ marginBottom: "var(--s-3)" }}>
            {value.map((file, index) => (
              <div
                key={file.id || index}
                className="clinical-file-item"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "var(--s-2) var(--s-3)",
                  background: "var(--surface-2)",
                  borderRadius: "var(--r-sm)",
                  border: "1px solid var(--border)",
                }}
              >
                <div className="cluster" style={{ gap: "var(--s-2)", flex: 1, minWidth: 0 }}>
                  <File size={18} style={{ flexShrink: 0, color: "var(--text-muted)" }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 500, wordBreak: "break-word" }}>{file.name}</div>
                    <div className="helper-text" style={{ fontSize: "0.85rem" }}>
                      {formatFileSize(file.size)}
                    </div>
                  </div>
                </div>
                {!readOnly && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(index)}
                    title="Eliminar"
                  >
                    <X size={16} />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
        {!readOnly && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept={field.accept}
              multiple={field.multiple}
              onChange={handleFileSelect}
              disabled={uploading}
              style={{ display: "none" }}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              loading={uploading}
            >
              <Upload size={16} style={{ marginRight: "0.5rem" }} />
              {uploading ? "Subiendo..." : "Subir archivo"}
            </Button>
          </>
        )}
      </div>
    </Field>
  );
}



