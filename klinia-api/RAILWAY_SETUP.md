# Configuración de Railway para Klinia API

## Pasos para desplegar en Railway

### 1. Configuración del Proyecto

En Railway, cuando crees el servicio:

**Root Directory:**

- Debe ser: `klinia-api`
- Railway necesita saber que el proyecto está en esta carpeta, no en la raíz

**Start Command:**

- `npm start` (ya está configurado en package.json)

**Port:**

- Deja que Railway asigne el puerto automáticamente
- El código ya usa `process.env.PORT` que Railway inyecta

### 2. Variables de Entorno Requeridas

Configura estas variables en Railway → Variables:

#### **OBLIGATORIAS:**

```bash
# Base de datos (PostgreSQL)
DATABASE_URL=postgresql://usuario:password@host:puerto/database?sslmode=require

# JWT para autenticación
JWT_SECRET=tu-secreto-jwt-super-seguro-aqui

# CORS - URL de tu frontend en Vercel
ALLOW_ORIGIN=https://tu-app.vercel.app
# O si tienes múltiples orígenes:
# ALLOW_ORIGIN=https://tu-app.vercel.app,https://www.tu-dominio.com
```

#### **OPCIONALES (pero recomendadas):**

```bash
# Puerto (Railway lo asigna automáticamente, pero puedes forzarlo)
PORT=4000

# Rate limiting
AUTH_MAX_ATTEMPTS=5
AUTH_WINDOW_MS=600000
AUTH_COOLDOWN_MS=120000

# Delays simulados (solo para desarrollo)
MIN_DELAY_MS=150
MAX_DELAY_MS=350
```

#### **Azure (si usas servicios de Azure):**

```bash
AZURE_DOCINTEL_ENDPOINT=https://tu-endpoint.cognitiveservices.azure.com/
AZURE_DOCINTEL_KEY=tu-key
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...
AZURE_STORAGE_CONTAINER_NAME=tu-container
AZURE_FACE_ENDPOINT=https://tu-face-endpoint.cognitiveservices.azure.com/
AZURE_FACE_KEY=tu-key
```

#### **Twilio (si usas verificación por SMS):**

```bash
TWILIO_ACCOUNT_SID=tu-account-sid
TWILIO_AUTH_TOKEN=tu-auth-token
TWILIO_VERIFY_SERVICE_SID=tu-service-sid
```

### 3. Base de Datos

Railway puede crear una base de datos PostgreSQL automáticamente:

1. En tu proyecto Railway, haz clic en "+ New"
2. Selecciona "Database" → "Add PostgreSQL"
3. Railway creará la base de datos y te dará la variable `DATABASE_URL`
4. Conecta esta variable a tu servicio de API

### 4. Migraciones de Prisma

Después del primer despliegue, ejecuta las migraciones:

**Opción A: Desde Railway CLI**

```bash
railway run --service tu-servicio-api npx prisma migrate deploy
```

**Opción B: Desde Railway Dashboard**

- Ve a tu servicio → "Deployments" → "Shell"
- Ejecuta: `npx prisma migrate deploy`

### 5. Networking

En la configuración de Networking:

- **Port:** Deja vacío o usa `$PORT` (Railway lo asigna automáticamente)
- Railway generará un dominio como: `tu-proyecto.up.railway.app`

### 6. Verificación

Después del despliegue:

1. Verifica los logs en Railway para asegurarte de que el servidor inició
2. Prueba el endpoint de health: `https://tu-dominio.up.railway.app/api/health`
3. Si ves errores 502, revisa:
   - Que `DATABASE_URL` esté configurada
   - Que `JWT_SECRET` esté configurada
   - Que el Root Directory sea `klinia-api`
   - Los logs de Railway para ver errores específicos

### 7. Actualizar Frontend

En Vercel, actualiza la variable de entorno:

```
VITE_API_BASE_URL=https://tu-dominio.up.railway.app/api
```

## Solución de Problemas

### Error 502 Bad Gateway

- Verifica que todas las variables obligatorias estén configuradas
- Revisa los logs en Railway para ver errores de inicio
- Asegúrate de que el Root Directory sea `klinia-api`

### Error de conexión a base de datos

- Verifica que `DATABASE_URL` esté correcta
- Asegúrate de que la base de datos esté activa en Railway
- Ejecuta las migraciones: `npx prisma migrate deploy`

### CORS errors

- Verifica que `ALLOW_ORIGIN` tenga la URL correcta de tu frontend
- Asegúrate de que no tenga trailing slash
