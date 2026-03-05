/**
 * ClinicalHistoryWizard
 * Componente wizard con navegación por pasos para historia clínica
 * Basado en el prototipo BreveMente con navegación tipo breadcrumbs/pasos
 */

import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Stepper from "../UI/Stepper";
import Button from "../UI/Button";
import ClinicalSectionCard from "./ClinicalSectionCard";
import ClinicalFieldRenderer from "./fields/ClinicalFieldRenderer";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Construye un esquema de Zod dinámicamente a partir de la configuración de campos.
 */
function buildZodSchema(fields) {
  const schemaObj = {};

  fields.forEach((field) => {
    if (field.type === "readonly") return;
    const isConditional = !!field.conditional;

    if (field.type === "list" && field.subfields) {
      const itemSchema = {};
      field.subfields.forEach((subfield) => {
        if (subfield.type === "readonly") return;
        let subSchema;
        switch (subfield.type) {
          case "text":
          case "textarea":
            subSchema = subfield.required ? z.string().min(1, "Requerido") : z.string().optional().or(z.literal(""));
            break;
          case "number":
            subSchema = subfield.required ? z.coerce.number() : z.coerce.number().optional();
            break;
          case "date":
          case "datetime":
            subSchema = subfield.required ? z.string().min(1, "Requerido") : z.string().optional();
            break;
          case "select":
          case "yesno":
            subSchema = z.any().optional();
            break;
          default:
            subSchema = z.any().optional();
        }
        itemSchema[subfield.id] = subSchema;
      });
      const listSchema = z.array(z.object(itemSchema));
      if (field.required) {
        schemaObj[field.id] = listSchema.min(1, `${field.label} es requerido`);
      } else {
        schemaObj[field.id] = listSchema.optional().default([]);
      }
      return;
    }

    let fieldSchema;
    switch (field.type) {
      case "text":
      case "textarea":
        fieldSchema = z.string();
        if (field.required && !isConditional) {
          fieldSchema = fieldSchema.min(1, `${field.label} es requerido`);
        } else {
          fieldSchema = fieldSchema.optional().or(z.literal(""));
        }
        break;
      case "number":
        if (field.required && !isConditional) {
          fieldSchema = z.coerce.number({
            required_error: `${field.label} es requerido`,
            invalid_type_error: "Debe ser un número"
          });
        } else {
          fieldSchema = z.union([z.coerce.number(), z.nan()]).optional();
        }
        break;
      case "date":
      case "datetime":
        fieldSchema = z.string();
        if (field.required && !isConditional) {
          fieldSchema = fieldSchema.min(1, `${field.label} es requerido`);
        } else {
          fieldSchema = fieldSchema.optional().or(z.literal(""));
        }
        break;
      case "select":
        fieldSchema = z.string();
        if (!isConditional && field.required) {
          fieldSchema = fieldSchema.min(1, `${field.label} es requerido`);
        } else {
          fieldSchema = fieldSchema.optional().or(z.literal("")).or(z.null());
        }
        break;
      case "yesno":
        fieldSchema = z.preprocess((val) => {
          if (typeof val === "boolean") return val;
          if (typeof val === "string") {
            const s = val.toUpperCase().trim();
            if (s === "SI" || s === "SÍ" || s === "TRUE") return true;
            if (s === "NO" || s === "FALSE") return false;
          }
          return val;
        }, z.boolean({ invalid_type_error: `${field.label} debe ser Sí/No` }));
        if (!isConditional && field.required) {
          fieldSchema = fieldSchema.refine(val => val === true || val === false, `${field.label} es requerido`);
        } else {
          fieldSchema = fieldSchema.optional();
        }
        break;
      case "list":
        fieldSchema = z.array(z.any()).optional().default([]);
        if (field.required) {
          fieldSchema = z.array(z.any()).min(1, `${field.label} es requerido`);
        }
        break;
      default:
        fieldSchema = z.any().optional();
    }
    schemaObj[field.id] = fieldSchema;
  });

  return z.object(schemaObj);
}

