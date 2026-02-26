import { api } from "./apiClient";

// Listar todas las bitácoras
export async function listSupervisionLogs() {
    return api.get("/supervision", { auth: true });
}

// Obtener una bitácora por ID
export async function getSupervisionLog(id) {
    return api.get(`/supervision/${id}`, { auth: true });
}

// Crear bitácora
export async function createSupervisionLog(payload) {
    return api.post("/supervision", payload, { auth: true });
}

// Eliminar bitácora
export async function deleteSupervisionLog(id) {
    return api.del(`/supervision/${id}`, { auth: true });
}

export default {
    listSupervisionLogs,
    getSupervisionLog,
    createSupervisionLog,
    deleteSupervisionLog,
};