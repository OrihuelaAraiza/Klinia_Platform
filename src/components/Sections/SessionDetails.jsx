import InputField from "../InputField";
import { useState } from "react";
import Card, { CardBody } from "../UI/Card";
import Button from "../UI/Button";
import { Plus, Trash2 } from "lucide-react";
import { TIPO_INDICACION, CRITERIO_EVALUACION } from "../../utils/constants";

export default function SessionDetails({ form = {}, onChange }) {
    const [pxCount, setPxCount] = useState(() => {
        let max = 1;
        for (let i = 1; i <= 20; i++) {
            if (form?.[`px${i}_text`] || form?.[`px${i}_tipo`]) max = i;
        }
        return max;
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        onChange({ [name]: value });
    };

    const addPX = () => setPxCount(prev => prev + 1);
    
    // CORRECCIÓN AQUÍ:
    const removeLastPX = () => {
        if (pxCount > 1) {
            // Usamos el valor actual de pxCount antes de restarlo
            const indexToRemove = pxCount; 
            
            // 1. Limpiamos los campos del objeto global
            onChange({
                [`px${indexToRemove}_tipo`]: "",
                [`px${indexToRemove}_text`]: "",
                [`px${indexToRemove}_oss`]: false,
                [`px${indexToRemove}_add`]: false,
                [`px${indexToRemove}_rss`]: false,
            });

            // 2. Reducimos el contador visual
            setPxCount(prev => prev - 1);
        }
    };

    const renderPX = (n) => {
        const keyText = `px${n}_text`;
        const keyTipo = `px${n}_tipo`;
        const keyOss = `px${n}_oss`;
        const keyAdd = `px${n}_add`;
        const keyRss = `px${n}_rss`;

        return (
            <Card key={n} className="border-left-blue">
                <CardBody className="stack-3">
                    <div className="cluster justify-between align-center">
                        <strong>Prescripción / Técnica #{n}</strong>
                        <div style={{ width: '200px' }}>
                            <InputField 
                                label="Tipo" 
                                name={keyTipo} 
                                type="select" 
                                options={TIPO_INDICACION} 
                                value={form?.[keyTipo] || ""} 
                                onChange={handleChange} 
                            />
                        </div>
                    </div>
                    
                    <InputField 
                        label="Instrucción / Tarea" 
                        name={keyText} 
                        type="textarea" 
                        value={form?.[keyText] || ""} 
                        onChange={handleChange} 
                    />
                    
                    <div className="grid-3 bg-faint p-2 rounded">
                        <label className="cluster gap-1 pointer">
                            <input 
                                type="checkbox" 
                                checked={!!form?.[keyOss]} 
                                onChange={e => onChange({[keyOss]: e.target.checked})} 
                            /> OSS (Obs)
                        </label>
                        <label className="cluster gap-1 pointer">
                            <input 
                                type="checkbox" 
                                checked={!!form?.[keyAdd]} 
                                onChange={e => onChange({[keyAdd]: e.target.checked})} 
                            /> ADD (Adh)
                        </label>
                        <label className="cluster gap-1 pointer">
                            <input 
                                type="checkbox" 
                                checked={!!form?.[keyRss]} 
                                onChange={e => onChange({[keyRss]: e.target.checked})} 
                            /> RSS (Res)
                        </label>
                    </div>
                </CardBody>
            </Card>
        );
    };

    return (
        <div className="stack-4">
            <h3 className="section-title">Registro de Sesión</h3>
            
            <div className="grid-3">
                <InputField 
                    label="Sesión #" 
                    name="sesionNumero" 
                    type="number" 
                    value={form?.sesionNumero || ""} 
                    onChange={handleChange} 
                    required 
                />
                <InputField 
                    label="Fecha" 
                    name="sesionFecha" 
                    type="date" 
                    value={form?.sesionFecha || ""} 
                    onChange={handleChange} 
                    required 
                />
                <InputField 
                    label="Fase" 
                    name="sesionFase" 
                    value={form?.sesionFase || ""} 
                    onChange={handleChange} 
                />
            </div>

            <div className="stack-2">
                <h4>Evaluación del Cambio</h4>
                <InputField 
                    label="Criterio de Evaluación" 
                    name="cambio_criterio" 
                    type="select" 
                    options={CRITERIO_EVALUACION} 
                    value={form?.cambio_criterio || ""} 
                    onChange={handleChange} 
                />
            </div>

            <hr />
            
            <div className="cluster justify-between align-center">
                <h4>Tareas y Prescripciones (PX)</h4>
                <div className="cluster gap-2">
                    {pxCount > 1 && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={removeLastPX} 
                            type="button" 
                            className="text-error"
                        >
                            <Trash2 size={16} /> Quitar última
                        </Button>
                    )}
                    <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={addPX} 
                        type="button"
                    >
                        <Plus size={16} /> Agregar PX
                    </Button>
                </div>
            </div>

            <div className="stack-3">
                {Array.from({ length: pxCount }, (_, i) => renderPX(i + 1))}
            </div>

            <InputField 
                label="Reestructuraciones Importantes" 
                name="notas_reestructuracion" 
                type="textarea" 
                value={form?.notas_reestructuracion || ""} 
                onChange={handleChange} 
            />
        </div>
    );
}