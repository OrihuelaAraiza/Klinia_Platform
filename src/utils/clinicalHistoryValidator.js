/**
 * Clinical History Validator
 * Validates clinical history completeness based on HC_SCHEMA
 */

import HC_SCHEMA from "../config/clinicalSchemas/hc.schema";

/**
 * Check if a field value is empty
 */
function isEmpty(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (typeof value === "number") return false; // 0 is valid
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
}

/**
 * Check if a conditional field should be shown/validated
 */
function shouldValidateConditional(field, formData) {
  if (!field.conditional) return true;
  const { field: conditionalField, value: conditionalValue } = field.conditional;
  const fieldValue = formData[conditionalField];
  return fieldValue === conditionalValue;
}

/**
 * Validate a single field
 */
function validateField(field, formData, sectionId) {
  // Skip readonly/computed fields - they are auto-generated
  if (field.type === "readonly") return null;

  // Skip conditional fields that don't meet their condition
  if (!shouldValidateConditional(field, formData)) return null;

  const value = formData[field.id];

  // Handle list fields
  if (field.type === "list") {
    if (field.required && isEmpty(value)) {
      return {
        fieldId: field.id,
        sectionId,
        label: field.label,
        type: field.type,
      };
    }
    // If list exists, validate subfields if they are required
    if (Array.isArray(value) && value.length > 0 && field.subfields) {
      for (const entry of value) {
        for (const subfield of field.subfields) {
          if (subfield.required && isEmpty(entry[subfield.id])) {
            return {
              fieldId: `${field.id}.${subfield.id}`,
              sectionId,
              label: `${field.label} - ${subfield.label}`,
              type: subfield.type,
            };
          }
        }
      }
    }
    return null;
  }

  // Handle regular fields
  if (field.required && isEmpty(value)) {
    return {
      fieldId: field.id,
      sectionId,
      label: field.label,
      type: field.type,
    };
  }

  return null;
}

/**
 * Get all required fields from the schema (for calculating total)
 */
function getAllFields(schema) {
  const fields = [];
  for (const section of schema.sections) {
    for (const field of section.fields) {
      if (field.type === "readonly") continue;
      fields.push({ ...field, sectionId: section.sectionId });
    }
  }
  return fields;
}

/**
 * Count total validatable fields (excluding readonly and conditional fields that don't apply)
 * This counts fields that could potentially be filled based on current form state
 */
function countValidatableFields(schema, formData) {
  let count = 0;
  for (const section of schema.sections) {
    for (const field of section.fields) {
      if (field.type === "readonly") continue;
      if (!shouldValidateConditional(field, formData)) continue;
      
      // For list fields, count the list itself plus subfields if list has entries
      if (field.type === "list" && field.subfields) {
        const listValue = formData[field.id];
        count++; // Count the list field itself
        if (Array.isArray(listValue) && listValue.length > 0) {
          // Count subfields for each entry
          const validSubfields = field.subfields.filter((sf) => sf.type !== "readonly");
          count += listValue.length * validSubfields.length;
        }
      } else {
        count++; // Regular field
      }
    }
  }
  return count;
}

/**
 * Validate clinical history and return missing fields
 */
export function validateClinicalHistory(historyData = {}) {
  const formData = historyData.data || historyData; // Support both formats
  const missingFields = [];

  for (const section of HC_SCHEMA.sections) {
    for (const field of section.fields) {
      const error = validateField(field, formData, section.sectionId);
      if (error) {
        missingFields.push(error);
      }
    }
  }

  // Count total validatable fields
  const totalFields = countValidatableFields(HC_SCHEMA, formData);
  
  // Count filled fields (simplified: total - missing)
  // Note: This is an approximation. A more accurate count would require
  // checking each field individually, but for UI purposes this is sufficient
  const filledFields = Math.max(0, totalFields - missingFields.length);
  const completionPercentage =
    totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;

  return {
    isValid: missingFields.length === 0,
    missingFields,
    completionPercentage,
    totalFields,
    filledFields,
  };
}

/**
 * Check if clinical history is incomplete
 */
export function isClinicalHistoryIncomplete(historyData = {}) {
  const validation = validateClinicalHistory(historyData);
  return !validation.isValid;
}

export default {
  validateClinicalHistory,
  isClinicalHistoryIncomplete,
};
