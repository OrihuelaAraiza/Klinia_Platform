import { api } from "./apiClient";

export async function listSupervisionLogs() {
  return api.get("/supervision").catch(() => []);
}

export async function getSupervisionLog(id) {
  return api.get(`/supervision/${id}`);
}

export async function createSupervisionLog(payload) {
  return api.post("/supervision", payload);
}

export async function deleteSupervisionLog(id) {
  return api.delete(`/supervision/${id}`);
}

export default {
  listSupervisionLogs,
  getSupervisionLog,
  createSupervisionLog,
  deleteSupervisionLog,
};
