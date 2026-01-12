const STORAGE_KEY = "brevemente.rateLimiter";
const DEFAULT_OPTIONS = {
  max: 5,
  windowMs: 600_000,
  coolDownMs: 120_000,
};

const memory = new Map();
let hydrated = false;

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function hydrate() {
  if (hydrated || !isBrowser()) {
    hydrated = true;
    return;
  }
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }
    const stored = JSON.parse(raw);
    Object.entries(stored).forEach(([key, value]) => {
      const attempts = Array.isArray(value?.attempts)
        ? value.attempts.filter((attempt) => typeof attempt === "number")
        : [];
      const blockedUntil = typeof value?.blockedUntil === "number" ? value.blockedUntil : 0;
      memory.set(key, { attempts, blockedUntil });
    });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("[rateLimiter] No se pudo hidratar el estado", error);
    }
    memory.clear();
  }
}

function persist() {
  if (!isBrowser()) {
    return;
  }
  const payload = {};
  memory.forEach((record, key) => {
    if (!record) {
      return;
    }
    const { attempts = [], blockedUntil = 0 } = record;
    if (!attempts.length && blockedUntil <= Date.now()) {
      return;
    }
    payload[key] = {
      attempts,
      blockedUntil,
    };
  });
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function getRecord(key) {
  hydrate();
  if (!memory.has(key)) {
    memory.set(key, { attempts: [], blockedUntil: 0 });
  }
  return memory.get(key);
}

function prune(record, now, windowMs) {
  record.attempts = record.attempts.filter((timestamp) => now - timestamp <= windowMs);
  if (record.blockedUntil && record.blockedUntil <= now) {
    record.blockedUntil = 0;
  }
}

export function shouldBlock(key, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const record = getRecord(key);
  const now = Date.now();

  prune(record, now, opts.windowMs);

  if (record.blockedUntil && record.blockedUntil > now) {
    return { blocked: true, remainingMs: record.blockedUntil - now };
  }

  if (record.attempts.length >= opts.max) {
    record.blockedUntil = now + opts.coolDownMs;
    persist();
    return { blocked: true, remainingMs: record.blockedUntil - now };
  }

  persist();
  return { blocked: false, remainingMs: 0 };
}

export function registerFail(key, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const record = getRecord(key);
  const now = Date.now();

  prune(record, now, opts.windowMs);

  if (record.blockedUntil && record.blockedUntil > now) {
    persist();
    return { blocked: true, remainingMs: record.blockedUntil - now };
  }

  record.attempts.push(now);

  let blocked = false;
  let remainingMs = 0;

  if (record.attempts.length >= opts.max) {
    record.blockedUntil = now + opts.coolDownMs;
    blocked = true;
    remainingMs = record.blockedUntil - now;
  }

  persist();
  return { blocked, remainingMs };
}

export function reset(key) {
  hydrate();
  memory.delete(key);
  persist();
}

export default {
  shouldBlock,
  registerFail,
  reset,
};
