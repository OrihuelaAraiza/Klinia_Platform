import express from "express";
import cors from "cors";
import morgan from "morgan";
import env from "./src/config/env.js";
import delayMiddleware from "./src/middlewares/delay.js";
import errorMiddleware from "./src/middlewares/error.js";
import healthRouter from "./src/routes/health.js";
import authRouter from "./src/routes/auth.js";
import auditRouter from "./src/routes/audit.js";
import patientsRouter from "./src/routes/patients.js";
import consentsRouter from "./src/routes/consents.js";
import historyRouter from "./src/routes/history.js";
import notesRouter from "./src/routes/notes.js";
import exportRouter from "./src/routes/export.js";
import sessionsRouter from "./src/routes/sessions.js";
import dashboardRouter from "./src/routes/dashboard.js";
import uploadsRouter from "./src/routes/uploads.js";
import verifyRouter from "./src/routes/verify.js";
import registerRouter from "./src/routes/register.js";

const app = express();

app.use(
  cors({
    origin: env.allowOrigin,
    credentials: true,
  })
);
app.use(express.json());
app.use(delayMiddleware);
app.use(morgan("dev"));

const apiRouter = express.Router();
apiRouter.use(healthRouter);
apiRouter.use(auditRouter);
apiRouter.use("/patients", patientsRouter);

app.use("/api/auth", authRouter);
app.use("/api/auth", registerRouter);
app.use("/api/uploads", uploadsRouter);
app.use("/api/verify", verifyRouter);
app.use("/api", apiRouter);
app.use("/api/patients/:id/consents", consentsRouter);
app.use("/api/patients/:id/history", historyRouter);
app.use("/api/patients/:id/notes", notesRouter);
app.use("/api/patients/:id/export", exportRouter);
app.use("/api", dashboardRouter);
app.use("/api", sessionsRouter);
app.use(errorMiddleware);

const server = app.listen(env.port, () => {
  console.log(`Mock Klinia API listening on http://localhost:${env.port}`);
});

function gracefulShutdown(signal) {
  console.log(`\n${signal} received. Closing server...`);
  server.close(() => {
    console.log("Server closed. Bye!");
    process.exit(0);
  });
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
