import { api } from "./apiClient";
const PROFESSIONAL_ENDPOINT = "/professional";
const DELEGATES_ENDPOINT = "/delegates";


/**
 * Actualiza los datos del perfil del profesional (incluyendo descripción, contactos)
 * y realiza cambios críticos de seguridad (email, teléfono, contraseña).
 * * @param {object} payload - Datos a actualizar, incluyendo currentPassword, newPassword, etc.
 * @returns {Promise<object>} Objeto de confirmación con datos parciales del usuario.
 */
export async function updateProfile(payload) {
    // La doble validación (currentPassword) se maneja en el backend.
    const response = await api.put(`${PROFESSIONAL_ENDPOINT}/profile`, payload, { auth: true });
    // if (auditService) auditService.logAudit("professional_profile_update", { ... });
    return response;
}


/**
 * Lista todos los asistentes delegados por el profesional logueado.
 * * @returns {Promise<Array<object>>} Lista de objetos de delegados.
 */
export async function listDelegates() {
    try {
        const response = await api.get(DELEGATES_ENDPOINT, { auth: true });
        return Array.isArray(response) ? response : [];
    } catch (e) {
        console.error("Error al listar delegados:", e);
        return [];
    }
}

/**
 * Crea un nuevo perfil de asistente delegado, vinculado al profesional.
 * * @param {string} email - Email/Usuario del nuevo asistente.
 * @param {string} password - Contraseña inicial del asistente.
 * @returns {Promise<object>} Datos del asistente creado.
 */
export async function createDelegate(email, password) {
    const response = await api.post(DELEGATES_ENDPOINT, { username: email, password }, { auth: true });
    return response;
}

/**
 * Elimina un perfil de asistente delegado.
 * * @param {string} delegateId 
 * @returns {Promise<boolean>}
 */
export async function deleteDelegate(delegateId) {
    await api.del(`${DELEGATES_ENDPOINT}/${delegateId}`, { auth: true });
    return true;
}

/**
 * [TO DO] Listar auditoría del profesional
 * * @returns {Promise<Array<object>>}
 */
export async function listAuditLog() {
    console.warn("listAuditLog no implementado en backend. Devolviendo mock.");
    return [];
}

/**
 * Obtiene el número de asistentes delegados del profesional logueado.
 * @returns {Promise<number>} Cantidad de asistentes
 */
export async function countDelegates() {
    try {
        const response = await api.get(`${DELEGATES_ENDPOINT}/count`, { auth: true });
        return response?.count ?? 0;
    } catch (e) {
        console.error("Error al contar delegados:", e);
        return 0;
    }
}

export default {
    updateProfile,
    listDelegates,
    createDelegate,
    deleteDelegate,
    listAuditLog,
    countDelegates
};