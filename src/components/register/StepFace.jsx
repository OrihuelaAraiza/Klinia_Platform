import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import faceService from "../../services/faceService";

export default function StepFace({
  data, // { selfieFileId: "", preview: "", score: null }
  onChange,
  errors,
  onBusyChange,
  disabled = false,
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  // Usamos el preview que viene de data o uno local si es necesario
  const previewSrc = data?.preview || "";

  const cameraSupported = useMemo(
    () =>
      typeof navigator !== "undefined" &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === "function",
    []
  );

  useEffect(() => {
    onBusyChange?.(verifying);
  }, [verifying, onBusyChange]);

  const stopStream = useCallback(() => {
    const currentStream = streamRef.current;
    if (currentStream) {
      currentStream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    if (!cameraSupported || disabled) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraReady(true);
      setCameraError("");
    } catch (error) {
      setCameraError("No pudimos acceder a la cámara. Permite el acceso.");
      setCameraReady(false);
      stopStream();
    }
  }, [cameraSupported, disabled, stopStream]);

  useEffect(() => {
    if (cameraSupported && !previewSrc) {
      startCamera();
    }
    return () => stopStream();
  }, [cameraSupported, startCamera, stopStream, previewSrc]);

  const captureBlob = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return Promise.reject(new Error("Cámara no lista."));

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, width, height);

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("No pudimos obtener la imagen."));
        }, "image/jpeg", 0.92
      );
    });
  }, []);

const handleVerify = useCallback(async (blob) => {
    setVerifying(true);
    try {
        const response = await faceService.verifyFace(blob);
        
        const finalId = response.id || response.selfieFileId;

        const reader = new FileReader();
        reader.onloadend = () => {
            onChange?.({
                selfieFileId: finalId, 
                preview: reader.result,
                score: response.score || 1,
            });
        };
        reader.readAsDataURL(blob);
    } catch (error) {
        setCameraError("Error al procesar la selfie en el servidor.");
    } finally {
        setVerifying(false);
    }
}, [onChange]);

  const handleTakePhoto = async () => {
    if (disabled || verifying) return;
    try {
      const blob = await captureBlob();
      await handleVerify(blob);
      stopStream();
    } catch (error) {
      setCameraError(error?.message || "No pudimos capturar la imagen.");
    }
  };

  const handleRetry = () => {
    onChange?.({ selfieFileId: "", preview: "", score: null });
    setStatusMessage("");
    setCameraError("");
    startCamera();
  };

  return (
    <div className="register-step">
      <div className="register-step__header">
        <h2 className="register-step__title">Verificación facial</h2>
        <p className="register-step__subtitle">
          Captura una fotografía tuya para validar tu identidad.
        </p>
      </div>

      <div className="register-step__body">
        <div className="face-capture">
          <div className="face-capture__preview">
            {previewSrc ? (
              <img src={previewSrc} alt="Selfie capturada" style={{ width: '100%', borderRadius: '8px' }} />
            ) : cameraReady ? (
              <video ref={videoRef} playsInline autoPlay muted style={{ width: '100%', borderRadius: '8px' }} />
            ) : (
              <div className="face-capture__placeholder">
                {cameraSupported ? "Activando cámara..." : "Cámara no soportada."}
              </div>
            )}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>

          <div className="face-capture__actions" style={{ marginTop: '20px', textAlign: 'center' }}>
            <button
              type="button"
              className="btn btn--primary"
              onClick={previewSrc ? handleRetry : handleTakePhoto}
              disabled={disabled || verifying || (!previewSrc && !cameraReady)}
            >
              {verifying ? "Procesando..." : previewSrc ? "Tomar otra foto" : "Capturar Selfie"}
            </button>
          </div>
        </div>

        <div className="face-capture__status" style={{ marginTop: '10px', textAlign: 'center', color: 'var(--color-primary)' }}>
          {statusMessage}
        </div>

        {(cameraError || errors?.selfieFileId) && (
          <p className="error-message" style={{ color: 'red', textAlign: 'center', marginTop: '10px' }}>
            {cameraError || errors.selfieFileId}
          </p>
        )}
      </div>
    </div>
  );
}