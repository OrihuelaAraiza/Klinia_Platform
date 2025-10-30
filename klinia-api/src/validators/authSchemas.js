import { z } from "zod";

const emailSchema = z.string().email({ message: "Correo inválido" });
const passwordSchema = z
  .string()
  .min(8, { message: "La contraseña debe tener al menos 8 caracteres" });

export const registerSchema = z.object({
  name: z.string().min(1, { message: "El nombre es obligatorio" }),
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(["ADMIN", "PROFESSIONAL", "ASSISTANT"], {
    message: "Rol inválido",
  }),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { message: "La contraseña es obligatoria" }),
});

export const microsoftSchema = z.object({
  idToken: z.string().min(1, { message: "idToken requerido" }),
});

export default {
  registerSchema,
  loginSchema,
  microsoftSchema,
};
