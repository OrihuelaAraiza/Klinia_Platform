import React, { useRef, useCallback, useEffect, useState } from 'react';

export function CameraModal({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraError, setCameraError] = useState("");

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraError("");
    } catch (error) {
      console.error("Error al iniciar cámara:", error);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraError("");
      } catch (e) {
        setCameraError("No se pudo acceder a la cámara. Revisa los permisos.");
        stopStream();
      }
    }
  }, [stopStream]);

  useEffect(() => {
    startCamera();
    return () => {
      stopStream();
    };
  }, [startCamera, stopStream]);

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      onCapture(blob);
      onClose();
    }, 'image/jpeg', 0.92);
  };

  return (
    <div className="camera-modal-backdrop" onClick={onClose}>
      <div className="camera-modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Capturar Foto</h3>
        {cameraError ? (
          <p className="camera-error">{cameraError}</p>
        ) : (
          <video ref={videoRef} playsInline autoPlay muted />
        )}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        <div className="camera-modal-actions">
          <button type="button" onClick={handleCapture} disabled={!!cameraError}>
            Tomar Foto
          </button>
          <button type="button" className="ghost" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
      
      {/* Necesitarás añadir estilos CSS para este modal */}
      <style>{`
        .camera-modal-backdrop {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.5); z-index: 100;
          display: flex; align-items: center; justify-content: center;
        }
        .camera-modal-content {
          background: white; padding: 20px; border-radius: 8px;
          max-width: 500px; width: 90%;
        }
        .camera-modal-content video { width: 100%; border-radius: 4px; }
        .camera-modal-actions { display: flex; gap: 10px; margin-top: 15px; }
      `}</style>
    </div>
  );
}