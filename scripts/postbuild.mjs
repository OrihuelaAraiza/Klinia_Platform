import { copyFile, stat } from "fs/promises";
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
  try {
    const sourceFile = path.join(publicDir, ".htaccess");
    const targetFile = path.join(distDir, ".htaccess");
    await copyFile(sourceFile, targetFile);
  } catch (error) {
    // .htaccess es opcional, solo advertir si no existe
    console.warn("[postbuild] No se encontró .htaccess en public/, se puede agregar manualmente en cPanel");
  }
}

(async () => {
  await ensureDist();
  await copyRobots();
  await copyHtaccess();
})().catch((error) => {
  console.warn("[postbuild] Error:", error.message);
});
