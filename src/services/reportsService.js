import { api } from "./apiClient";
import auditService from "./auditService";
import * as sessionsService from "./sessionsService"; 
import * as prescriptionsService from "./prescriptionsService"; 
import * as historyService from "./historyService"; 

function ensurePatientId(patientId) {
    const normalized = String(patientId || "").trim();
    if (!normalized) {
        throw new Error("Selecciona un paciente válido antes de continuar.");
    }
    return normalized;
}

function ensureId(id) {
    const normalized = String(id || "").trim();
    if (!normalized) {
        throw new Error("Identificador de informe inválido.");
    }
    return normalized;
}

function buildAuditMeta(record = {}) {
    return {
        patientId: record.patientId,
        reportId: record.id,
        folio: record.folio,
    };
}

export async function create(payload) {
    const normalizedPatientId = ensurePatientId(payload?.patientId);
    const response = await api.post(
        "/reports",
        { ...payload, patientId: normalizedPatientId },
        { auth: true }
    );
    await auditService.logAudit("report_create", buildAuditMeta(response));
    return response;
}

export async function listByPatient(patientId) {
    const normalizedPatientId = ensurePatientId(patientId);
    const response = await api.get(`/patients/${normalizedPatientId}/reports`, { auth: true });
    await auditService.logAudit("report_list_patient", { patientId: normalizedPatientId });
    return Array.isArray(response) ? response : [];
}

export async function getOne(id) {
    const normalizedId = ensureId(id);
    const response = await api.get(`/reports/${normalizedId}`, { auth: true });
    await auditService.logAudit("report_view", buildAuditMeta(response));
    return response;
}

export async function update(reportId, patch) {
    const normalizedId = ensureId(reportId);
    const response = await api.put(`/reports/${normalizedId}`, patch, { auth: true });
    await auditService.logAudit("report_update", buildAuditMeta(response));
    return response;
}

export async function lock(reportId) {
    const normalizedId = ensureId(reportId);
    const response = await api.post(`/reports/${normalizedId}/lock`, {}, { auth: true });
    await auditService.logAudit("report_lock", buildAuditMeta(response));
    return response;
}

import { composeRecord } from "../utils/export/composeRecord";
import generateHistoryPdf from "../utils/export/pdf/historyPdf";
import generateNotePdf from "../utils/export/pdf/notePdf";

function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
}


export async function fetchPatientBundle(patientId, overrides = {}) {
    const normalizedPatientId = ensurePatientId(patientId);

    try {
        const response = await api.get(`/patients/${normalizedPatientId}/bundle`, { auth: true });
      
        return {
            patient: response.patientData, 
            history: response.clinicalData.history,
            sessions: response.clinicalData.sessions,
            prescriptions: response.clinicalData.prescriptions,
            notes: response.clinicalData.notes,
            consents: response.clinicalData.consents,
        };
        
    } catch (error) {
        console.error("Error fetching patient bundle:", error);
      
        if (overrides.patient) {
            return {
                patient: overrides.patient,
                history: overrides.history,
                sessions: overrides.sessions || [],
                prescriptions: overrides.prescriptions || [],
                notes: overrides.notes || [], 
                consents: overrides.consents || [], 
            };
        }
        throw new Error("Datos del paciente requeridos para exportar (No se pudieron cargar del backend).");
    }
}


export async function exportPatientRecordJson(patientId, overrides = {}) {
    
    const bundle = await fetchPatientBundle(patientId, overrides);
    
    const { patient, history, sessions, prescriptions, notes, consents } = bundle;

    if (!patient) {
        throw new Error("Datos del paciente requeridos para exportar.");
    }
    
    const exportData = {
        version: "1.0",
        patientData: patient, 
        clinicalData: {
            history: history || null,
            sessions: sessions || [],
            prescriptions: prescriptions || [],
            notes: notes || [],
            consents: consents || [],
        }
    };

    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const filename = `expediente_${patient.curp || patient.id}_${new Date().toISOString().split("T")[0]}.json`;
    

    triggerDownload(blob, filename);
    await auditService.logAudit("export_patient_json", { patientId });
    return blob;
}

export async function exportHistoryPdf(patientId, overrides = {}) {
    const { patient, history, prescriptions = [] } = overrides;
    if (!patient) {
        throw new Error("Datos del paciente requeridos para exportar.");
    }
    if (!history) {
        throw new Error("Historia clínica requerida para exportar.");
    }
    const bundle = await fetchPatientBundle(patientId, overrides);

    const blob = await generateHistoryPdf({ patient: bundle.patient, history: bundle.history, prescriptions: bundle.prescriptions });
    const filename = `historia_${patient.curp || patient.id}_${new Date().toISOString().split("T")[0]}.pdf`;
    triggerDownload(blob, filename);
    await auditService.logAudit("export_history_pdf", { patientId });
    return blob;
}

export async function exportNotePdf(patientId, note, overrides = {}) {
    const { patient } = overrides;
    if (!patient) {
        throw new Error("Datos del paciente requeridos para exportar.");
    }
    if (!note) {
        throw new Error("Nota requerida para exportar.");
    }
    const blob = await generateNotePdf({ patient, note });
    const filename = `nota_${note.id}_${new Date().toISOString().split("T")[0]}.pdf`;
    triggerDownload(blob, filename);
    await auditService.logAudit("export_note_pdf", { patientId, noteId: note.id });
    return blob;
}


export default {
    create,
    listByPatient,
    getOne,
    update,
    lock,
    exportPatientRecordJson,
    exportHistoryPdf,
    exportNotePdf,
    fetchPatientBundle,
};