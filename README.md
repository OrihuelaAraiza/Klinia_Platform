# Klinia Platform (Frontend)

Aplicación SPA construida con React 19 y Vite para la plataforma clínica de **Klinia**.  
El proyecto ofrece autenticación, dashboards administrativos y flujos de operaciones clínicas con un enfoque en accesibilidad, auditoría y diseño responsive para escritorio y dispositivos móviles.

## Stack principal

- React 19 + React Compiler y Vite 7.
- React Router v7 para ruteo declarativo y protección por roles.
- Framer Motion para animaciones de interfaz.
- MSAL Browser para autenticación con Microsoft.
- pdf-lib y utilidades personalizadas para generar/reportar documentos clínicos.
- Zod para validaciones y utilidades comunes (`utils/validators`).
- Estilos globales CSS con breakpoints optimizados para mobile-first.

## Funcionalidades destacadas

- **Autenticación híbrida**: inicio de sesión con correo/contraseña o Microsoft, con bloqueo progresivo (`services/rateLimiter.js`) y trazabilidad mediante `auditService`.
- **Roles y permisos**: `ProtectedRoute` aplica reglas para `ADMIN`, `PROFESSIONAL` y `ASSISTANT`, ajustando el contenido (p.ej. prescripciones solo lectura para asistentes).
- **Gestión clínica**:
  - Listado, búsqueda y edición de pacientes, con formularios modales y validación.
  - Control de consentimientos, archivos adjuntos y sesiones por paciente.
  - Módulos de recetas, reportes y sesiones para seguimiento operativo.
- **Experiencia de usuario**: layout adaptable con sidebar colapsable, topbar accesible, toasts de feedback y componentes reutilizables en `components/UI`.
- **Auditoría centralizada**: todos los eventos críticos (login, pacientes, consentimientos, recetas) disparan logs hacia `auditService`.
- **Entorno listo para expansión**: servicios de API encapsulados en `services/apiClient.js`, lo que facilita cambiar la URL base o añadir nuevos endpoints.

## Estructura del proyecto

```
├── public/                # Assets estáticos publicados tal cual por Vite
├── src/
│   ├── assets/            # Imágenes, data de catálogos (ej: CIE10) y logos
│   ├── components/        # Componentes de UI y contenedores (NavSidebar, Topbar, etc.)
│   ├── pages/             # Vistas principales (Login, Patients, Dashboard, etc.)
│   ├── routes/            # Definición de rutas protegidas (AppRoutes)
│   ├── services/          # API client, MSAL, auditoría, pacientes, sesiones, etc.
│   ├── styles/            # `global.css` con tokens y estilos responsivos
│   └── utils/             # Constantes, validadores y helpers
├── klinia-api/            # Stub de API Express para desarrollo local (opcional)
└── vite.config.js         # Configuración de compilación/front
```

## Requisitos previos

- Node.js **18 LTS** o superior.
- npm 10/11 (incluido con Node 18+).
- Para login corporativo: credenciales de Azure AD y redireccionamiento configurado.

## Configuración de entorno

Crea un archivo `.env.local` o configura tus variables en Vercel con los siguientes valores:

```bash
# API base (requerido en producción/preview)
VITE_API_BASE_URL=https://api.klinia.mx

# MSAL (solo si se desea habilitar Microsoft Login)
VITE_MSAL_CLIENT_ID=<GUID>
VITE_MSAL_TENANT_ID=<TENANT_GUID>          # o bien VITE_MSAL_AUTHORITY=https://login.microsoftonline.com/<TENANT>
VITE_MSAL_REDIRECT_URI=https://app.tu-dominio.com
VITE_MSAL_POST_LOGOUT_REDIRECT_URI=https://app.tu-dominio.com
# Opcionales
VITE_MSAL_CACHE=localStorage               # por defecto usa sessionStorage
VITE_MSAL_SCOPES="openid profile email"

# Observabilidad del despliegue
VITE_APP_VERSION=<commit_sha>
VITE_APP_COMMIT_MESSAGE="mensaje del commit"
VITE_VERCEL_ENV=preview|production         # Vercel lo inyecta automáticamente
```

- **MSAL** se habilita únicamente cuando `VITE_MSAL_CLIENT_ID` y el `tenant/authority` están presentes. En *preview* sin esas variables, el botón de Microsoft no se muestra y no aparece ningún banner.
- `VITE_APP_VERSION` y `VITE_APP_COMMIT_MESSAGE` alimentan el pie de página del layout y la página `/health` para inspeccionar builds desplegados.
- El script de postbuild usa `VERCEL_ENV` para copiar el `robots.txt` correcto (`Allow` en producción, `Disallow` en previews) y se ejecuta automáticamente dentro de `npm run build`.

