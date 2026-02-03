import { api } from "./apiClient";
import auditService from "./auditService";

/**
 * Obtiene la historia clínica de un paciente.
 * Soporta tanto PatientId (Médicos) como UserId (Pacientes).
 * @param {string} patientId - ID del paciente o usuario.
 * @param {object} options - Debe incluir { params: { professionalId } }.
 */
export async function getClinicalHistory(patientId, options = {}) {
  try {
    // 1. Construcción manual de la URL con Query Params
    // Esto garantiza que el Backend reciba el professionalId incluso si el apiClient es estricto
    const profId = options.params?.professionalId;
    const url = profId 
      ? `/histories/patient/${patientId}?professionalId=${profId}`
      : `/histories/patient/${patientId}`;

    const response = await api.get(url, { auth: true });

    if (!response) return null;

    // 2. Lógica de flatData: Aplanamos el objeto para que sea fácil de leer en la vista
    // Extraemos datos del objeto 'patient' que viene en el include de Prisma
    const flatData = {
      ...response,
      firstName: response.patient?.firstName || "",
      lastName: response.patient?.lastName || "",
      birthDate: response.patient?.birthDate || null,
      gender: response.patient?.gender || "",
      curp: response.patient?.curp || "",
      nationality: response.patient?.nationality || "",
      state: response.patient?.state || "",
    };

    // 3. Auditoría silenciosa
    auditService.logAudit("hc_view", { patientId }).catch(() => {});

    return flatData;
  } catch (error) {
    // Si el error es 404, devolvemos null para que el Front muestre el EmptyState
    if (error.status === 404) return null;
    throw error;
  }
}

/**
 * Normaliza valores yesno a booleanos
 */
function normalizeYesNo(value) {
  if (value === "SI" || value === "SÍ" || value === true) return true;
  if (value === "NO" || value === false) return false;
  return false; // Default seguro
}

/**
 * Crea o actualiza la historia clínica.
 */
