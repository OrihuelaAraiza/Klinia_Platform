import { useEffect, useMemo, useState } from "react";
import Field from "../UI/Field";
import uploadService from "../../services/uploadService";

const DOCUMENT_FIELDS = [
  {
    key: "idOrPassport",
    label: "INE o Pasaporte",
    helper: "PDF o JPG (max 5 MB)",
  },
  {
    key: "professionalLicense",
    label: "Cedula profesional",
    helper: "PDF o JPG (max 5 MB)",
  },
  {
    key: "universityDegree",
    label: "Titulo universitario",
    helper: "PDF o JPG (max 5 MB)",
  },
  {
    key: "proofOfAddress",
    label: "Comprobante de domicilio (≤ 3 meses)",
    helper: "PDF o JPG (max 5 MB)",
  },
];

const MAX_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["application/pdf", "image/jpeg"];
const ACCEPT_ATTR = ".pdf,.jpg,.jpeg";

function formatSize(bytes) {
  if (!Number.isFinite(bytes)) {
    return "";
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
  return `${bytes} B`;
}

export default function StepDocs({
  documents,
  errors,
  onDocumentChange,
  onBusyChange,
  disabled = false,
}) {
  const [localErrors, setLocalErrors] = useState({});
  const [uploadingMap, setUploadingMap] = useState({});

  const isUploading = useMemo(
    () => Object.values(uploadingMap).some(Boolean),
    [uploadingMap]
  );

  useEffect(() => {
    onBusyChange?.(isUploading);
  }, [isUploading, onBusyChange]);

  const handleFileChange = async (key, event) => {
    const file = event.target.files?.[0];
    if (!file || disabled) {
      return;
    }

    if (file.size > MAX_SIZE) {
      setLocalErrors((prev) => ({
        ...prev,
        [key]: "Documento demasiado grande (≤ 5 MB).",
      }));
      onDocumentChange?.(key, null);
      event.target.value = "";
      return;
    }

    const extensionMatch = /\.(pdf|jpe?g)$/i.test(file.name);
    const acceptedType =
      ACCEPTED_TYPES.includes(file.type) || (file.type === "" && extensionMatch);

    if (!acceptedType) {
      setLocalErrors((prev) => ({
        ...prev,
        [key]: "Formato invalido (solo PDF/JPG).",
      }));
      onDocumentChange?.(key, null);
      event.target.value = "";
      return;
    }

    setLocalErrors((prev) => ({ ...prev, [key]: "" }));
    setUploadingMap((prev) => ({ ...prev, [key]: true }));

    try {
      const response = await uploadService.uploadDocument(
        file,
        { kind: key }
      );

      onDocumentChange?.(key, {
        fileId: response?.fileId,
        name: response?.name || file.name,
        size: response?.size ?? file.size,
        mime: response?.mime || file.type || "",
      });
      setLocalErrors((prev) => ({ ...prev, [key]: "" }));
    } catch (error) {
      const message =
        error?.message ||
        "No pudimos subir el documento. Intenta de nuevo.";
      setLocalErrors((prev) => ({ ...prev, [key]: message }));
      onDocumentChange?.(key, null);
    } finally {
      setUploadingMap((prev) => ({ ...prev, [key]: false }));
      event.target.value = "";
    }
  };

  return (
    <div className="register-step">
      <div className="register-step__header">
        <h2 className="register-step__title">Documentacion</h2>
        <p className="register-step__subtitle">
          Adjunta la documentacion necesaria para validar tu perfil.
        </p>
      </div>

      <div className="register-step__body register-step__grid">
        {DOCUMENT_FIELDS.map((field) => {
          const stored = documents?.[field.key] || null;
          const fieldError = localErrors[field.key] || errors[field.key];

          return (
            <Field
              key={field.key}
              label={field.label}
              required
              hint={field.helper}
              error={fieldError}
              className="file-field"
            >
              {({ fieldId, describedBy }) => (
                <div className="file-upload">
                  <label className="file-upload__control">
                    <input
                      id={fieldId}
                      type="file"
                      name={field.key}
                      accept={ACCEPT_ATTR}
                      onChange={(event) => handleFileChange(field.key, event)}
                      disabled={Boolean(uploadingMap[field.key]) || disabled}
                      aria-describedby={describedBy}
                      aria-invalid={Boolean(fieldError)}
                    />
                    <span className="file-upload__cta">
                      {stored ? "Reemplazar archivo" : "Selecciona archivo"}
                    </span>
                  </label>

                  <div
                    className="file-upload__status"
                    aria-live="polite"
                    aria-atomic="true"
                  >
                    {uploadingMap[field.key] ? (
                      <span className="file-upload__uploading">
                        Subiendo…
                      </span>
                    ) : stored ? (
                      <div className="file-upload__meta">
                        <span className="file-upload__name">{stored.name}</span>
                        <span className="file-upload__size">
                          {formatSize(stored.size)}
                        </span>
                      </div>
                    ) : (
                      <span className="file-upload__hint">
                        Ningun archivo seleccionado
                      </span>
                    )}
                  </div>
                </div>
              )}
            </Field>
          );
        })}
      </div>
    </div>
  );
}
