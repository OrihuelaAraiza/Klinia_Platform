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
    key: "idOrPassportFileId",
    label: "INE o Pasaporte",
    helper: "Cámara (Frente y Vuelta) O sube un archivo (PDF/JPG)",
  },
  {
    key: "professionalLicenseFileId",
    label: "Cédula profesional",
    helper: "PDF o JPG (max 5 MB)",
  },
  {
    key: "curpDocumentFileId", 
    label: "Documento CURP (Opcional)",
    helper: "Súbelo si tu CURP no está en tu INE (PDF/JPG)",
  },
  {
    key: "proofOfAddressFileId",
    label: "Comprobante de domicilio (≤ 3 meses)",
    helper: "PDF o JPG (max 5 MB)",
  },
];

const MAX_SIZE = 5 * 1024 * 1024;
const ACCEPT_ATTR = ".pdf,.jpg,.jpeg";

export default function StepDocs({
  documents,
  errors,
  onDocumentChange,
  onBusyChange,
  disabled = false,
}) {
  const [localErrors, setLocalErrors] = useState({});
  const [uploadingMap, setUploadingMap] = useState({});
  const [fileNames, setFileNames] = useState({});

  const [frontImage, setFrontImage] = useState(null); 
  const [backImage, setBackImage] = useState(null); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [capturingFor, setCapturingFor] = useState(null); 
  const [isCombining, setIsCombining] = useState(false);
  const combinedCanvasRef = useRef(null);

  // LIBERACIÓN DE BARRA DE PROGRESO:
  // Si hay carga activa en el mapa, está ocupado. Si no, liberamos siempre.
  const isUploading = useMemo(() => {
    return Object.values(uploadingMap).some(status => status === true) || isCombining;
  }, [uploadingMap, isCombining]);

  useEffect(() => {
    onBusyChange?.(isUploading);
  }, [isUploading, onBusyChange]);

  const handleCapture = (blob) => {
    const previewUrl = URL.createObjectURL(blob);
    onDocumentChange('idOrPassportFileId', null); // Reset por si había archivo previo
    
    if (capturingFor === 'front') setFrontImage({ blob, previewUrl });
    else if (capturingFor === 'back') setBackImage({ blob, previewUrl });
    
    setIsModalOpen(false);
  };
  
  const handleRetake = (side) => {
    if (side === 'front' && frontImage) {
      URL.revokeObjectURL(frontImage.previewUrl);
      setFrontImage(null);
    } else if (side === 'back' && backImage) {
      URL.revokeObjectURL(backImage.previewUrl);
      setBackImage(null);
    }
    onDocumentChange('idOrPassportFileId', null);
  };
  
  const combineAndUpload = useCallback(async () => {
    if (!frontImage || !backImage || isCombining || documents?.idOrPassportFileId) return;

    setIsCombining(true);
    setUploadingMap((prev) => ({ ...prev, idOrPassportFileId: true }));

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
          const response = await uploadService.uploadDocument(combinedBlob);
          const fileId = response.id || response.data?.id;
          
          onDocumentChange('idOrPassportFileId', fileId);
          setFileNames(prev => ({ ...prev, idOrPassportFileId: "INE_Camara_Combinada.jpg" }));
        } catch (err) {
          setLocalErrors(prev => ({ ...prev, idOrPassportFileId: "Error al subir fotos." }));
        } finally {
          setIsCombining(false);
          setUploadingMap((prev) => ({ ...prev, idOrPassportFileId: false }));
        }
      }, 'image/jpeg', 0.85);
    } catch (err) {
      setIsCombining(false);
      setUploadingMap((prev) => ({ ...prev, idOrPassportFileId: false }));
    }
  }, [frontImage, backImage, isCombining, onDocumentChange, documents]);

  useEffect(() => {
    combineAndUpload();
  }, [combineAndUpload]);

  const handleFileChange = async (key, event) => {
    const file = event.target.files?.[0];
    if (!file || disabled) return;

    // Si sube archivo, matamos la lógica de cámara para que no bloquee
    if (key === 'idOrPassportFileId') {
      setFrontImage(null);
      setBackImage(null);
      setIsCombining(false);
    }

    if (file.size > MAX_SIZE) {
      setLocalErrors((prev) => ({ ...prev, [key]: "Máximo 5MB permitido." }));
      return;
    }

    setUploadingMap((prev) => ({ ...prev, [key]: true }));
    try {
      const response = await uploadService.uploadDocument(file);
      const fileId = response.id || response.data?.id;
      
      onDocumentChange?.(key, fileId);
      setFileNames(prev => ({ ...prev, [key]: file.name }));
      setLocalErrors((prev) => ({ ...prev, [key]: "" }));
    } catch (error) {
      setLocalErrors((prev) => ({ ...prev, [key]: "Error de conexión." }));
      onDocumentChange?.(key, null);
    } finally {
      setUploadingMap((prev) => ({ ...prev, [key]: false }));
      // Forzamos al padre a saber que terminamos
      onBusyChange?.(false);
    }
  };

  return (
    <div className="register-step">
      <div className="register-step__header">
        <h2 className="register-step__title">Documentación</h2>
        <p className="register-step__subtitle">Sube tus archivos. Los campos marcados con * son obligatorios para continuar.</p>
      </div>

      <div className="register-step__body register-step__grid">
        {DOCUMENT_FIELDS.map((field) => {
          const fileId = documents?.[field.key];
          const fileName = fileNames[field.key];
          const fieldError = localErrors[field.key] || errors[field.key];
          const isUploadingField = uploadingMap[field.key];

          return (
            <Field key={field.key} label={field.label} required={field.key !== 'curpDocumentFileId'} hint={field.helper} error={fieldError}>
              <div className="file-upload">
                {field.key === "idOrPassportFileId" && (
                  <div className="id-capture-stack" style={{ marginBottom: '10px', display: 'flex', gap: '8px' }}>
                    <button type="button" className={`btn btn--sm ${frontImage ? 'btn--success' : 'btn--secondary'}`} onClick={() => { setCapturingFor('front'); setIsModalOpen(true); }}>
                      {frontImage ? "✓ Frente" : " Frente"}
                    </button>
                    <button type="button" className={`btn btn--sm ${backImage ? 'btn--success' : 'btn--secondary'}`} onClick={() => { setCapturingFor('back'); setIsModalOpen(true); }}>
                      {backImage ? "✓ Vuelta" : " Vuelta"}
                    </button>
                  </div>
                )}
                
                <label className="file-upload__control">
                  <input type="file" accept={ACCEPT_ATTR} onChange={(e) => handleFileChange(field.key, e)} disabled={isUploadingField || disabled} className="visually-hidden" />
                  <span className="file-upload__cta">
                    {fileId ? "Cambiar Archivo" : "Seleccionar Archivo"}
                  </span>
                </label>
                
                <div className="file-upload__status" style={{ marginTop: '5px', fontSize: '0.85rem' }}>
                  {isUploadingField ? (
                    <span style={{ color: 'var(--color-primary)' }}> Subiendo...</span>
                  ) : fileId ? (
                    <span style={{ color: 'green' }}> {fileName || 'Cargado'}</span>
                  ) : (
                    <span style={{ color: '#666' }}>Falta archivo</span>
                  )}
                </div>
              </div>
            </Field>
          );
        })}
      </div>
      <canvas ref={combinedCanvasRef} style={{ display: 'none' }} />
      {isModalOpen && <CameraModal onCapture={handleCapture} onClose={() => setIsModalOpen(false)} />}
    </div>
  );
}