## Ejecución

Instala dependencias y lanza el entorno de desarrollo:

```bash
npm install
npm run dev
```

La aplicación estará disponible en `http://localhost:5173/`.

### Build para producción

```bash
npm run build
```
Genera los artefactos optimizados en `dist/`, ejecuta el ajuste de `robots.txt` según `VERCEL_ENV` y deja los assets listos para Vercel. Puedes hacer una vista previa con:

```bash
npm run preview
```

### Linting

```bash
npm run lint
```

Aplica las reglas definidas en `eslint.config.js`.

## Backend de referencia (opcional)

El repositorio incluye un stub de API en `klinia-api/` para pruebas locales rápidas:

```bash
cd klinia-api
npm install
npm run dev
```

Por defecto escucha en `http://localhost:4000`. Ajusta `VITE_API_BASE_URL` para apuntar a este servidor o a tu backend real.

### Variables de entorno del API y Neon

1. Copia el archivo de ejemplo: `cp klinia-api/.env.example klinia-api/.env`.
2. Completa los valores reales (Azure, Twilio, JWT, etc.) únicamente en tu `.env` local o en los secretos de la plataforma de despliegue.
3. Para la base de datos usa la cadena que genera Neon en tu proyecto. El formato recomendado ya viene en el ejemplo:

   ```
   postgresql://<usuario>:<password>@<host>/<database>?sslmode=require&channel_binding=require
   ```

   En tu instancia actual bastará con pegar la cadena de conexión que Neon muestra para la base `klinia_db`. No la confirmes en el repositorio: el `.env` se ignora por Git para protegerla.

4. Ejecuta las migraciones apuntando a Neon:

   ```bash
   cd klinia-api
   npx prisma migrate deploy   # o `npx prisma db push` si es un entorno nuevo
   ```

5. En Vercel (o cualquier hosting), crea los mismos nombres de variables (`DATABASE_URL`, `AZURE_*`, `TWILIO_*`, `JWT_SECRET`, etc.) en la sección de Environment Variables. Así la API usará la base de Neon sin exponer la cadena.

## Convenciones y buenas prácticas

- Componentes reutilizables viven en `components/UI` y exponen props consistentes.
- Usa `services/apiClient` para cualquier llamada HTTP; maneja tokens y errores de forma unificada.
- Registra eventos relevantes pasando por `auditService` para mantener el rastro de auditoría.
- Los estilos globales definen tokens (`--brand`, `--bg`, etc.) y breakpoints usados por todos los módulos.
- Las rutas públicas son Login (`/`) y Register (`/register`). Todo lo demás requiere sesión válida y rol autorizado.
- `/health` está disponible sin autenticación y devuelve metadatos de la build para validar cabeceras en Vercel.

## Despliegue en Vercel

- El archivo `vercel.json` aplica **rewrites SPA**, fuerza `cleanUrls`, agrega cabeceras de seguridad (`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`) y define la política de caché (HTML `no-store`, assets versionados cacheados un año).
- El mismo archivo también realiza la canonización de dominio: cualquier visita a `https://klinia.ai` se redirige (308) hacia `https://www.klinia.ai`, asegurando que las cookies y redirects sean consistentes.
- Define las variables de entorno anteriores en **Production** y **Preview**. MSAL debería habilitarse solo cuando apuntes al dominio definitivo; en previews donde falten las envs el botón se oculta automáticamente.
- Recuerda registrar las URLs de redirección (SPA) en Azure Portal para cada dominio público que exponga MSAL (`https://app.tu-dominio.com` y, si aplica, los dominios de staging).
- `robots.prod.txt` / `robots.preview.txt` se copian al paquete final mediante `scripts/postbuild.mjs`, garantizando `Disallow: /` en previews.
- El footer muestra `Build: <VITE_APP_VERSION>` y el último mensaje de commit cuando están disponibles, ayudando a auditar qué versión está desplegada.
- DNS recomendado para Vercel:
  - `A @` → `216.198.79.1` (apex redirigido).
  - `CNAME www` → `5466a987a9d4a9d3.vercel-dns-017.com.` (host principal servido por Vercel).

## Recursos útiles

- [Documentación de Vite](https://vite.dev)
- [React Router](https://reactrouter.com)
- [MSAL.js Browser](https://learn.microsoft.com/azure/active-directory/develop/msal-overview)
- [Framer Motion](https://www.framer.com/motion/)

---

¿Necesitas extender funcionalidades? Revisa los servicios existentes y mantén la auditoría y validaciones coherentes con los módulos actuales. ¡Feliz desarrollo! 💚

