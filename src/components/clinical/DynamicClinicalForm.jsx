/**
 * DynamicClinicalForm
 * Schema-driven form renderer for clinical history and notes
 * Uses React Hook Form for form management and validation
 */

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import ClinicalSectionCard from "./ClinicalSectionCard";
import ClinicalFieldRenderer from "./fields/ClinicalFieldRenderer";
import Button from "../UI/Button";

/**
 * Builds a Zod schema from field configuration
 */
function buildZodSchema(fields) {
  const schemaObj = {};
  fields.forEach((field) => {
    // Skip readonly fields from validation
    if (field.type === "readonly") {
      return;
    }

    // Conditional fields are always optional in schema
    // UI handles showing/hiding them
    const isConditional = !!field.conditional;

    // Handle list fields with subfield validation
    if (field.type === "list" && field.subfields) {
      const itemSchema = {};
      field.subfields.forEach((subfield) => {
        if (subfield.type === "readonly") return;
        let subSchema;
        switch (subfield.type) {
          case "text":
          case "textarea":
            subSchema = subfield.required ? z.string().min(1) : z.string().optional();
            break;
          case "number":
            subSchema = subfield.required ? z.number() : z.number().optional();
            break;
          case "date":
          case "datetime":
            subSchema = subfield.required ? z.string().min(1) : z.string().optional();
            break;
          case "select":
          case "yesno":
            subSchema = subfield.required ? z.string().min(1) : z.string().optional();
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
        schemaObj[field.id] = listSchema.optional();
      }
      return;
    }

    // Handle regular fields
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
          fieldSchema = z.number({ required_error: `${field.label} es requerido` });
        } else {
          fieldSchema = z.union([z.number(), z.nan()]).optional();
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
      case "yesno":
        fieldSchema = z.boolean();
        if (!isConditional && field.required) {
          fieldSchema = fieldSchema.refine(val => val === true || val === false, `${field.label} es requerido`);
        } else {
          fieldSchema = fieldSchema.optional();
        }
        break;

      case "list":
        fieldSchema = z.array(z.any()).optional();
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
  // Build Zod schema from field definitions
  // For conditional fields, we make them optional and validate in UI
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

  // Watch all form values to get current state
  const formData = watch();

  // Update form when initialData changes
  useEffect(() => {
    if (initialData) {
      reset(initialData);
    }
  }, [initialData, reset]);

  const handleFieldChange = (fieldId, value) => {
    setValue(fieldId, value, { shouldValidate: true });
  };

  const handleFormSubmit = async (data) => {
    try {
      await onSubmit?.(data);
    } catch (error) {
      console.error("Form submission error:", error);
    }
  };

  const handleDraftSave = async () => {
    try {
      const currentData = watch();
      await onSaveDraft?.(currentData);
    } catch (error) {
      console.error("Draft save error:", error);
    }
  };

  /*schema.sections.forEach(section => {
    section.fields.forEach(field => {
      if (!(field.id in initialData)) {
        console.warn("NO MATCH:", field.id);
      }
    });
  });*/

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="stack-5" noValidate>
      {schema.sections.map((section) => (
        <ClinicalSectionCard key={section.sectionId} section={section}>
          <div className="stack-4">
            {section.fields.map((field) => {
              const fieldValue = formData[field.id];
              const fieldError = errors[field.id]?.message;

              return (
                <ClinicalFieldRenderer
                  key={field.id}
                  field={field}
                  value={fieldValue}
                  onChange={handleFieldChange}
                  errors={{ [field.id]: fieldError }}
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

