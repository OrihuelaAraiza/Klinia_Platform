import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import SignatureCanvas from "react-signature-canvas";
import Button from "../../components/UI/Button";
import InputField from "../../components/InputField";
import Field from "../../components/UI/Field";
import { createDischargeNote } from "../../services/patientsService";
import { DISCHARGE_REASONS, CASE_RESULTS } from "../../utils/constants";
import "./DischargePrint.css"; 

export default function PatientDischarge() {
  const location = useLocation();
  const navigate = useNavigate();
  const patient = location.state?.patient;
  
  const sigCanvasTherapist = useRef({});
  const sigCanvasPatient = useRef({});
  const fileInputRef = useRef(null);

  const [activePhase, setActivePhase] = useState(1);
  const [form, setForm] = useState({
    dischargeDate: new Date().toISOString().split('T')[0],
    totalSessions: "",
    dischargeReason: "",
    caseResult: "", // Objetivo cumplido
    initialChangeVal: patient?.initialChangeVal || "",
    initialGlobalVal: patient?.initialGlobalVal || "",
    finalChangeVal: "", 
    finalGlobalVal: "",
    learningSummary: "",
    therapeuticObjective: "",
    strategySummary: "",
    phase1Res: "",
    phase2Res: "",
    phase3Res: "",
    phase4Res: "",
    recommendations: "", // Recomendaciones al egreso
    therapistLicense: "",
  });

  // CARGAR CÉDULA AUTOMÁTICAMENTE
  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    const license = storedUser.professionalLicense || storedUser.kycRecord?.certificateFolio || "";
    if (license) {
      setForm(prev => ({ ...prev, therapistLicense: license }));
    }
  }, []);

  const clearTherapist = () => sigCanvasTherapist.current.clear();
  const clearPatient = () => sigCanvasPatient.current.clear();

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const ctx = sigCanvasTherapist.current.getCanvas().getContext("2d");
          ctx.clearRect(0, 0, 500, 200);
          ctx.drawImage(img, 0, 0, 500, 200);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validamos si el canvas del terapeuta tiene algo escrito
    if (sigCanvasTherapist.current.isEmpty()) {
      alert("La firma del terapeuta es obligatoria para el cierre legal.");
      return;
    }

    // CAMBIO AQUÍ: Usamos getCanvas() en lugar de getTrimmedCanvas() 
    // para evitar el error del import_trim_canvas
    const therapistSignature = sigCanvasTherapist.current.getCanvas().toDataURL("image/png");
    
    const patientSignature = sigCanvasPatient.current.isEmpty() 
      ? null 
      : sigCanvasPatient.current.getCanvas().toDataURL("image/png");
    
    try {
      // Asegúrate de que los nombres de los campos coincidan con tu backend/Prisma
      await createDischargeNote({ 
        ...form, 
        patientId: patient.id,
        therapistSignature, // Si en Prisma pusiste signatureData, cámbialo aquí
        patientSignature
      });
      
      alert("Alta guardada y expediente cerrado correctamente.");
      navigate(`/patients/${patient.id}`);
    } catch (error) {
      console.error("Error al procesar el alta", error);
      alert("Hubo un error al guardar el alta. Revisa la consola del servidor.");
    }
  };

  return (
    <div className="page discharge-container">
      <div className="no-print header-actions cluster justify-between mb-4">
        <h1>Nota de Egreso Clínica</h1>
        <Button variant="ghost" onClick={() => window.print()}>🖨️ Imprimir Formulario</Button>
      </div>

      <form onSubmit={handleSubmit} className="stack-4">
        {/* SECCIÓN 1: IDENTIFICACIÓN */}
        <section className="panel">
          <h3 className="form-section-title">Datos del Paciente</h3>
          <div className="form-grid">
            <p><strong>Nombre:</strong> {patient?.firstName} {patient?.lastName}</p>
            <p><strong>CURP:</strong> {patient?.curp || "N/A"}</p>
            <InputField label="Fecha de Alta" type="date" name="dischargeDate" value={form.dischargeDate} onChange={(e) => setForm({...form, dischargeDate: e.target.value})} required />
          </div>
        </section>

        {/* SECCIÓN 2: DATOS DEL PROCESO */}
        <section className="panel">
          <h3 className="form-section-title">Información del Proceso</h3>
          <div className="form-grid">
            <InputField label="No. Sesiones Totales" type="number" name="totalSessions" value={form.totalSessions} onChange={(e) => setForm({...form, totalSessions: e.target.value})} required />
            <Field label="Motivo del Alta" required>
              <select name="dischargeReason" value={form.dischargeReason} onChange={(e) => setForm({...form, dischargeReason: e.target.value})}>
                <option value="">Seleccione...</option>
                {DISCHARGE_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </Field>
            <Field label="Objetivo Cumplido (Resultado)" required>
              <select name="caseResult" value={form.caseResult} onChange={(e) => setForm({...form, caseResult: e.target.value})}>
                <option value="">Seleccione resultado...</option>
                {CASE_RESULTS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </Field>
          </div>
        </section>

        {/* SECCIÓN 3: RESUMEN CLÍNICO POR FASES */}
        <section className="panel">
          <h3 className="form-section-title">Resumen Clínico</h3>
          <div className="cluster mb-3 no-print">
            {[1, 2, 3, 4].map(n => (
              <Button key={n} type="button" variant={activePhase === n ? "primary" : "ghost"} onClick={() => setActivePhase(n)}>Fase {n}</Button>
            ))}
          </div>
          <InputField 
            label={`Detalle de Fase ${activePhase}`} 
            multiline rows={4}
            value={form[`phase${activePhase}Res`]} 
            onChange={(e) => setForm({...form, [`phase${activePhase}Res`]: e.target.value})}
            placeholder="Escriba los avances significativos de esta etapa..."
          />
          <div className="mt-3">
            <InputField 
              label="Recomendaciones al Egreso" 
              multiline rows={3}
              name="recommendations"
              value={form.recommendations}
              onChange={(e) => setForm({...form, recommendations: e.target.value})}
              placeholder="Indique las pautas a seguir tras el alta..."
            />
          </div>
        </section>

        {/* SECCIÓN 4: FIRMAS Y CÉDULA */}
        <section className="panel signature-section">
          <h3 className="form-section-title">Validación Legal y Firmas</h3>
          <div className="form-grid mb-4">
             <InputField 
                label="Cédula Profesional del Terapeuta" 
                name="therapistLicense" 
                value={form.therapistLicense} 
                onChange={(e) => setForm({...form, therapistLicense: e.target.value})} 
                required 
             />
          </div>
          
          <div className="signature-layout">
            <div className="signature-column stack-2">
              <label><strong>Firma del Terapeuta (Obligatoria)</strong></label>
              <div className="canvas-container" style={{ border: '1px solid #ccc', background: '#fff' }}>
                <SignatureCanvas 
                  ref={sigCanvasTherapist}
                  penColor="black"
                  canvasProps={{ width: 420, height: 180, className: 'sigCanvas' }}
                />
              </div>
              <div className="cluster no-print">
                <Button type="button" variant="ghost" size="small" onClick={clearTherapist}>Limpiar</Button>
                <Button type="button" variant="ghost" size="small" onClick={() => fileInputRef.current.click()}>Subir Imagen</Button>
                <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileUpload} />
              </div>
            </div>

            <div className="signature-column stack-2">
              <label><strong>Firma del Paciente (Opcional)</strong></label>
              <div className="canvas-container" style={{ border: '1px solid #ccc', background: '#fff' }}>
                <SignatureCanvas 
                  ref={sigCanvasPatient}
                  penColor="black"
                  canvasProps={{ width: 420, height: 180, className: 'sigCanvas' }}
                />
              </div>
              <div className="cluster no-print">
                <Button type="button" variant="ghost" size="small" onClick={clearPatient}>Borrar</Button>
              </div>
            </div>
          </div>
        </section>

        <div className="form-actions no-print">
          <Button type="button" variant="ghost" onClick={() => navigate(-1)}>Cancelar</Button>
          <Button type="submit">Finalizar y Cerrar Expediente</Button>
        </div>
      </form>

      <style>{`
        .signature-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
        .sigCanvas { width: 100%; height: 180px; }
        .form-section-title { margin-bottom: 1.5rem; border-bottom: 1px solid #eee; padding-bottom: 0.5rem; color: #333; }
        @media print {
          .signature-layout { grid-template-columns: 1fr 1fr; }
          .canvas-container { border: none !important; border-bottom: 1px solid #000 !important; }
        }
      `}</style>
    </div>
  );
}