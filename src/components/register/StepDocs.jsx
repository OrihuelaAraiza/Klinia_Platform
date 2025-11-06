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
    helper: "Captura el frente y reverso", 
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
    if (capturingFor === 'front') {
      setFrontImage({ blob, previewUrl });
    } else if (capturingFor === 'back') {
      setBackImage({ blob, previewUrl });
    }
    setIsModalOpen(false);
    setLocalErrors((prev) => ({ ...prev, idOrPassport: "" })); 
  };
  
  const handleRetake = (side) => {
    if (side === 'front' && frontImage) {
      URL.revokeObjectURL(frontImage.previewUrl); 
      setFrontImage(null);
    } else if (side === 'back' && backImage) {
      URL.revokeObjectURL(backImage.previewUrl);
      setBackImage(null);
    }
    onDocumentChange('idOrPassport', null);
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
            name: "ID_Combinado.jpg",
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
    } catch (error) {
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
          
          if (field.key === "idOrPassport") {
            const stored = documents?.[field.key] || null;
            const fieldError = localErrors[field.key] || errors[field.key];
            const isUploadingId = uploadingMap[field.key];
            
            return (
              <Field
                key={field.key}
                label={field.label}
                required
                hint={field.helper}
                error={fieldError}
                className="file-field"
              >
                <div className="id-capture-stack"> {}
                  
         
                  {frontImage ? (
                    <div className="photo-preview">
                      <img src={frontImage.previewUrl} alt="Frente de INE" />
                      <button class="file-upload__control" type="button" onClick={() => handleRetake('front')} disabled={disabled || isUploadingId}>
                        Repetir (Frente)
                      </button>
                    </div>
                  ) : (
                    <button class="file-upload__control" type="button" onClick={() => handleTakePhoto('front')} disabled={disabled || isUploadingId}>
                      Tomar Foto (Frente)
                    </button>
                  )}

                  {backImage ? (
                    <div className="photo-preview">
                      <img src={backImage.previewUrl} alt="Reverso de INE" />
                      <button class="file-upload__control" type="button" onClick={() => handleRetake('back')} disabled={disabled || isUploadingId}>
                        Repetir (Reverso)
                      </button>
                    </div>
                  ) : (
                    <button class="file-upload__control" type="button" onClick={() => handleTakePhoto('back')} disabled={disabled || isUploadingId}>
                      Tomar Foto (Reverso)
                    </button>
                  )}

             
                  <div className="file-upload__status" aria-live="polite">
                    {isUploadingId ? (
                      <span className="file-upload__uploading">Subiendo…</span>
                    ) : stored ? (
                      <div className="file-upload__meta">
                        <span className="file-upload__name"> {stored.name}</span>
                        <span className="file-upload__size">{formatSize(stored.size)}</span>
                      </div>
                    ) : (
                      <span className="file-upload__hint">Ambas fotos son requeridas</span>
                    )}
                  </div>
                </div>
              </Field>
            );
          }
         
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