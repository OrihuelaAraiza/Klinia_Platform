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
    
    // Separar campos legacy (que el backend reconoce) de campos nuevos
    // Los campos nuevos se pueden enviar en un campo JSON si el backend lo soporta
    // Por ahora, los enviamos todos y el backend los ignorará si no los reconoce
    // TODO: Cuando el backend se actualice, estos campos serán reconocidos
    
    // Campos legacy que el backend definitivamente acepta
    const legacyFields = [
      'motive',
      'psychosocialBackground',
      'mentalStatusExam',
      'diagnoses',
      'goals',
      'therapeuticPlan',
      'hasAllergies',
      'transfusions',
      'psychUrgencies',
      'suicideRiskScreening',
      'symptomOnset',
      'previousDiagnoses',
      'psychHospitalizations',
      'previousTreatments',
      'treatmentAdherence',
      'currentMedications',
      'chronicDiseases',
      'previousSurgeries',
      'previousHospitalizations',
      'traumatisms',
      'familyBackground',
      'dietaryHabits',
      'physicalActivity',
      'toxicHabits',
      'sleepPatterns',
    ];
    
    // Si el backend tiene un campo JSON para datos extendidos, agrupar los nuevos campos ahí
    // Por ahora, enviamos todo y el backend ignorará lo que no reconozca
    
    // Limpiar valores vacíos de strings (convertir a null o undefined según prefiera el backend)
    Object.keys(cleanPayload).forEach(key => {
      if (typeof cleanPayload[key] === 'string' && cleanPayload[key].trim() === '') {
        // Mantener strings vacíos para campos opcionales, pero podrías cambiarlo a null si el backend lo requiere
        // cleanPayload[key] = null;
      }
    });

    // Log del payload para debugging (solo en desarrollo)
    if (process.env.NODE_ENV === 'development') {
      console.log('📤 Enviando historia clínica:', {
        patientId,
        payloadKeys: Object.keys(cleanPayload),
        payload: cleanPayload,
      });
    }

    const response = await api.post(`/histories/patient/${patientId}`, cleanPayload, { auth: true });
    await auditService.logAudit("hc_save", { patientId });
    return response;
  } catch (error) {
    // Mejorar el mensaje de error para debugging
    if (error.response?.data) {
      console.error('❌ Error del backend:', {
        status: error.response.status,
        data: error.response.data,
        payload: cleanPayload,
      });
      // Crear un error más descriptivo
      const errorMessage = error.response.data.message || 
                          error.response.data.error || 
                          `Error ${error.response.status}: ${JSON.stringify(error.response.data)}`;
      const enhancedError = new Error(errorMessage);
      enhancedError.status = error.response.status;
      enhancedError.data = error.response.data;
      throw enhancedError;
    }
    throw error;
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