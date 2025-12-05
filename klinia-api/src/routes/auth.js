import { Router } from "express";
import bcrypt from "bcryptjs";
import { ZodError } from "zod";
import { registerSchema, loginSchema, microsoftSchema } from "../validators/authSchemas.js";
import jwt from 'jsonwebtoken'; 
import { prisma } from '../services/dbClient.js'; 
import { env } from '../config/env.js';
import {
  pushAuditEvent,
  uid,
} from "../store/memory.js"; 
import {
  isLocked,
  onLoginFail,
  onLoginSuccess,
} from "../utils/rateLimit.js";

const router = Router();

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function emitAudit(event, meta = {}) {
  pushAuditEvent({
    event,
    meta,
    at: new Date().toISOString(),
  });
}

function decodeBase64Url(value) {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + (4 - (normalized.length % 4)) % 4,
    "="
  );
  try {
    return Buffer.from(padded, "base64").toString("utf8");
  } catch (error) {
    return null;
  }
}

function buildTokenPayload(user) {
  return {
    sub: user.id,
    email: user.email,
    role: user.role,
  };
}

function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

function decodeMicrosoftProfile(idToken) {
  if (typeof idToken !== "string") {
    return { email: null, name: null };
  }
  const parts = idToken.split(".");
  if (parts.length < 2) {
    return { email: null, name: null };
  }

  try {
    const decoded = decodeBase64Url(parts[1]);
    if (!decoded) {
      return { email: null, name: null };
    }
    const payload = JSON.parse(decoded);
    const candidate =
      payload.email || payload.preferred_username || payload.upn || payload.unique_name;
    const nameCandidate =
      payload.name ||
      [payload.given_name, payload.family_name].filter(Boolean).join(" ") ||
      payload.preferred_username;

    const email =
      candidate && typeof candidate === "string" ? candidate.toLowerCase() : null;
    const name =
      nameCandidate && typeof nameCandidate === "string"
        ? nameCandidate
        : "Usuario Microsoft";

    return { email, name };
  } catch (error) {
    // Fallback below.
  }

  return { email: null, name: null };
}

function extractEmailFromAuthHeader(header) {
  if (typeof header !== "string") {
    return null;
  }
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return null;
  }
  const decoded = decodeBase64Url(token);
  if (!decoded) {
    return null;
  }
  try {
    const payload = JSON.parse(decoded);
    if (payload?.email) {
      return normalizeEmail(payload.email);
    }
  } catch (error) {
    // Ignore parse issues.
  }
  return null;
}

