import { copyFile, stat, readFile, writeFile } from "fs/promises";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const distDir = path.join(projectRoot, "dist");
const publicDir = path.join(projectRoot, "public");

async function ensureDist() {
  try {
    await stat(distDir);
  } catch (error) {
    throw new Error("No se encontró la carpeta dist. Ejecuta `npm run build` primero.");
  }
}

async function copyRobots() {
  const env = process.env.VERCEL_ENV || process.env.NODE_ENV || "development";
  const sourceFile = env === "production"
    ? path.join(publicDir, "robots.prod.txt")
    : path.join(publicDir, "robots.preview.txt");
  const targetFile = path.join(distDir, "robots.txt");
  await copyFile(sourceFile, targetFile);
}

async function copyHtaccess() {
  const sourceFile = path.join(publicDir, ".htaccess");
  const targetFile = path.join(distDir, ".htaccess");

  try {
    // Leer el contenido del archivo
    let content = await readFile(sourceFile, "utf-8");

    // Placeholder URL que debe ser reemplazada
    const placeholderUrl = "https://brevemente-api.azurewebsites.net";
    const placeholderPattern = new RegExp(placeholderUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");

    // Verificar si contiene el placeholder
    if (content.includes(placeholderUrl)) {
      // Intentar obtener la URL del backend desde variables de entorno
      // Nota: VITE_* variables pueden no estar disponibles en scripts Node.js,
      // pero pueden estar en el entorno de build (Vercel, CI/CD, etc.)
      const apiBaseUrl = process.env.VITE_API_BASE_URL || process.env.API_BASE_URL;
      
      if (apiBaseUrl && apiBaseUrl !== placeholderUrl) {
        // Extraer el dominio base (sin /api al final si existe)
        let backendUrl = apiBaseUrl.replace(/\/api\/?$/, "");
        // Asegurar que no termine con /
        backendUrl = backendUrl.replace(/\/$/, "");
        
        // Reemplazar el placeholder con la URL real
        content = content.replace(placeholderPattern, backendUrl);
        console.log(`[postbuild] Reemplazado placeholder de backend en .htaccess: ${backendUrl}`);
      } else {
        // Advertir si el placeholder sigue presente
        console.warn(
          `[postbuild] ⚠️  ADVERTENCIA: .htaccess contiene URL placeholder (${placeholderUrl}). ` +
          `Configura VITE_API_BASE_URL o actualiza manualmente el CSP en .htaccess antes de desplegar.`
        );
      }
    }

    // Escribir el archivo procesado
    await writeFile(targetFile, content, "utf-8");
  } catch (error) {
    // Distinguir entre diferentes tipos de errores
    if (error.code === "ENOENT") {
      // Archivo no encontrado - esto es aceptable, .htaccess es opcional
      console.warn("[postbuild] No se encontró .htaccess en public/, se puede agregar manualmente en cPanel");
    } else {
      // Otros errores (permisos, disco lleno, etc.) deben ser reportados
      console.error(
        `[postbuild] Error al copiar .htaccess: ${error.message} (código: ${error.code || "unknown"})`
      );
      throw error; // Re-lanzar para que el proceso falle si es un error crítico
    }
  }
}

(async () => {
  await ensureDist();
  await copyRobots();
  await copyHtaccess();
})().catch((error) => {
  console.warn("[postbuild] Error:", error.message);
});
