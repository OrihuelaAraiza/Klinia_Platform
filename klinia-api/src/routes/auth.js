import { Router } from "express";
import {
  registerSchema,
  loginSchema,
  microsoftSchema,
} from "../validators/authSchemas.js";
import { hasUser, getUserByEmail, saveUser } from "../store/memory.js";
import { makeFakeJwt } from "../utils/token.js";

const router = Router();

router.post("/auth/register", (req, res, next) => {
  try {
    const payload = registerSchema.parse(req.body);
    const email = payload.email.trim().toLowerCase();
    const name = payload.name.trim();

    if (!name) {
      return res.status(400).json({ message: "El nombre es obligatorio" });
    }

    if (hasUser(email)) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const user = {
      name,
      email,
      role: payload.role,
    };

    saveUser(user, payload.password);
    const token = makeFakeJwt({ email: user.email, role: user.role });

    res.status(201).json({ token, user });
  } catch (error) {
    next(error);
  }
});

router.post("/auth/login", (req, res, next) => {
  try {
    const payload = loginSchema.parse(req.body);
    const email = payload.email.trim().toLowerCase();
    const stored = getUserByEmail(email);

    if (!stored || stored.password !== payload.password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = {
      name: stored.name,
      email: stored.email,
      role: stored.role,
    };

    const token = makeFakeJwt({ email: user.email, role: user.role });
    res.json({ token, user });
  } catch (error) {
    next(error);
  }
});

router.post("/auth/microsoft", (req, res, next) => {
  try {
    const { idToken } = microsoftSchema.parse(req.body);

    const syntheticEmail = `${Buffer.from(idToken).toString("base64url").slice(0, 12)}@msal.demo`;
    const email = syntheticEmail.toLowerCase();
    const user = {
      name: "Microsoft User",
      email,
      role: "PROFESSIONAL",
    };

    saveUser(user, "microsoft-login");

    const token = makeFakeJwt({ email: user.email, role: user.role });
    res.json({ token, user });
  } catch (error) {
    next(error);
  }
});

router.post("/auth/logout", (req, res) => {
  res.json({ ok: true });
});

export default router;
