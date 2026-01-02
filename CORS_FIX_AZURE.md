# Fix para Errores de CORS en Azure

## Problema
El backend en Azure está bloqueando requests desde `https://romiai.info` porque no está en la lista de orígenes permitidos (CORS).

## Solución: Configurar CORS en Azure App Service

### Opción 1: Desde Azure Portal (Más Fácil)

1. Ve a **Azure Portal**: https://portal.azure.com
2. Busca tu App Service: **klinia-api**
3. En el menú izquierdo, ve a **API** → **CORS**
4. En **Allowed Origins**, agrega:
   - `https://romiai.info`
   - `https://www.romiai.info` (si también lo usas)
   - Para desarrollo local (opcional): `http://localhost:5173`
5. **IMPORTANTE**: Si ya hay otros orígenes, asegúrate de agregar el nuevo en una nueva línea
6. Marca **Enable Access-Control-Allow-Credentials** si necesitas enviar cookies/tokens
7. Haz clic en **Save**

### Opción 2: Usando Azure CLI

```bash
az login
az webapp cors add --resource-group <TU-RESOURCE-GROUP> \
  --name klinia-api \
  --allowed-origins https://romiai.info https://www.romiai.info
```

### Opción 3: Configurar en Variables de Entorno (RECOMENDADO)

Tu backend lee `ALLOW_ORIGIN` desde variables de entorno y ahora soporta múltiples orígenes:

1. En Azure Portal → **klinia-api** → **Configuration** → **Application settings**
2. Busca o crea la variable: `ALLOW_ORIGIN`
3. Valor: `https://romiai.info,https://www.romiai.info,http://localhost:5173`
   - Puedes separar múltiples orígenes con comas
   - Incluye tu dominio de producción
   - Incluye localhost si haces desarrollo local
   - Puedes agregar dominios de preview de Vercel si los necesitas
4. Haz clic en **Save** y reinicia la app (esto es importante)

### Verificar la Configuración

Después de configurar, verifica que funcione:

1. En el navegador, abre la consola (F12)
2. Intenta cargar la página de pacientes
3. Los errores de CORS deberían desaparecer

### Orígenes que Debes Agregar

- **Producción**: `https://romiai.info`
- **Preview/Staging** (si aplica): Tu dominio de preview de Vercel (ej: `https://tu-proyecto-git-branch.vercel.app`)
- **Desarrollo local** (opcional): `http://localhost:5173`

### Nota Importante

Si usas múltiples dominios (incluyendo previews de Vercel), puedes usar wildcards o agregar cada uno individualmente. Azure App Service CORS no soporta wildcards directamente, así que debes agregar cada dominio.

### Verificar CORS Actual

Para ver qué orígenes están configurados actualmente:

```bash
az webapp cors show --resource-group <TU-RESOURCE-GROUP> --name klinia-api
```

