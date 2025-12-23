# Configuración de Vercel para Klinia Platform

Este documento explica cómo configurar el despliegue completo de Klinia Platform en Vercel, conectando el frontend con el backend de Azure.

## 📋 Requisitos Previos

- Cuenta de Vercel
- Repositorio de Git conectado (GitHub, GitLab, o Bitbucket)
- Backend desplegado en Azure (ya configurado)

## 🚀 Pasos para Desplegar

### 1. Conectar el Repositorio a Vercel

1. Ve a [vercel.com](https://vercel.com) e inicia sesión
2. Haz clic en **"Add New Project"**
3. Importa tu repositorio de Git
4. Vercel detectará automáticamente que es un proyecto Vite

### 2. Configurar Variables de Entorno

**IMPORTANTE**: Debes configurar estas variables de entorno en Vercel para que el frontend se conecte al backend de Azure.

#### En el Dashboard de Vercel:

1. Ve a tu proyecto en Vercel
2. Ve a **Settings** → **Environment Variables**
3. Agrega las siguientes variables:

| Variable | Valor | Entornos |
|----------|-------|----------|
| `VITE_API_BASE_URL` | `https://klinia-api-gmdbb0ezfbhybjcw.canadacentral-01.azurewebsites.net/api` | Production, Preview, Development |

**Nota**: Puedes configurar diferentes valores para cada entorno si tienes diferentes backends (dev, staging, production).

#### Configuración Recomendada:

- **Production**: `https://klinia-api-gmdbb0ezfbhybjcw.canadacentral-01.azurewebsites.net/api`
- **Preview**: (opcional) URL de staging si tienes una
- **Development**: (opcional) URL local o de desarrollo

### 3. Configurar Build Settings

Vercel debería detectar automáticamente la configuración desde `vercel.json`, pero verifica:

- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 4. Configurar CORS en el Backend de Azure

Asegúrate de que tu backend de Azure permita requests desde tu dominio de Vercel:

1. Ve a la configuración de tu app en Azure
2. Agrega tu dominio de Vercel a la lista de orígenes permitidos en CORS
3. Ejemplo: `https://tu-proyecto.vercel.app`

### 5. Desplegar

1. Haz push a tu rama principal (o la que configuraste)
2. Vercel desplegará automáticamente
3. Revisa los logs del build para asegurarte de que todo está correcto

## 🔍 Verificación Post-Despliegue

### Verificar que las Variables de Entorno Están Configuradas:

1. Ve a tu proyecto en Vercel
2. Ve a **Deployments** → Selecciona el último deployment
3. Ve a **Build Logs** y busca:
   ```
   [API Client] BASE_URL: https://klinia-api-gmdbb0ezfbhybjcw.canadacentral-01.azurewebsites.net/api
   ```
   (Solo aparece en modo desarrollo, pero puedes verificar en la consola del navegador)

### Verificar la Conexión:

1. Abre tu aplicación desplegada en Vercel
2. Abre las herramientas de desarrollador (F12)
3. Ve a la pestaña **Network**
4. Intenta iniciar sesión o hacer cualquier acción que llame al API
5. Verifica que las peticiones vayan a: `https://klinia-api-gmdbb0ezfbhybjcw.canadacentral-01.azurewebsites.net/api/...`

## 🛠️ Solución de Problemas

### Error: "Failed to fetch" o CORS

- Verifica que el dominio de Vercel esté en la lista de orígenes permitidos en Azure
- Verifica que `VITE_API_BASE_URL` esté configurada correctamente en Vercel

### Error: Variables de entorno no se aplican

- Asegúrate de que las variables empiecen con `VITE_` (requerido por Vite)
- Reinicia el deployment después de agregar variables de entorno
- Verifica que estén configuradas para el entorno correcto (Production/Preview/Development)

### El build falla

- Revisa los logs del build en Vercel
- Verifica que todas las dependencias estén en `package.json`
- Asegúrate de que el comando `npm run build` funcione localmente

## 📝 Notas Adicionales

- **Variables de Entorno**: Todas las variables que empiezan con `VITE_` se exponen al cliente. No pongas secretos aquí.
- **CORS**: El backend debe permitir requests desde tu dominio de Vercel
- **HTTPS**: Vercel siempre usa HTTPS, asegúrate de que tu backend también lo soporte

## 🔗 Enlaces Útiles

- [Documentación de Vercel](https://vercel.com/docs)
- [Variables de Entorno en Vercel](https://vercel.com/docs/concepts/projects/environment-variables)
- [Configuración de Vite en Vercel](https://vercel.com/docs/frameworks/vite)

