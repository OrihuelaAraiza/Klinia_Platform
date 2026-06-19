# BreveMente · Frontend (snapshot original)

SPA construida con **React 19 + Vite 7** para **BreveMente**, plataforma clínica de salud mental basada en **Terapia Breve Estratégica (TBE)** con copiloto de IA (Brifi).

> **Este repositorio preserva el snapshot original de BreveMente.** La rama `main` está fijada al commit `826aa146bbacedc2e901378467877db2f839ef81` (9-mar-2026, "Merge branch 'main' into David-features") — el último estado del Front en el que los services llamaban al backend real con `apiClient` (18 services, cero mocks).

---

## ¿Por qué este snapshot?

El commit posterior `d2f8f15` ("breve hardco demo", 11-may-2026) reemplazó los services reales por una capa de mocks (`src/services/mocks/db.js`) para una demo navegable sin backend. Inmediatamente después llegó el rename a **romimente** (`4225013`, 12-may-2026) y la marca BreveMente se diluyó.

`826aa14` es la **última pieza identificable como "BreveMente puro"**: arquitectura cliente-servidor real, branding original, paleta y logos pre-romimente.

| Estado del repo | Descripción |
|---|---|
| **`main` actual** (`826aa14`) | BreveMente original — referencia para auditoría documental V4.0 |
| **Rama `brevemente`** | Misma referencia que `main`, conservada como nombre semántico |
| **Branches `David-features`, `feature/*`, `Jp`, `backIA`, `zaid_pruba`** | Trabajo histórico de equipo — sin truncar |
| **Repositorio paralelo `DavidMo55/Romimente_Platform`** | Preservación íntegra del estado pre-truncación con los 13 commits posteriores a `826aa14` (rename a romimente, conexión a nueva API klinia, etc.) |

---

## Pareja con el backend

