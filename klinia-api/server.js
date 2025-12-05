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
import prescriptionsRouter from "./src/routes/prescriptions.js";
import uploadsRouter from "./src/routes/uploads.js";
import verifyRouter from "./src/routes/verify.js";
import registerRouter from "./src/routes/register.js";
import { ensureSeedUsers } from "./src/utils/seedUsers.js";

const app = express();

// CORRECCIÓN CLAVE: Usamos process.env.PORT directamente.
// Si process.env.PORT está definido por Azure (ej. 8080), usa 8080.
// Si no, usa el puerto local (env.port).
const PORT = process.env.PORT || env.port;

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

app.use("/api/auth", authRouter);
app.use("/api/auth", registerRouter);
app.use("/api/uploads", uploadsRouter);
app.use("/api/verify", verifyRouter);


// 2. RUTAS DE SERVICIOS CENTRALES (General App)
app.use("/api/sessions", sessionsRouter); // <-- Aquí montamos el router de sesiones directamente
app.use("/api/dashboard", dashboardRouter); // Monta /api/dashboard/...
app.use("/api/prescriptions", prescriptionsRouter); // Monta /api/prescriptions/...


// 3. RUTAS DE PACIENTES (Lista y Detalle)
app.use("/api/patients", patientsRouter); 

// 4. RUTAS PARAMETRIZADAS (Siempre van al final de las listas)
// Estas rutas dependen de un :id
app.use("/api/patients/:id/consents", consentsRouter);
app.use("/api/patients/:id/history", historyRouter);
app.use("/api/patients/:id/notes", notesRouter);
app.use("/api/patients/:id/export", exportRouter);

// 5. RUTAS GENÉRICAS RESTANTES
app.use("/api", apiRouter); 

app.use(errorMiddleware);

let server;

async function bootstrap() {
    try {
        await ensureSeedUsers();
    } catch (error) {
        console.warn("[seed] unable to ensure default users", error);
    }

    // AHORA USAMOS LA CONSTANTE PORT QUE YA TIENE process.env.PORT
    const port = PORT; 
    
    // Escuchar en 0.0.0.0 para aceptar conexiones externas (necesario en la nube)
    const host = '0.0.0.0';
    
    server = app.listen(port, host, () => {
        // En este console.log deberías ver el puerto 8080
        console.log(`Klinia API listening on http://${host}:${port}`); 
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
}
bootstrap();

function gracefulShutdown(signal) {
    console.log(`\n${signal} received. Closing server...`);
    server.close(() => {
        console.log("Server closed. Bye!");
        process.exit(0);
    });
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));