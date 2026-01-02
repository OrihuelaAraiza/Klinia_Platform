/**
 * Clinical History Validator
 * Determines if a clinical history is incomplete based on required fields
 */

import { HC_SCHEMA } from "../config/clinicalSchemas/hc.schema.js";

/**
 * Get all required field IDs from the schema
 */
function getRequiredFields() {
  const requiredFields = new Set();
  
  HC_SCHEMA.sections.forEach((section) => {
    section.fields.forEach((field) => {
      // Direct required fields
      if (field.required) {
        requiredFields.add(field.id);
      }
      
      // Required fields in lists
      if (field.type === "list" && field.repeatable && Array.isArray(field.subfields)) {
        field.subfields.forEach((subfield) => {
          if (subfield.required) {
            requiredFields.add(`${field.id}.${subfield.id}`);
          }
        });
      }
    });
  });
  
  return requiredFields;
}

/**
 * Check if a list field has at least one valid entry
 */
function hasValidListEntry(formData, fieldId, subfields) {
  const listValue = formData[fieldId];
  if (!Array.isArray(listValue) || listValue.length === 0) {
    return false;
  }
  
  // Check if at least one entry has all required subfields
  return listValue.some((entry) => {
    if (typeof entry !== "object" || entry === null) {
      return false;
    }
    
    return subfields.every((subfield) => {
      if (!subfield.required) {
        return true;
      }
      const value = entry[subfield.id];
      return value !== undefined && value !== null && value !== "";
    });
  });
}

/**
 * Check if conditional required fields are satisfied
 */
function checkConditionalFields(formData, field) {
  // Check conditional fields
  if (field.conditional) {
    const conditionalValue = formData[field.conditional.field];
    if (conditionalValue !== field.conditional.value) {
      return true; // Field is not required if condition is not met
    }
  }
  
  // If field is required and condition is met (or no condition), check it
  if (field.required) {
    if (field.type === "list" && field.repeatable) {
      // For lists, check if at least one entry exists with required subfields
      return hasValidListEntry(formData, field.id, field.subfields || []);
    } else {
      const value = formData[field.id];
      return value !== undefined && value !== null && value !== "";
    }
  }
  
  return true;
}

/**
 * Validate if a clinical history is complete
 * @param {Object} historyData - The clinical history data to validate
 * @returns {Object} - { isComplete: boolean, missingFields: string[] }
 */
export function validateClinicalHistory(historyData) {
  if (!historyData || typeof historyData !== "object") {
    return {
      isComplete: false,
      missingFields: ["Historia clínica no existe"],
      completionPercentage: 0,
    };
  }
  
  const missingFields = [];
  let totalRequired = 0;
  let completedRequired = 0;
  
  HC_SCHEMA.sections.forEach((section) => {
    section.fields.forEach((field) => {
      // Skip readonly/computed fields
      if (field.type === "readonly" || field.computed) {
        return;
      }
      
      // Check if field should be validated
      const shouldValidate = field.required || (field.conditional && field.required);
      
      if (shouldValidate) {
        totalRequired++;
        
        const isValid = checkConditionalFields(historyData, field);
        
        if (isValid) {
          completedRequired++;
        } else {
          missingFields.push(field.label || field.id);
        }
      }
      
      // Special handling for conditional required fields
      if (field.conditional && field.required) {
        const conditionalValue = historyData[field.conditional.field];
        if (conditionalValue === field.conditional.value) {
          totalRequired++;
          const isValid = checkConditionalFields(historyData, field);
          if (isValid) {
            completedRequired++;
          } else {
            missingFields.push(field.label || field.id);
          }
        }
      }
    });
  });
  
  const completionPercentage = totalRequired > 0 
    ? Math.round((completedRequired / totalRequired) * 100) 
    : 0;
  
  return {
    isComplete: missingFields.length === 0 && totalRequired > 0,
    missingFields,
    completionPercentage,
    totalRequired,
    completedRequired,
  };
}

/**
 * Check if a clinical history is incomplete (simplified check)
 * @param {Object} historyData - The clinical history data
 * @returns {boolean} - true if incomplete, false if complete
 */
export function isClinicalHistoryIncomplete(historyData) {
  const validation = validateClinicalHistory(historyData);
  return !validation.isComplete;
}

export default {
  validateClinicalHistory,
  isClinicalHistoryIncomplete,
};

