import InputField from "../InputField";

// Cambiamos 'data' por 'form' para mantener la consistencia con el componente padre
export default function ClinicalScales({ form = {}, onChange }) {
    
    const handleChange = (e) => {
        const { name, value } = e.target;
        onChange({ [name]: value });
    };

    return (
        <div className="stack-4">
            <h3 className="section-title">Escalas e Inventarios (Puntuaciones)</h3>
            <p className="helper-text text-sm mb-4">
                Registre las puntuaciones obtenidas en la sesión actual para el seguimiento clínico.
            </p>
            
            <div className="grid-2">
                <InputField 
                    label="Beck Depresión (BDI-II)" 
                    name="escala_beck_dep" 
                    type="number" 
                    value={form?.escala_beck_dep || ""} 
                    onChange={handleChange} 
                />
                <InputField 
                    label="Beck Ansiedad (BAI)" 
                    name="escala_beck_ans" 
                    type="number" 
                    value={form?.escala_beck_ans || ""} 
                    onChange={handleChange} 
                />
                <InputField 
                    label="Severidad AP (PDSS)" 
                    name="escala_pdss" 
                    type="number" 
                    value={form?.escala_pdss || ""} 
                    onChange={handleChange} 
                />
                <InputField 
                    label="Yale-Brown (Y-BOCS)" 
                    name="escala_ybocs" 
                    type="number" 
                    value={form?.escala_ybocs || ""} 
                    onChange={handleChange} 
                />
                <InputField 
                    label="Escala TLP (DIB-R)" 
                    name="escala_tlp" 
                    type="number" 
                    value={form?.escala_tlp || ""} 
                    onChange={handleChange} 
                />
                <InputField 
                    label="Estratégica (EESPR)" 
                    name="escala_eespr" 
                    type="number" 
                    value={form?.escala_eespr || ""} 
                    onChange={handleChange} 
                />
            </div>

            <InputField 
                label="Notas sobre la clinimetría" 
                name="notas_escalas" 
                type="textarea" 
                value={form?.notas_escalas || ""} 
                onChange={handleChange} 
                placeholder="Observaciones sobre la aplicación o resultados atípicos..."
            />
        </div>
    );
}