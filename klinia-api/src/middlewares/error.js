import { ZodError } from "zod";

export function errorMiddleware(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof ZodError) {
    const issues = err.errors.map((issue) => issue.message).join(", ");
    return res.status(400).json({ message: issues || "Datos inválidos" });
  }

  const status = err.status || err.statusCode || 500;
  const message = err.message || "Error interno del servidor";
  res.status(status).json({ message });
}

export default errorMiddleware;