export async function saveClinicalHistory(patientId, payload) {
  try {
    const cleanPayload = { ...payload };
    
    // Lista de todos los campos yesno que necesitan normalización
    const yesNoFields = [
      'hasAllergies', 
      'transfusions', 
      'psychUrgencies', 
      'suicideRiskScreening',
      'tabaquismo',
      'alcoholismo',
      'toxicomanias',
      'actividadFisica',
      'apsicTratamientosPrevios',
      'apsicFarmacosActuales',
    ];
    
    // Normalizar campos yesno
    yesNoFields.forEach(field => {
      if (cleanPayload[field] !== undefined) {
        cleanPayload[field] = normalizeYesNo(cleanPayload[field]);
      }
    });
    
    // Remover campos readonly/computed que no deben enviarse al backend
    const readonlyFields = [
      'expediente',
      'nombreCompleto',
      'fechaNacimiento',
      'curp',
      'nacionalidad',
      'entidad',
      'sexo',
      'indiceTabaquico', // Se calcula automáticamente
    ];
    
    readonlyFields.forEach(field => {
      delete cleanPayload[field];
    });
    
    // El backend solo acepta campos específicos según el esquema
    // Campos que el backend definitivamente acepta (basado en historySchema)
    const acceptedFields = [
      'motive',
      'psychosocialBackground',
      'mentalStatusExam',
      'diagnoses',
      'goals',
      'therapeuticPlan',
    ];
    
    // Separar campos aceptados de campos nuevos
    const finalPayload = {};
    
    // Solo incluir campos que el backend acepta
    acceptedFields.forEach(field => {
      if (cleanPayload[field] !== undefined) {
        finalPayload[field] = cleanPayload[field];
      }
    });
    
    // Agrupar todos los campos nuevos en un objeto extendido
    // Si el backend tiene un campo 'extendedData' o similar, lo usamos
    // Por ahora, intentamos enviarlo como 'extendedData' y si el backend lo rechaza,
    // lo removemos en el catch
    const extendedFields = {};
    Object.keys(cleanPayload).forEach(key => {
      if (!acceptedFields.includes(key) && !readonlyFields.includes(key)) {
        extendedFields[key] = cleanPayload[key];
      }
    });
    
    // Si hay campos extendidos, intentamos enviarlos en un campo JSON
    // El backend puede ignorarlos si no los reconoce
    if (Object.keys(extendedFields).length > 0) {
      // Intentamos enviar los campos nuevos, pero si el backend los rechaza,
      // los removemos y solo enviamos los campos legacy
      // Por ahora, NO los enviamos para evitar el error 400
      // TODO: Cuando el backend se actualice, estos campos serán reconocidos
      // finalPayload.extendedData = extendedFields;
    }
    
    // Limpiar y normalizar valores
    Object.keys(finalPayload).forEach(key => {
      const value = finalPayload[key];
      
      // Para strings: mantener vacíos como string vacío (no null) a menos que el backend requiera null
      if (typeof value === 'string') {
        // Mantener string vacío, el backend puede manejarlo
        // Si el backend requiere null, cambiar esto
      }
      
      // Asegurar que arrays estén en formato correcto
      if (key === 'diagnoses') {
        if (!Array.isArray(value)) {
          finalPayload[key] = value ? [value] : [];
        } else {
          // Limpiar array de diagnósticos: asegurar que cada item tenga code y label
          finalPayload[key] = value
            .filter(item => item !== null && item !== undefined)
            .map(item => {
              // Si es string, convertir a objeto
              if (typeof item === 'string') {
                return { code: item, label: item };
              }
              // Si es objeto, asegurar que tenga code y label
              if (typeof item === 'object') {
                return {
                  code: item.code || item.value || '',
                  label: item.label || item.name || item.code || item.value || '',
                };
              }
              return item;
            });
        }
      }
      
      // Remover null/undefined de otros arrays
      if (Array.isArray(value) && key !== 'diagnoses') {
        finalPayload[key] = value.filter(item => item !== null && item !== undefined);
      }
    });
    
    // Usar el payload filtrado
    const payloadToSend = finalPayload;

    // Validar que al menos haya algún contenido antes de enviar
    const hasContent = Object.values(payloadToSend).some(value => {
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'string') return value.trim().length > 0;
      return value !== null && value !== undefined;
    });
    
    if (!hasContent) {
      console.warn('⚠️ El payload está vacío, enviando estructura mínima');
      // Enviar estructura mínima para que el backend pueda crear el registro
      payloadToSend.motive = payloadToSend.motive || '';
      payloadToSend.diagnoses = payloadToSend.diagnoses || [];
    }
    
    // Log del payload para debugging (siempre en desarrollo, también en producción si hay error)
    const shouldLog = process.env.NODE_ENV === 'development' || import.meta.env.DEV;
    if (shouldLog) {
      console.log('📤 Enviando historia clínica:', {
        patientId,
        acceptedFields: Object.keys(payloadToSend),
        extendedFieldsCount: Object.keys(extendedFields).length,
        payload: JSON.parse(JSON.stringify(payloadToSend)), // Deep clone para logging
        hasContent,
      });
      
      // Advertencia si hay campos extendidos que no se enviarán
      if (Object.keys(extendedFields).length > 0) {
        console.warn('⚠️ Campos nuevos no se enviarán al backend (hasta que se actualice):', Object.keys(extendedFields));
      }
    }
    
    // Guardar campos extendidos en localStorage como backup temporal
    // Esto permite recuperarlos cuando el backend se actualice
    if (Object.keys(extendedFields).length > 0 && typeof window !== 'undefined') {
      try {
        const backupKey = `hc_extended_${patientId}`;
        window.localStorage.setItem(backupKey, JSON.stringify({
          timestamp: new Date().toISOString(),
          data: extendedFields,
        }));
      } catch (e) {
        // Ignorar errores de localStorage
      }
    }

    const response = await api.post(`/histories/patient/${patientId}`, payloadToSend, { auth: true });
    await auditService.logAudit("hc_save", { patientId });
    return response;
  } catch (error) {
    // El apiClient puede lanzar errores de diferentes formas
    // Intentar extraer el mensaje de error del backend
    let errorMessage = "No pudimos guardar la historia clínica.";
    let errorDetails = null;
    
    // Intentar obtener detalles del error
    if (error.response?.data) {
      errorDetails = error.response.data;
      errorMessage = error.response.data.message || 
                    error.response.data.error || 
                    error.response.data.details ||
                    `Error ${error.response.status}: ${JSON.stringify(error.response.data)}`;
    } else if (error.data) {
      errorDetails = error.data;
      errorMessage = error.data.message || error.data.error || errorMessage;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    // Log detallado del error
    console.error('❌ Error al guardar historia clínica:', {
      status: error.status || error.response?.status,
      message: errorMessage,
      errorDetails: errorDetails,
      payloadSent: payloadToSend,
      extendedFieldsCount: Object.keys(extendedFields).length,
    });
    
    // Crear un error mejorado con toda la información
    const enhancedError = new Error(errorMessage);
    enhancedError.status = error.status || error.response?.status;
    enhancedError.data = errorDetails || error.data || error.response?.data;
    enhancedError.originalError = error;
    throw enhancedError;
  }
}

export async function getPatientHistory(patientId, professionalId) {
  // Enviamos el professionalId como query param para que el backend filtre esa historia específica
  return api.get(`/histories/patient/${patientId}?professionalId=${professionalId}`, { 
    auth: true 
  });
}

export default {
  getClinicalHistory,
  saveClinicalHistory,
  getPatientHistory
};