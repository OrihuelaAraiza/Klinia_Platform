# Fix para Error 404 en Vercel

## Problema
Error: `Failed to load resource: the server responded with a status of 404` para archivos JS en `/assets/`

## Solución Aplicada

Se actualizó `vercel.json` para:
1. Remover `framework: "vite"` explícito (Vercel lo detecta automáticamente)
2. Mantener el rewrite básico para SPA: `{ "source": "/(.*)", "destination": "/index.html" }`

## Verificación

Vercel debería:
- Detectar automáticamente que es una app Vite
- Servir archivos estáticos desde `/assets/` automáticamente
- Aplicar el rewrite solo para rutas que no sean archivos estáticos

## Si el problema persiste

1. Verifica en Vercel Dashboard → Deployments → Ver logs del build
2. Verifica que los archivos estén en `dist/assets/` después del build
3. Revisa la configuración del proyecto en Vercel Dashboard:
   - Framework Preset: debería ser "Vite"
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

## Alternativa: Verificar estructura del build

Si después del deployment aún hay problemas, verifica:

```bash
# En local, después de npm run build
ls -la dist/assets/
cat dist/index.html | grep assets
```

Los archivos deberían existir y las rutas en el HTML deberían ser absolutas (empezar con `/assets/`).

