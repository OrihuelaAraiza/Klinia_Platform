import InputField from "../InputField";
import CheckboxGroup from "../shared/CheckboxGroup";
import { DIMENSIONES_SPR, AREAS_YO, AREAS_DEMAS, AREAS_MUNDO } from "../../utils/constants";

export default function DiagnosticEstrategico({ form = {}, onChange }) {
    
    const handleChange = (e) => {
        const { name, value } = e.target;
        onChange({ [name]: value });
    };

    /**
     * Maneja el cambio de los inputs de texto dinámicos
     * @param {string} sectionName - Nombre de la sección (ej: 'val_yo_detalles')
     * @param {string} optionId - ID de la opción seleccionada
     * @param {string} value - Texto ingresado
     */
    const handleDetailChange = (sectionName, optionId, value) => {
        const currentDetails = form[sectionName] || {};
        onChange({
            [sectionName]: {
                ...currentDetails,
                [optionId]: value
            }
        });
    };

    // Función auxiliar para renderizar los inputs de detalles
    const renderDetails = (sectionName, selectedIds, optionsList) => {
        if (!selectedIds || selectedIds.length === 0) return null;

        return (
            <div className="details-container bg-white p-2 mt-2 rounded border">
                <p className="text-muted small mb-2">Detalles de selección:</p>
                <div className="grid-2 gap-2">
                    {selectedIds.map(id => {
                        const option = optionsList.find(opt => opt.value === id);
                        return (
                            <InputField 
                                key={id}
                                label={`Detalle: ${option?.label || id}`}
                                size="small"
                                value={form[sectionName]?.[id] || ""}
                                onChange={(e) => handleDetailChange(sectionName, id, e.target.value)}
                            />
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="stack-4">
            <h3 className="section-title">Módulo Estratégico</h3>
            
            <div className="grid-2">
                <InputField label="Trastorno / Etiqueta" name="dx_trastorno" value={form?.dx_trastorno || ""} onChange={handleChange} />
                <InputField label="Diagnóstico Operativo (DX.OP / SPR)" name="dx_op" value={form?.dx_op || ""} onChange={handleChange} />
            </div>

            <div className="section-group p-3 border rounded shadow-sm">
                <CheckboxGroup 
                    label="Dimensiones SPR" 
                    name="dimensiones_spr"
                    options={DIMENSIONES_SPR} 
                    selectedValues={form?.dimensiones_spr || []} 
                    onChange={onChange} 
                />
                {renderDetails('dimensiones_detalles', form?.dimensiones_spr, DIMENSIONES_SPR)}
            </div>

            <div className="stack-3 bg-light p-3 rounded">
                <h4>Valoración Global Inicial</h4>
                
                <div className="stack-3">
                    <div className="p-2 border-bottom">
                        <CheckboxGroup 
                            label="El Yo" 
                            name="val_yo" 
                            options={AREAS_YO} 
                            selectedValues={form?.val_yo || []} 
                            onChange={onChange} 
                        />
                        {renderDetails('val_yo_detalles', form?.val_yo, AREAS_YO)}
                    </div>

                    <div className="p-2 border-bottom">
                        <CheckboxGroup 
                            label="Los Demás" 
                            name="val_demas" 
                            options={AREAS_DEMAS} 
                            selectedValues={form?.val_demas || []} 
                            onChange={onChange} 
                        />
                        {renderDetails('val_demas_detalles', form?.val_demas, AREAS_DEMAS)}
                    </div>

                    <div className="p-2">
                        <CheckboxGroup 
                            label="El Mundo / Sociedad" 
                            name="val_mundo" 
                            options={AREAS_MUNDO} 
                            selectedValues={form?.val_mundo || []} 
                            onChange={onChange} 
                        />
                        {renderDetails('val_mundo_detalles', form?.val_mundo, AREAS_MUNDO)}
                    </div>
                </div>
            </div>

            <div className="grid-2">
                <InputField label="Objetivo del Paciente" name="obj_paciente" type="textarea" value={form?.obj_paciente || ""} onChange={handleChange} />
                <InputField label="Objetivo del Terapeuta" name="obj_terapeuta" type="textarea" value={form?.obj_terapeuta || ""} onChange={handleChange} />
            </div>
        </div>
    );
}