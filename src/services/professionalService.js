import { db, persist, uid, delay, nowIso } from "./mocks/db";
import { getUser, setUser } from "./storage";

export async function updateProfile(payload) {
  await delay();
  const user = getUser();
  if (!user) {
    const err = new Error("Sesión no iniciada.");
    err.status = 401;
    throw err;
  }
  if (payload?.newPassword && !payload?.currentPassword) {
    const err = new Error("Se requiere contraseña actual.");
    err.status = 400;
    throw err;
  }
  const store = db();
  const userRecord = store.users.find((u) => u.id === user.id);
  if (!userRecord) {
    const err = new Error("Usuario no encontrado.");
    err.status = 404;
    throw err;
  }
  if (payload?.currentPassword && userRecord.password !== payload.currentPassword) {
    const err = new Error("Contraseña actual incorrecta.");
    err.status = 401;
    throw err;
  }
  const updates = { ...payload };
  if (updates.newPassword) {
    userRecord.password = updates.newPassword;
  }
  delete updates.newPassword;
  delete updates.currentPassword;
  Object.assign(userRecord, updates);
  persist();
  const publicUser = { ...userRecord };
  delete publicUser.password;
  setUser(publicUser);
  return publicUser;
}

export async function listDelegates() {
  await delay();
  const store = db();
  const user = getUser();
  return store.delegates.filter((d) => !user || d.professionalId === user.id);
}

export async function createDelegate(email, password, name) {
  await delay();
  const store = db();
  const user = getUser();
  const trimmed = String(email || "").trim();
  const fallbackName = trimmed.includes("@") ? trimmed.split("@")[0] : trimmed;
  const delegate = {
    id: uid("del"),
    professionalId: user?.id || "prof_demo_1",
    email: trimmed,
    name: name || fallbackName,
    createdAt: nowIso(),
  };
  store.delegates.push(delegate);
  store.users.push({
    id: delegate.id,
    email: trimmed,
    password,
    name: delegate.name,
    firstName: delegate.name,
    lastName: "",
    role: "ASSISTANT",
    professionalId: delegate.professionalId,
    verified: true,
  });
  persist();
  return delegate;
}

export async function deleteDelegate(delegateId) {
  await delay();
  const store = db();
  store.delegates = store.delegates.filter((d) => d.id !== delegateId);
  store.users = store.users.filter((u) => u.id !== delegateId);
  persist();
  return true;
}

export async function listAuditLog() {
  await delay();
  const store = db();
  const user = getUser();
  return store.auditLog.filter((a) => !user || a.userId === user.id);
}

export async function countDelegates() {
  await delay(60);
  const list = await listDelegates();
  return list.length;
}

export default {
  updateProfile,
  listDelegates,
  createDelegate,
  deleteDelegate,
  listAuditLog,
  countDelegates,
};
