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

Crea un archivo `.env.local` en la raíz del proyecto con las variables necesarias:

```bash
# URL base del API (opcional; por defecto usa /api)
VITE_API_BASE_URL=http://localhost:4000

# Autenticación Microsoft (obligatorio para habilitar MSAL)
VITE_MSAL_CLIENT_ID=<tu_client_id>

# Usa cualquiera de las dos opciones siguientes
VITE_MSAL_TENANT_ID=<tenant_id>            # Ej. 'organizations' o GUID
# o
VITE_MSAL_AUTHORITY=https://login.microsoftonline.com/<tenant_id>

# Opcional: redirección personalizada tras login MSAL
VITE_MSAL_REDIRECT_URI=http://localhost:5173/
```

> Si `VITE_MSAL_CLIENT_ID` o el tenant no están configurados, la UI mostrará mensajes de ayuda en el flujo Microsoft y los eventos quedarán deshabilitados.

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

Genera los artefactos optimizados en `dist/`. Puedes hacer una vista previa con:

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

## Convenciones y buenas prácticas

- Componentes reutilizables viven en `components/UI` y exponen props consistentes.
- Usa `services/apiClient` para cualquier llamada HTTP; maneja tokens y errores de forma unificada.
- Registra eventos relevantes pasando por `auditService` para mantener el rastro de auditoría.
- Los estilos globales definen tokens (`--brand`, `--bg`, etc.) y breakpoints usados por todos los módulos.
- Las rutas públicas son Login (`/`) y Register (`/register`). Todo lo demás requiere sesión válida y rol autorizado.

## Recursos útiles

- [Documentación de Vite](https://vite.dev)
- [React Router](https://reactrouter.com)
- [MSAL.js Browser](https://learn.microsoft.com/azure/active-directory/develop/msal-overview)
- [Framer Motion](https://www.framer.com/motion/)

---

¿Necesitas extender funcionalidades? Revisa los servicios existentes y mantén la auditoría y validaciones coherentes con los módulos actuales. ¡Feliz desarrollo! 💚