| Componente | Repo | Commit / rama |
|---|---|---|
| Frontend (este) | `OrihuelaAraiza/Klinia_Platform` | `main` @ `826aa14` |
| Backend | [`DavidMo55/tbe-api`](https://github.com/DavidMo55/tbe-api) | `main` @ `2f05ef7` *(api viva)* |

Smoke test pareja end-to-end con `psicologa@demo.com` / `demo1234`: **18/25 endpoints del flujo PROFESSIONAL responden 200 (~72%)**. Los faltantes corresponden a módulos añadidos en versiones posteriores del backend (directory, appointment-requests, linkage-requests, documents, symptom-assessments, histories/patient).

---

## Stack

| Capa | Tecnología |
|---|---|
| Framework | React 19 + React Compiler |
| Bundler | Vite 7 |
| Ruteo | React Router v7 con `ProtectedRoute` por rol |
| Animaciones | Framer Motion |
| SSO | MSAL Browser (Microsoft) |
| Validación | Zod |
| PDFs | pdf-lib |
| HTTP | `services/apiClient.js` (fetch + interceptores auth/refresh) |
| Estilos | CSS Modules + tokens globales |

---

## Levantar en local

```bash
git clone https://github.com/OrihuelaAraiza/Klinia_Platform.git brevemente-front
cd brevemente-front
cp .env.example .env
npm install
npm run dev           # http://localhost:5173 (puerto default de Vite)
```

> Si trabajas en paralelo con el clone `DavidMo55/Brevemente_Front`, ajusta el puerto del Vite proxy a `:5175` para evitar choque con el front Tanato (si aplica).

El proxy de Vite enruta `/api → http://127.0.0.1:4002` (ver `vite.config.js`). El backend que sirve esto es `DavidMo55/tbe-api` ejecutado localmente en `:4002`.

---

## Variables clave (`.env`)

| Variable | Para qué |
|---|---|
| `VITE_API_BASE_URL` | `/api` (dev, proxied) o FQDN absoluto (prod) |
| `VITE_MSAL_CLIENT_ID` + `VITE_MSAL_TENANT_ID` | Microsoft SSO (opcional) |
| `VITE_MSAL_REDIRECT_URI` | Redirect post-login |

---

## Estructura del proyecto

```
src/
├─ App.jsx                 # Provider stack: Theme + Toast + ErrorBoundary + Routes
├─ routes/
│  └─ AppRoutes.jsx        # ~30 rutas con ProtectedRoute por rol
├─ pages/                  # Login, Register, Dashboard, Patients, Sessions, Notes, Reports, Patient portal
├─ components/
│  ├─ UI/                  # Componentes reutilizables (botones, inputs, toasts, modales)
│  ├─ Brand/Logo.jsx       # Logo dinámico BreveMente (horizontal / vertical / on-blue)
│  ├─ patient/             # Card detail, attachments, consents drawer
│  ├─ session/             # Editor de sesión, lista longitudinal
│  └─ note/                # Editor SOAP, addendum, firma
├─ services/
│  ├─ apiClient.js         # Fetch + JWT refresh + manejo de 401
│  ├─ authService.js       # login, register, recover, 2FA
│  ├─ patientsService.js
│  ├─ sessionsService.js
│  ├─ notesService.js
│  ├─ prescriptionsService.js
│  ├─ ordersService.js
│  ├─ reportsService.js
│  ├─ historyService.js
│  ├─ clinicalHistoryService.js
│  ├─ professionalService.js
│  ├─ dashboardService.js
│  ├─ consentsService.js
│  ├─ supervisionService.js
│  ├─ uploadService.js
│  ├─ faceService.js
│  ├─ verificationService.js
│  ├─ msal.js
│  ├─ storage.js
│  ├─ rateLimiter.js
│  └─ auditService.js
├─ assets/brand/           # Logos BreveMente (horizontal, vertical, on-blue)
├─ styles/                 # global.css, theme.css, doodle-app.css (paleta original)
└─ utils/                  # validators (Zod), constants, etc.
```

---

## Funcionalidades del snapshot

✅ **Implementado y operativo contra el backend `2f05ef7`**:
- Login email/password + MSAL (Microsoft SSO)
- Dashboard del profesional: stats, sesiones de hoy, notas y recetas recientes, historias incompletas
- Pacientes: listado, búsqueda, detalle, attachments, consents, historia clínica
- Sesiones: calendario, lista longitudinal, crear / editar, estados, ICS export
- Notas: editor SOAP, firma, cierre, addendum
- Recetas, órdenes, reportes
- Portal del paciente: perfil, mis terapeutas, mis recetas (con bug conocido en el middleware del backend — ver Riesgos)
- Roles: ADMIN / PROFESSIONAL / ASSISTANT / PATIENT con `ProtectedRoute`

❌ **No implementado** (pendientes del plan V4.0 BreveMente):
- Módulo TBE completo (DX.OP, PX, F1/F2, OSS, ADD, RSS, EFF, RST longitudinal)
- Brifi (grabación de audio + transcript + autollenado de IA)
- Biblioteca de protocolos TBE indexada
- Clinimetría (Valoración del Cambio, Valoración Global)
- Flag de riesgo clínico visible en Dashboard
- MFA obligatorio para profesionales (login solo password)
- Sello digital / QR en documentos exportados

Cobertura cuantitativa contra el plan V4.0: **13% completo + 21% parcial + 66% ausente** (de 68 requisitos funcionales).

---

## Demo

Cuentas con `password: demo1234` (cargadas en el backend tbe-api):

| Email | Rol | Nombre |
|---|---|---|
| `psicologa@demo.com` | PROFESSIONAL | Lic. Julia Vargas |
| `admin@demo.com` | ADMIN | Carlos Mendoza |
| `asistente@demo.com` | ASSISTANT | Daniela Ortiz |
| `paciente@demo.com` | PATIENT | Sofía Mendoza |
| `paciente2@demo.com` | PATIENT | Daniel Herrera |

---

## Riesgos conocidos

- ⚠️ **Patient Portal**: el backend tiene un bug en el middleware de auth (`req.user = null` se filtra al handler por el manejo de la extensión soft-delete). Pacientes ven "Error interno" al entrar al portal. Fix pendiente del lado backend.
- ⚠️ **Tema**: el selector solo ofrece claro/oscuro; falta opción "Sistema" (RNF de UX del plan).
- ⚠️ **Sin tests**: no hay test runner configurado en este snapshot. Verificación manual / smoke con `curl`.
- ⚠️ **Mutaciones optimistas sin reconciliación clara** ante 4xx/5xx — el usuario puede ver un cambio aplicado y luego revertido sin mensaje claro.
- ⚠️ **Componentes grandes**: `Login.jsx`, `Register.jsx`, `CardDetailModal` rondan 300-500 líneas — refactor pendiente para mantenibilidad.

---

## Despliegue

Configuración Vercel incluida (`vercel.json`). Histórico de producción: cliente apuntaba a `https://klinia-api-gmdbb0ezfbhybjcw.canadacentral-01.azurewebsites.net/api`.

---

## Historia y branches

| Branch / repo | Significado |
|---|---|
| `main` (este, `826aa14`) | **BreveMente original** — referencia para audit y plan V4.0 |
| `brevemente` | Alias semántico de `main` |
| `David-features` / `feature/*` | Branches de trabajo histórico — sin truncar |
| `DavidMo55/Romimente_Platform` | Repo paralelo con los 13 commits posteriores a `826aa14` (rename a romimente, mocks de demo, conexión a nueva API klinia). Se preserva intacto. |

---

## Documentación relacionada

- Plan documental V4.0 BreveMente — `Copia de Plan de Documentación.docx` (68 RF + 19 RNF, 11-may-2026)
- README del backend pareja: [`DavidMo55/tbe-api`](https://github.com/DavidMo55/tbe-api)
- Análisis de avance vs. plan: secciones 4 y 5 del documento técnico del proyecto

---

## Licencia

Privado · ROMI / BreveMente.
