import InputField from "../InputField";
import { EVOLUCION_TEMPORAL, PRONOSTICO } from "../../utils/constants";

export default function DiagnosticNosologico({ form = {}, onChange }) {
    
    const handleChange = (e) => {
        const { name, value } = e.target;
        onChange({ [name]: value });
    };

    return (
        <div className="stack-4">
            <h3 className="section-title">Diagnóstico Nosológico</h3>
            
            <InputField 
                label="Motivo de consulta (Palabras del paciente)" 
                name="motivoConsulta" 
                type="textarea" 
                value={form?.motivoConsulta || ""} 
                onChange={handleChange}
                placeholder="¿Qué le trae por aquí hoy?"
                required 
            />

            <div className="grid-2">
                <InputField 
                    label="DX DSMVTR" 
                    name="dx_dsmvtr" 
                    value={form?.dx_dsmvtr || ""} 
                    onChange={handleChange} 
                />
                <InputField 
                    label="DX CIE-11" 
                    name="dx_cie11" 
                    value={form?.dx_cie11 || ""} 
                    onChange={handleChange} 
                />
            </div>

            <div className="grid-2">
                <InputField 
                    label="Primera aparición" 
                    name="dx_primeraAparicion" 
                    value={form?.dx_primeraAparicion || ""} 
                    onChange={handleChange} 
                />
                <InputField 
                    label="Evolución Temporal" 
                    name="dx_evolucion" 
                    type="select" 
                    options={EVOLUCION_TEMPORAL} 
                    value={form?.dx_evolucion || ""} 
                    onChange={handleChange} 
                />
            </div>

            <div className="grid-2">
                <InputField 
                    label="Factores Precipitantes" 
                    name="dx_precipitantes" 
                    type="textarea" 
                    value={form?.dx_precipitantes || ""} 
                    onChange={handleChange} 
                />
                <InputField 
                    label="Diagnóstico Diferencial (DX.DIF)" 
                    name="dx_dif" 
                    type="textarea" 
                    value={form?.dx_dif || ""} 
                    onChange={handleChange} 
                    placeholder="Otros diagnósticos considerados..."
                />
            </div>

            <InputField 
                label="Comorbilidad" 
                name="dx_comorbilidad" 
                value={form?.dx_comorbilidad || ""} 
                onChange={handleChange} 
            />

            <hr />
            <h4>Pronóstico Detallado</h4>
            <div className="grid-2">
                <InputField 
                    label="Pronóstico Global" 
                    name="pronostico" 
                    type="select" 
                    options={PRONOSTICO} 
                    value={form?.pronostico || ""} 
                    onChange={handleChange} 
                />
                <div className="stack-2">
                    <InputField 
                        label="Factores Favorables" 
                        name="pronostico_favorables" 
                        value={form?.pronostico_favorables || ""} 
                        onChange={handleChange} 
                    />
                    <InputField 
                        label="Factores Desfavorables" 
                        name="pronostico_desfavorables" 
                        value={form?.pronostico_desfavorables || ""} 
                        onChange={handleChange} 
                    />
                </div>
            </div>

            <hr />
            <h4>Farmacoterapia para el diagnóstico</h4>
            <div className="stack-3 bg-faint p-3 rounded">
                <label className="cluster gap-2 pointer font-bold">
                    <input 
                        type="checkbox" 
                        name="hasFarmacos"
                        checked={!!form?.hasFarmacos} 
                        onChange={e => onChange({ hasFarmacos: e.target.checked })} 
                    />
                    ¿Se prescriben o registran fármacos asociados?
                </label>
                
                {form?.hasFarmacos && (
                    <InputField 
                        label="Especificar Fármacos (Lista)" 
                        name="farmacos_lista" 
                        type="textarea" 
                        value={form?.farmacos_lista || ""} 
                        onChange={handleChange} 
                        placeholder="1. Fármaco - Dosis - Frecuencia..."
                    />
                )}
            </div>

            <InputField 
                label="Plan de Tratamiento" 
                name="planTratamiento" 
                type="textarea" 
                value={form?.planTratamiento || ""} 
                onChange={handleChange} 
            />
        </div>
    );
}