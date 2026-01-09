import { api } from "./apiClient";
import auditService from "./auditService";

function ensurePatientId(patientId) {
    const normalized = String(patientId || "").trim();
    if (!normalized) {
        throw new Error("ID de paciente requerido.");
    }
    return normalized;
}

function ensureNoteId(noteId) {
    const normalized = String(noteId || "").trim();
    if (!normalized) {
        throw new Error("ID de nota requerido.");
    }
    return normalized;
}

function buildAuditMeta(patientId, noteId) {
    return { patientId, noteId };
}


export async function listNotes(patientId, params = {}) {
    if (!patientId) return { items: [], total: 0 };
    
    const cleanParams = {
        page: params.page || 1,
        size: params.size || 50
    };

    const response = await api.get(`/notes/patient/${patientId}`, { 
        params: cleanParams, 
        auth: true 
    });
    
    return response; 
}


export async function createNote(patientId, payload) {
    const response = await api.post(`/notes`, payload, { auth: true });
    await auditService.logAudit("note_create", buildAuditMeta(patientId, response.id));
    return response;
}

export async function getNote(patientId, noteId) {
    const normalizedNoteId = ensureNoteId(noteId);
    const response = await api.get(`/notes/${normalizedNoteId}`, { auth: true });
    await auditService.logAudit("note_view", buildAuditMeta(patientId, noteId));
    return response;
}

export async function closeNote(patientId, noteId) {
    const normalizedPatientId = ensurePatientId(patientId);
    const normalizedNoteId = ensureNoteId(noteId);
    const response = await api.post(`/notes/${normalizedPatientId}/${normalizedNoteId}/close`, {}, { auth: true });
    await auditService.logAudit("note_close", buildAuditMeta(patientId, noteId));
    return response;
}

export async function updateNote(patientId, noteId, payload) {
    const normalizedNoteId = ensureNoteId(noteId);
    const response = await api.put(`/notes/${normalizedNoteId}`, payload, { auth: true });
    await auditService.logAudit("note_update", buildAuditMeta(patientId, noteId));
    return response;
}

export async function signNote(patientId, noteId) {
    const normalizedPatientId = ensurePatientId(patientId);
    const normalizedNoteId = ensureNoteId(noteId);
    const response = await api.post(`/notes/${normalizedPatientId}/${normalizedNoteId}/sign`, {}, { auth: true });
    await auditService.logAudit("note_sign", buildAuditMeta(patientId, noteId));
    return response;
}

export async function addAddendum(patientId, noteId, text) {
    const normalizedPatientId = ensurePatientId(patientId);
    const normalizedNoteId = ensureNoteId(noteId);
    const response = await api.post(`/notes/${normalizedPatientId}/${normalizedNoteId}/addendum`, { text }, { auth: true });
    await auditService.logAudit("note_addendum", buildAuditMeta(patientId, noteId));
    return response;
}

export default {
    listNotes,
    createNote,
    getNote,
    updateNote,
    closeNote,
    signNote,
    addAddendum,
};