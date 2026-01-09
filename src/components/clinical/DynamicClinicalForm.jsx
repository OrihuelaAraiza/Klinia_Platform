/**
 * DynamicClinicalForm
 * Generador de formularios basado en esquemas para historia clínica y notas.
 * Utiliza React Hook Form para la gestión de estados y Zod para validación.
 */

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import ClinicalSectionCard from "./ClinicalSectionCard";
import ClinicalFieldRenderer from "./fields/ClinicalFieldRenderer";
import Button from "../UI/Button";

/**
 * Construye un esquema de Zod dinámicamente a partir de la configuración de campos.
 */
function buildZodSchema(fields) {
  const schemaObj = {};

  fields.forEach((field) => {
    // Omitir campos de solo lectura de la validación
    if (field.type === "readonly") {
      return;
    }

    // Los campos condicionales siempre son opcionales en el esquema base
    const isConditional = !!field.conditional;

    // --- Manejo de campos tipo LISTA (con subcampos) ---
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

    // --- Manejo de campos REGULARES ---
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
        // CORRECCIÓN GÉNERO: Los selectores siempre validan como STRING
        fieldSchema = z.string();
        if (!isConditional && field.required) {
          fieldSchema = fieldSchema.min(1, `${field.label} es requerido`);
        } else {
          fieldSchema = fieldSchema.optional().or(z.literal("")).or(z.null());
        }
        break;

      case "yesno":
        // CORRECCIÓN SÍ/NO: Pre-procesamos para aceptar "SI"/"NO" o Booleanos
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

      case "file":
        fieldSchema = z.array(z.any()).optional();
        break;

      default:
        fieldSchema = z.any().optional();
    }

    schemaObj[field.id] = fieldSchema;
  });

  return z.object(schemaObj);
}

export default function DynamicClinicalForm({
  schema,
  initialData = {},
  onSubmit,
  onSaveDraft,
  readOnly = false,
  context = {},
  showDraftButton = false,
  submitLabel = "Guardar",
  draftLabel = "Guardar borrador",
}) {
  // Memorizamos el esquema para evitar re-validaciones innecesarias
  const zodSchema = useMemo(() => {
    const allFields = schema.sections.flatMap((section) => section.fields);
    return buildZodSchema(allFields);
  }, [schema]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: zodResolver(zodSchema),
    defaultValues: initialData,
    mode: "onBlur",
  });

  // Observamos los datos para lógica condicional en tiempo real
  const formData = watch();

  // Sincronizamos el formulario si initialData cambia (ej: al cargar de la BD)
  useEffect(() => {
    if (initialData) {
      reset(initialData);
    }
  }, [initialData, reset]);

  // Manejador central de cambios para componentes personalizados
  const handleFieldChange = (fieldId, value) => {
    setValue(fieldId, value, { 
      shouldValidate: true, 
      shouldDirty: true, 
      shouldTouch: true 
    });
  };

  const handleFormSubmit = async (data) => {
    try {
      // Enviamos el objeto plano al manejador superior
      await onSubmit?.(data);
    } catch (error) {
      console.error("Error al enviar el formulario dinámico:", error);
    }
  };

  const handleDraftSave = async () => {
    try {
      const currentData = watch();
      await onSaveDraft?.(currentData);
    } catch (error) {
      console.error("Error al guardar borrador dinámico:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="stack-5" noValidate>
      {schema.sections.map((section) => (
        <ClinicalSectionCard key={section.sectionId} section={section}>
          <div className="stack-4">
            {section.fields.map((field) => {
              const fieldValue = formData[field.id];
              // Extraemos el mensaje de error si existe para este campo
              const fieldError = errors[field.id]?.message;

              return (
                <ClinicalFieldRenderer
                  key={field.id}
                  field={field}
                  value={fieldValue}
                  onChange={handleFieldChange}
                  errors={errors} // Pasamos el objeto completo de errores
                  readOnly={readOnly}
                  context={context}
                  formData={formData}
                />
              );
            })}
          </div>
        </ClinicalSectionCard>
      ))}

      {!readOnly && (
        <div className="form-actions cluster" style={{ justifyContent: "flex-end", gap: "var(--s-2)" }}>
          {showDraftButton && onSaveDraft && (
            <Button
              type="button"
              variant="secondary"
              onClick={handleDraftSave}
              disabled={isSubmitting}
            >
              {draftLabel}
            </Button>
          )}
          <Button type="submit" loading={isSubmitting} disabled={isSubmitting}>
            {submitLabel}
          </Button>
        </div>
      )}
    </form>
  );
}