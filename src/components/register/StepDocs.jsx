import {
  useEffect,
  useMemo,
  useState,
  useRef,
  useCallback,
} from "react";
import Field from "../UI/Field";
import uploadService from "../../services/uploadService";
import { CameraModal } from "./CameraModal";

const DOCUMENT_FIELDS = [
  {
    key: "idOrPassport",
    label: "INE o Pasaporte",
    helper: "Usa tu cámara O sube un archivo (PDF/JPG)",
  },
  {
    key: "professionalLicense",
    label: "Cedula profesional",
    helper: "PDF o JPG (max 5 MB)",
  },
  {
    key: "curpDocument", 
    label: "Documento CURP (Opcional)",
    helper: "Súbelo si tu CURP no está en tu INE (PDF/JPG)",
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

  const [frontImage, setFrontImage] = useState(null); 
  const [backImage, setBackImage] = useState(null); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [capturingFor, setCapturingFor] = useState(null); 
  const [isCombining, setIsCombining] = useState(false);
  const combinedCanvasRef = useRef(null);

  const isUploading = useMemo(
    () => Object.values(uploadingMap).some(Boolean) || isCombining,
    [uploadingMap, isCombining]
  );

  useEffect(() => {
    onBusyChange?.(isUploading);
  }, [isUploading, onBusyChange]);

  const handleTakePhoto = (side) => {
    if (disabled) return;
    setCapturingFor(side);
    setIsModalOpen(true);
  };

  const handleCapture = (blob) => {
    const previewUrl = URL.createObjectURL(blob);
    onDocumentChange('idOrPassport', null); 
    
    if (capturingFor === 'front') {
      setFrontImage({ blob, previewUrl });
    } else if (capturingFor === 'back') {
      setBackImage({ blob, previewUrl });
    }
    setIsModalOpen(false);
    setLocalErrors((prev) => ({ ...prev, idOrPassport: "" }));
  };
  
  const handleRetake = (side) => {
    onDocumentChange('idOrPassport', null); 
    if (side === 'front' && frontImage) {
      URL.revokeObjectURL(frontImage.previewUrl);
      setFrontImage(null);
    } else if (side === 'back' && backImage) {
      URL.revokeObjectURL(backImage.previewUrl);
      setBackImage(null);
    }
  };
  
  const combineAndUpload = useCallback(async () => {
    const storedId = documents?.idOrPassport;
    if (!frontImage || !backImage || isCombining || storedId) return;

    setIsCombining(true);
    setUploadingMap((prev) => ({ ...prev, idOrPassport: true }));
    setLocalErrors((prev) => ({ ...prev, idOrPassport: "" }));

    try {
      const canvas = combinedCanvasRef.current;
      const ctx = canvas.getContext('2d');

      const frontImg = await createImageBitmap(frontImage.blob);
      const backImg = await createImageBitmap(backImage.blob);

      canvas.width = Math.max(frontImg.width, backImg.width);
      canvas.height = frontImg.height + backImg.height;

      ctx.drawImage(frontImg, 0, 0);
      ctx.drawImage(backImg, 0, frontImg.height);

      canvas.toBlob(async (combinedBlob) => {
        try {
          const response = await uploadService.uploadDocument(
            combinedBlob,
            { kind: 'idOrPassport' }
          );
          onDocumentChange('idOrPassport', {
            fileId: response?.fileId,
            name: "ID_Capturado.jpg",
            size: combinedBlob.size,
            mime: combinedBlob.type,
          });
        } catch (uploadError) {
          const message = uploadError?.message || "No pudimos subir la ID. Intenta de nuevo.";
          setLocalErrors((prev) => ({ ...prev, idOrPassport: message }));
          onDocumentChange('idOrPassport', null);
        } finally {
          setIsCombining(false);
          setUploadingMap((prev) => ({ ...prev, idOrPassport: false }));
        }
      }, 'image/jpeg', 0.9);

    } catch (err) {
      console.error("Error al combinar imágenes:", err);
      setLocalErrors((prev) => ({ ...prev, idOrPassport: "Error al combinar fotos." }));
      setIsCombining(false);
      setUploadingMap((prev) => ({ ...prev, idOrPassport: false }));
    }
  }, [frontImage, backImage, isCombining, onDocumentChange, documents]);

  useEffect(() => {
    combineAndUpload();
  }, [combineAndUpload]);

  const handleFileChange = async (key, event) => {
    const file = event.target.files?.[0];
    if (!file || disabled) {
      return;
    }

    if (key === 'idOrPassport') {
      if (frontImage) handleRetake('front');
      if (backImage) handleRetake('back');
    }

    if (file.size > MAX_SIZE) {
      setLocalErrors((prev) => ({ ...prev, [key]: "Documento demasiado grande (≤ 5 MB)." }));
      onDocumentChange?.(key, null);
      event.target.value = "";
      return;
    }
    const extensionMatch = /\.(pdf|jpe?g)$/i.test(file.name);
    const acceptedType = ACCEPTED_TYPES.includes(file.type) || (file.type === "" && extensionMatch);
    if (!acceptedType) {
      setLocalErrors((prev) => ({ ...prev, [key]: "Formato invalido (solo PDF/JPG)." }));
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
          const isUploadingField = uploadingMap[field.key];

          if (field.key === "idOrPassport") {
            return (
              <Field
                key={field.key}
                label={field.label}
                required
                hint={field.helper}
                error={fieldError}
                className="file-field"
              >
                <div className="id-capture-stack">
                  {frontImage ? (
                    <div className="photo-preview">
                      <img src={frontImage.previewUrl} alt="Frente de INE" />
                      <button type="button" className="file-upload__control" onClick={() => handleRetake('front')} disabled={disabled || isUploadingField}>
                        Repetir (Frente)
                      </button>
                    </div>
                  ) : (
                    <button type="button" className="file-upload__control" onClick={() => handleTakePhoto('front')} disabled={disabled || isUploadingField}>
                      Tomar Foto (Frente)
                    </button>
                  )}
                  {backImage ? (
                    <div className="photo-preview">
                      <img src={backImage.previewUrl} alt="Reverso de INE" />
                      <button type="button" className="file-upload__control" onClick={() => handleRetake('back')} disabled={disabled || isUploadingField}>
                        Repetir (Reverso)
                      </button>
                    </div>
                  ) : (
                    <button type="button" className="file-upload__control" onClick={() => handleTakePhoto('back')} disabled={disabled || isUploadingField}>
                      Tomar Foto (Reverso)
                    </button>
                  )}
                </div>

                <div className="file-upload__divider">
                  <span>O</span>
                </div>

                <div className="file-upload">
                  <label className="file-upload__control">
                    <input
                      type="file"
                      name={field.key}
                      accept={ACCEPT_ATTR}
                      onChange={(event) => handleFileChange(field.key, event)}
                      disabled={isUploadingField || disabled}
                      aria-invalid={Boolean(fieldError)}
                    />
                    <span className="file-upload__cta">
                      {stored ? "Reemplazar archivo" : "Selecciona un archivo (PDF/JPG)"}
                    </span>
                  </label>
                  <div className="file-upload__status" aria-live="polite">
                    {isUploadingField ? (
                      <span className="file-upload__uploading">Subiendo…</span>
                    ) : stored ? (
                      <div className="file-upload__meta">
                        <span className="file-upload__name">{stored.name}</span>
                        <span className="file-upload__size">{formatSize(stored.size)}</span>
                      </div>
                    ) : (
                      <span className="file-upload__hint">
                        {frontImage && backImage ? "Fotos listas para subir" : "Sube un archivo o usa tu cámara"}
                      </span>
                    )}
                  </div>
                </div>
              </Field>
            );
          }
          return (
            <Field
              key={field.key}
              label={field.label}
              required={field.key !== 'curpDocument'} 
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
                      disabled={isUploadingField || disabled}
                      aria-describedby={describedBy}
                      aria-invalid={Boolean(fieldError)}
                    />
                    <span className="file-upload__cta">
                      {stored ? "Reemplazar archivo" : "Selecciona archivo"}
                    </span>
                  </label>
                  <div className="file-upload__status" aria-live="polite" aria-atomic="true">
                    {isUploadingField ? (
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
      
      <canvas ref={combinedCanvasRef} style={{ display: 'none' }} />
      {isModalOpen && (
        <CameraModal
          onCapture={handleCapture}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}