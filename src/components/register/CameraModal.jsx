import React, { useRef, useCallback, useEffect, useState } from 'react';

export function CameraModal({ onCapture, onClose }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const [cameraError, setCameraError] = useState("");
    
    // --- NUEVO ESTADO ---
    const [photoPreview, setPhotoPreview] = useState(null); // URL de la foto tomada
    // --------------------

    const stopStream = useCallback(() => {
        const currentStream = streamRef.current;
        if (currentStream) {
            currentStream.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        // Limpiamos la URL de la vista previa de la cámara si la hay
        if (videoRef.current) {
             videoRef.current.srcObject = null;
        }
    }, []);

    const startCamera = useCallback(async () => {
        // Si ya hay una foto, no inicies la cámara (se muestra la preview estática)
        if (photoPreview) return;
        
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
                // Fallback a cámara frontal
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
    }, [stopStream, photoPreview]);

    useEffect(() => {
        // Solo iniciar la cámara si no hay una foto en vista previa
        if (!photoPreview) { 
            startCamera();
        }
        return () => {
            // Aseguramos que la cámara se detenga solo al cerrar el modal
            if (!photoPreview) { 
                 stopStream(); 
            }
        };
    }, [startCamera, stopStream, photoPreview]);

    // --- Lógica de Captura y Retención (Modificada) ---
    const handleCapture = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);

        canvas.toBlob((blob) => {
            // 1. Guardar la foto en el estado local del modal para previsualizar
            const url = URL.createObjectURL(blob);
            setPhotoPreview({ blob, url });
            
            // 2. Detener el feed de video y limpiar el stream
            stopStream();

        }, 'image/jpeg', 0.92);
    };

    // --- NUEVA FUNCIÓN ---
    const handleRetake = () => {
        if (photoPreview) {
            URL.revokeObjectURL(photoPreview.url); // Liberar memoria del blob anterior
            setPhotoPreview(null);
            setCameraError("");
        }
    };
    
    // --- NUEVA FUNCIÓN ---
    const handleConfirm = () => {
        if (photoPreview?.blob) {
            onCapture(photoPreview.blob); // Enviar el blob al componente padre
        }
        onClose(); // Cerrar el modal
    }
    // ----------------------

    return (
        <div className="camera-modal-backdrop" onClick={onClose}>
            <div className="camera-modal-content" onClick={(e) => e.stopPropagation()}>
                <h3>Capturar Foto</h3>
                <div className="camera-preview-window"> {/* Contenedor de previsualización */}
                    
                    {/* --- RENDERIZADO CONDICIONAL --- */}
                    {photoPreview ? (
                        <img src={photoPreview.url} alt="Foto Capturada" className="captured-image" />
                    ) : cameraError ? (
                        <p className="camera-error">{cameraError}</p>
                    ) : (
                        <video ref={videoRef} playsInline autoPlay muted />
                    )}
                    {/* ------------------------------- */}

                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                </div>

                <div className="camera-modal-actions">
                    {photoPreview ? (
                        <>
                            <button type="button" onClick={handleRetake}>
                                Tomar otra Foto
                            </button>
                            <button type="button" onClick={handleConfirm} disabled={!photoPreview?.blob}>
                                Confirmar y Continuar
                            </button>
                        </>
                    ) : (
                        <>
                            <button type="button" onClick={handleCapture} disabled={!!cameraError}>
                                Tomar Foto
                            </button>
                            <button type="button" className="ghost" onClick={onClose}>
                                Cancelar
                            </button>
                        </>
                    )}
                </div>
            </div>
            
           
        </div>
    );
}