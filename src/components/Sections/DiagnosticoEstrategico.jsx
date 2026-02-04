import InputField from "../InputField";
import CheckboxGroup from "../shared/CheckboxGroup";
import { DIMENSIONES_SPR, AREAS_YO, AREAS_DEMAS, AREAS_MUNDO } from "../../utils/constants";

// Cambiamos la prop a 'form' para que sea consistente con el componente padre
export default function DiagnosticEstrategico({ form = {}, onChange }) {
    
    const handleChange = (e) => {
        const { name, value } = e.target;
        onChange({ [name]: value });
    };

    return (
        <div className="stack-4">
            <h3 className="section-title">Módulo Estratégico</h3>
            
            <div className="grid-2">
                <InputField 
                    label="Trastorno / Etiqueta" 
                    name="dx_trastorno" 
                    value={form?.dx_trastorno || ""} 
                    onChange={handleChange} 
                />
                <InputField 
                    label="Diagnóstico Operativo (DX.OP / SPR)" 
                    name="dx_op" 
                    value={form?.dx_op || ""} 
                    onChange={handleChange} 
                />
            </div>

            <CheckboxGroup 
                label="Dimensiones SPR" 
                name="dimensiones_spr"
                options={DIMENSIONES_SPR} 
                // Aseguramos que sea un array para evitar errores en .map() dentro del CheckboxGroup
                selectedValues={form?.dimensiones_spr || []} 
                onChange={onChange} 
            />

            <div className="stack-3 bg-light p-3 rounded">
                <h4>Valoración Global Inicial</h4>
                <div className="stack-2">
                    <CheckboxGroup 
                        label="El Yo" 
                        name="val_yo" 
                        options={AREAS_YO} 
                        selectedValues={form?.val_yo || []} 
                        onChange={onChange} 
                    />
                    <CheckboxGroup 
                        label="Los Demás" 
                        name="val_demas" 
                        options={AREAS_DEMAS} 
                        selectedValues={form?.val_demas || []} 
                        onChange={onChange} 
                    />
                    {/* Añadido según Tabla 05 de breve.xlsx */}
                    <CheckboxGroup 
                        label="El Mundo / Sociedad" 
                        name="val_mundo" 
                        options={AREAS_MUNDO} 
                        selectedValues={form?.val_mundo || []} 
                        onChange={onChange} 
                    />
                </div>
            </div>

            <div className="grid-2">
                <InputField 
                    label="Objetivo del Paciente" 
                    name="obj_paciente" 
                    type="textarea" 
                    value={form?.obj_paciente || ""} 
                    onChange={handleChange} 
                />
                <InputField 
                    label="Objetivo del Terapeuta" 
                    name="obj_terapeuta" 
                    type="textarea" 
                    value={form?.obj_terapeuta || ""} 
                    onChange={handleChange} 
                />
            </div>
        </div>
    );
}