export default function ClinicalHistoryWizard({
  schema,
  initialData = {},
  onSubmit,
  onSaveDraft,
  readOnly = false,
  context = {},
  submitLabel = "Guardar",
  draftLabel = "Guardar borrador",
}) {
  const [currentStep, setCurrentStep] = useState(0);

  // Crear pasos desde las secciones del esquema
  const steps = useMemo(() =>
    schema.sections.map((section, index) => ({
      id: section.sectionId,
      label: section.title,
      section,
      index,
    })),
    [schema]
  );

  const currentStepData = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  // Construir esquema Zod para todos los campos (necesario para mantener datos entre pasos)
  const fullSchema = useMemo(() => {
    const allFields = schema.sections.flatMap(section => section.fields);
    return buildZodSchema(allFields);
  }, [schema]);

  const {
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset,
    trigger,
  } = useForm({
    resolver: zodResolver(fullSchema),
    defaultValues: initialData,
    mode: "onBlur",
    shouldUnregister: false,
  });

  const formData = watch();

  useEffect(() => {
    if (initialData) {
      reset(initialData);
    }
  }, [initialData, reset]);

  // Actualizar índice tabáquico automáticamente
  useEffect(() => {
    const cantidad = parseFloat(formData.tabaquismoCantidad) || 0;
    const tiempo = parseFloat(formData.tabaquismoTiempo) || 0;
    if (cantidad && tiempo) {
      const indice = ((cantidad / 20) * tiempo).toFixed(2);
      setValue("indiceTabaquico", indice, { shouldValidate: false });
    }
  }, [formData.tabaquismoCantidad, formData.tabaquismoTiempo, setValue]);

  // Auto-completar fecha de inicio si no existe
  useEffect(() => {
    if (!formData.apsicFechaInicio && context?.datetime) {
      const date = new Date(context.datetime);
      setValue("apsicFechaInicio", date.toISOString().split('T')[0], { shouldValidate: false });
    }
  }, [formData.apsicFechaInicio, context?.datetime, setValue]);

  const handleFieldChange = (fieldId, value) => {
    setValue(fieldId, value, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true
    });
  };

  const handleNext = async (e) => {
    e?.preventDefault();
    e?.stopPropagation();

    const currentFields = currentStepData.section.fields.map(f => f.id);
    const isValid = await trigger(currentFields);
    if (!isValid) return;
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleStepClick = async (targetStep) => {
    if (targetStep === currentStep || targetStep < 0 || targetStep >= steps.length) {
      return;
    }

    if (targetStep > currentStep) {
      const currentFields = currentStepData.section.fields.map((f) => f.id);
      const isValid = await trigger(currentFields);
      if (!isValid) return;
    }

    setCurrentStep(targetStep);
  };

  const handleFormSubmit = async (data) => {
    try {
      // Asegurar que se envíen todos los datos del formulario, no solo los del paso actual
      const allFormData = watch();

      // Combinar datos: los datos del submit pueden tener valores más actualizados
      // pero también necesitamos todos los datos de otros pasos
      const dataToSubmit = { ...allFormData, ...data };

      // Filtrar valores undefined pero mantener null y strings vacíos
      const cleanedData = {};
      Object.keys(dataToSubmit).forEach(key => {
        if (dataToSubmit[key] !== undefined) {
          cleanedData[key] = dataToSubmit[key];
        }
      });

      // Log para debugging (siempre mostrar para diagnosticar)
      console.log('📝 Datos del formulario al enviar:', {
        stepDataKeys: Object.keys(data || {}),
        allFormDataKeys: Object.keys(allFormData || {}),
        mergedDataKeys: Object.keys(cleanedData),
        mergedData: cleanedData,
        hasData: Object.keys(cleanedData).length > 0,
        sampleValues: Object.keys(cleanedData).slice(0, 5).reduce((acc, key) => {
          acc[key] = cleanedData[key];
          return acc;
        }, {}),
      });

      // Validar que haya datos antes de enviar
      if (Object.keys(cleanedData).length === 0) {
        console.error('❌ No hay datos para enviar. El formulario está vacío.');
        throw new Error('El formulario está vacío. Por favor, completa al menos un campo.');
      }

      await onSubmit?.(cleanedData);
    } catch (error) {
      console.error("Error al enviar el formulario:", error);
      throw error; // Re-lanzar para que el componente padre pueda manejarlo
    }
  };

  const handleDraftSave = async () => {
    try {
      const currentData = watch();
      await onSaveDraft?.(currentData);
    } catch (error) {
      console.error("Error al guardar borrador:", error);
    }
  };

  const stepperSteps = useMemo(() =>
    steps.map((step, index) => ({
      id: step.id,
      label: step.label,
      status:
        index === currentStep
          ? "current"
          : index < currentStep
            ? "completed"
            : "pending",
    })),
    [steps, currentStep]
  );

  if (!currentStepData) {
    return <div>Error: No se encontró el paso actual</div>;
  }

  return (
    <div className="clinical-history-wizard">
      <div className="wizard-stepper">
        <Stepper steps={stepperSteps} onStepClick={handleStepClick} />
      </div>

      {/* form con id, sin botones dentro del form */}
      <form
        id="clinical-history-form"
        onSubmit={handleSubmit(handleFormSubmit)}
        className="wizard-form stack-5"
        noValidate
      >
        <ClinicalSectionCard section={currentStepData.section}>
          <div className="stack-4">
            {currentStepData.section.fields.map((field) => (
              <ClinicalFieldRenderer
                key={field.id}
                field={field}
                value={formData[field.id]}
                onChange={handleFieldChange}
                errors={errors}
                readOnly={readOnly}
                context={context}
                formData={formData}
              />
            ))}
          </div>
        </ClinicalSectionCard>
      </form>

      {/* Botones fuera del form */}
      {!readOnly && (
        <div className="wizard-actions cluster" style={{ justifyContent: "space-between", gap: "var(--s-2)" }}>
          <div className="cluster" style={{ gap: "var(--s-2)" }}>
            {!isFirstStep && (
              <Button type="button" variant="secondary" onClick={handlePrevious} disabled={isSubmitting}>
                <ChevronLeft size={16} style={{ marginRight: "0.5rem" }} />
                Anterior
              </Button>
            )}
          </div>

          <div className="cluster" style={{ gap: "var(--s-2)" }}>
            {onSaveDraft && (
              <Button type="button" variant="secondary" onClick={handleDraftSave} disabled={isSubmitting}>
                {draftLabel}
              </Button>
            )}
            {!isLastStep ? (
              <Button
                type="button"
                variant="primary"
                onClick={(e) => handleNext(e)}
                disabled={isSubmitting}
              >
                Siguiente
                <ChevronRight size={16} style={{ marginLeft: "0.5rem" }} />
              </Button>
            ) : (
              // Conexión al form por medio del id sin tener que estar dentro del <form>
              <Button type="submit" form="clinical-history-form" loading={isSubmitting} disabled={isSubmitting}>
                {submitLabel}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
