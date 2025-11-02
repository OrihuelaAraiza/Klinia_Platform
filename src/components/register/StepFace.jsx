import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import faceService from "../../services/faceService";

const ACCEPT_ATTR = "image/jpeg";

export default function StepFace({
  data,
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
    if (!cameraSupported || disabled) {
      return;
    }
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
      setCameraError(
        "No pudimos acceder a la camara. Permite el acceso o usa el cargador de fotos."
      );
      setCameraReady(false);
      stopStream();
    }
  }, [cameraSupported, disabled, stopStream]);

  useEffect(() => {
    if (cameraSupported) {
      startCamera();
    }
    return () => {
      stopStream();
    };
  }, [cameraSupported, startCamera, stopStream]);

  const captureBlob = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      return Promise.reject(new Error("Camara no lista."));
    }

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, width, height);

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("No pudimos obtener la imagen."));
          }
        },
        "image/jpeg",
        0.92
      );
    });
  }, []);

  const handleVerify = useCallback(
    async (blob) => {
      setVerifying(true);
      setStatusMessage("Enviando captura para verificacion…");
      setCameraError("");

      try {
        const response = await faceService.verifyFace(blob);
        const reader = new FileReader();
        reader.onloadend = () => {
          onChange?.({
            selfieFileId: response?.selfieFileId,
            preview: reader.result,
            score: response?.score ?? null,
          });
        };
        reader.readAsDataURL(blob);

        setStatusMessage("Verificacion facial exitosa.");
      } catch (error) {
        const message =
          error?.message || "No se pudo verificar el rostro. Intenta nuevamente.";
        setStatusMessage("");
        setCameraError(message);
      } finally {
        setVerifying(false);
      }
    },
    [onChange]
  );

  const handleTakePhoto = async () => {
    if (disabled || verifying) {
      return;
    }
    try {
      const blob = await captureBlob();
      await handleVerify(blob);
      stopStream();
    } catch (error) {
      setCameraError(error?.message || "No pudimos capturar la imagen.");
    }
  };

  const handleUploadFallback = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (!/\.jpe?g$/i.test(file.name)) {
      setCameraError("Formato invalido. Carga una foto en JPG.");
      event.target.value = "";
      return;
    }
    try {
      await handleVerify(file);
    } finally {
      event.target.value = "";
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
        <h2 className="register-step__title">Verificacion facial</h2>
        <p className="register-step__subtitle">
          Captura una fotografia tuya para validar tu identidad.
        </p>
      </div>

      <div className="register-step__body">
        <div className="face-capture">
          <div className="face-capture__preview" role="img" aria-label="Vista previa facial">
            {previewSrc ? (
              <img src={previewSrc} alt="Selfie capturada" />
            ) : cameraReady ? (
              <video ref={videoRef} playsInline autoPlay muted />
            ) : (
              <div className="face-capture__placeholder">
                {cameraSupported
                  ? "Activando camara…"
                  : "Este navegador no soporta captura de camara."}
              </div>
            )}
            <canvas ref={canvasRef} className="face-capture__canvas" />
          </div>

          <div className="face-capture__actions">
            <button
              type="button"
              className="face-capture__button"
              onClick={previewSrc ? handleRetry : handleTakePhoto}
              disabled={disabled || verifying || (!previewSrc && !cameraReady)}
            >
              {previewSrc ? "Tomar otra foto" : "Tomar foto"}
            </button>

            <label className="face-capture__button face-capture__button--ghost">
              <input
                type="file"
                accept={ACCEPT_ATTR}
                onChange={handleUploadFallback}
                disabled={disabled || verifying}
              />
              Subir selfie JPG
            </label>
          </div>
        </div>

        <div className="face-capture__status" aria-live="polite" aria-atomic="true">
          {verifying ? "Verificando…" : statusMessage}
        </div>

        {(cameraError || errors?.selfieFileId) && (
          <p className="face-capture__error" role="alert">
            {cameraError || errors.selfieFileId}
          </p>
        )}
      </div>
    </div>
  );
}
