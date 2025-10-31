import { z } from "zod";

const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

const emailSchema = z
  .string({ required_error: "Correo requerido" })
  .trim()
  .min(1, { message: "Correo requerido" })
  .email({ message: "Correo inválido" });

const passwordSchema = z
  .string({ required_error: "Contraseña requerida" })
  .min(8, { message: "La contraseña debe tener al menos 8 caracteres" })
  .regex(PASSWORD_REGEX, {
    message: "Debe incluir al menos una letra y un número",
  });

export const registerSchema = z.object({
  name: z
    .string({ required_error: "Nombre requerido" })
    .trim()
    .min(2, { message: "El nombre debe tener al menos 2 caracteres" })
    .max(80, { message: "El nombre no debe superar 80 caracteres" }),
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(["ADMIN", "PROFESSIONAL", "ASSISTANT"], {
    message: "Rol inválido",
  }),
  acceptPolicies: z
    .boolean({ required_error: "Debe aceptar las políticas" })
    .refine((value) => value === true, {
      message: "Debe aceptar las políticas",
    }),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string({ required_error: "Contraseña requerida" })
    .min(8, { message: "La contraseña debe tener al menos 8 caracteres" }),
});

export const microsoftSchema = z.object({
  idToken: z
    .string({ required_error: "idToken requerido" })
    .min(10, { message: "idToken inválido" }),
});

export default {
  registerSchema,
  loginSchema,
  microsoftSchema,
};