router.post("/register", async (req, res, next) => {
  let emailForAudit = normalizeEmail(req.body?.email);
  try {
    const payload = registerSchema.parse(req.body);
    const email = normalizeEmail(payload.email);
    emailForAudit = email;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      emitAudit("auth_register_failed", { email, reason: "duplicate" });
      return res.status(409).json({ message: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(payload.password, 8);
    const userRecord = {
      id: uid("U_"),
      name: payload.name.trim(),
      email,
      role: payload.role,
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    const createdUser = await prisma.user.create({ data: userRecord });

    const token = jwt.sign(
      buildTokenPayload(createdUser), 
      env.JWT_SECRET, 
      { expiresIn: '1d' }
    );

    emitAudit("auth_register_success", {
      email,
      role: createdUser.role, 
    });

    return res.status(201).json({
      token,
      user: toPublicUser(createdUser), 
    });
  } catch (error) {
    emitAudit("auth_register_failed", {
      email: emailForAudit,
      reason: "validation_error",
    });
    return next(error);
  }
});

router.post("/login", async (req, res, next) => {
  let emailForAudit = normalizeEmail(req.body?.email);
  try {
    const payload = loginSchema.parse(req.body);
    const email = normalizeEmail(payload.email);
    emailForAudit = email;

    const lockState = isLocked(email, req.ip);
    if (lockState.locked) {
      const seconds = Math.ceil(lockState.ms / 1000);
      emitAudit("auth_login_failed", {
        method: "password",
        email,
        reason: "locked",
      });
      return res.status(429).json({
        message: `Demasiados intentos. Intenta de nuevo en ${seconds} segundos.`,
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: email }
    });

  if (!user || !user.passwordHash) {
      onLoginFail(email, req.ip);
      emitAudit("auth_login_failed", {
        method: "password",
        email,
        reason: "not_found",
      });
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    console.log('[AUTH DEBUG] Client Password:', payload.password);
    console.log('[AUTH DEBUG] DB Hash (truncated):', user.passwordHash.slice(0, 30) + '...');

   const isMatch = await bcrypt.compare(payload.password, user.passwordHash);
    if (!isMatch) {
      onLoginFail(email, req.ip);
      emitAudit("auth_login_failed", {
        method: "password",
        email,
        reason: "invalid_password",
      });
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    onLoginSuccess(email, req.ip);

    const token = jwt.sign(
      buildTokenPayload(user), 
      env.JWT_SECRET, 
      { expiresIn: '1d' } 
    );

    emitAudit("auth_login_success", {
      method: "password",
      email,
    });

   return res.json({
      token,
      user: toPublicUser(user),
    });
  } catch (error) {
    emitAudit("auth_login_failed", {
      method: "password",
      email: emailForAudit,
      reason: "validation_error",
    });
    return next(error);
  }
});

// --- RUTA /microsoft (UNIFICADA Y CORREGIDA) ---
router.post("/microsoft", async (req, res, next) => {
  try {
    // 0. Validar token crudo
    const rawToken = req.body?.idToken;
    if (!rawToken || typeof rawToken !== "string") {
      emitAudit("auth_login_failed", {
        method: "microsoft",
        reason: "invalid_token",
      });
      return res.status(400).json({ message: "Invalid Microsoft token" });
    }

    // 1. Decodificar el token con Zod
    const payload = microsoftSchema.parse({ idToken: rawToken });
    const profile = decodeMicrosoftProfile(payload.idToken);
    const email = normalizeEmail(profile.email);

    if (!email) {
      emitAudit("auth_login_failed", { method: "microsoft", reason: "no_email" });
      return res.status(400).json({ message: "No se pudo obtener el email de Microsoft." });
    }

    // 2. Buscar usuario en Prisma
    let user = await prisma.user.findUnique({
      where: { email }
    });

    // 3. Bifurcación: usuario EXISTE o es nuevo
    if (user) {
      // --- A. LOGIN DEL USUARIO ---

      // Evitar login por Microsoft si fue cuenta email/password
      if (user.passwordHash) {
        console.warn(`Intento de login MSAL a cuenta de email/pass: ${email}`);
        emitAudit("auth_login_failed", {
          method: "microsoft",
          email,
          reason: "password_account_exists"
        });
        return res.status(403).json({
          message: "Esta cuenta debe iniciar sesión con contraseña."
        });
      }

      console.log(`Login de Microsoft exitoso para: ${email}`);
      
      const token = jwt.sign(
        buildTokenPayload(user),
        env.JWT_SECRET,
        { expiresIn: "1d" }
      );

      emitAudit("auth_login_success", { method: "microsoft", email });

      return res.json({
        status: "LOGIN_SUCCESS",
        token,
        user: toPublicUser(user),
      });
    }

    // --- B. USUARIO ES NUEVO → REGISTRO REQUERIDO ---
    console.log(`Usuario nuevo Microsoft: ${email}. Requiere registro.`);

    // Crear token parcial de 15 minutos
    const partialTokenPayload = {
      email,
      name: profile.name || "Usuario Microsoft",
      msal: true
    };

    const partialToken = jwt.sign(
      partialTokenPayload,
      env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    emitAudit("auth_register_partial", {
      method: "microsoft",
      email,
    });

    return res.json({
      status: "REGISTRATION_REQUIRED",
      partialToken,
    });

  } catch (error) {

    if (error instanceof ZodError) {
      emitAudit("auth_login_failed", {
        method: "microsoft",
        reason: "invalid_token_format",
      });
      return res.status(400).json({ message: "Invalid Microsoft token" });
    }

    emitAudit("auth_login_failed", {
      method: "microsoft",
      email: normalizeEmail(req.body?.email),
      reason: "validation_error",
    });

    return next(error);
  }
});


router.post("/logout", (req, res) => {
  let email = normalizeEmail(req.body?.email);
  if (!email) {
    email = extractEmailFromAuthHeader(req.headers.authorization) || "";
  }
  emitAudit("auth_logout", { email });
  return res.json({ ok: true });
});

export default router;
