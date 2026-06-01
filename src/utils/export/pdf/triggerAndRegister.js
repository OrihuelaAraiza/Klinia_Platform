import { registerDocument, previewFolio } from "../../../services/documentsService";
import { canonicalize, sha256 } from "../composeRecord";

/**
 * Flujo unificado para "generar PDF + registrar":
 *   1. Pide al backend un folio preview (para embebierlo en el PDF)
 *   2. Llama al renderer (que recibe el folio) para producir el Blob
 *   3. Dispara la descarga local
 *   4. Sube el blob al backend (que asigna el folio real, idealmente igual al preview)
 *      y registra el documento en GeneratedDocument → aparece en docs del paciente
 *
 * El paso 4 NO bloquea la descarga: si falla, el usuario aún tiene su PDF.
 * Pero loggeamos en consola para que se pueda diagnosticar.
 *
 * @param {Object} opts
 * @param {"NOTE"|"REPORT"|"PRESCRIPTION"|"ORDER"|"HISTORY"|"OTHER"} opts.type
 * @param {string} opts.patientId — necesario para el registro
 * @param {string} [opts.sourceId] — id de la entidad origen (Note.id, etc.)
 * @param {string} [opts.title] — título descriptivo del documento
 * @param {string} opts.filename — nombre para la descarga local (sin folio)
 * @param {(folio: string|null) => Promise<Blob>} opts.render — genera el Blob PDF
 */
export async function generateAndRegister({
  type,
  patientId,
  sourceId,
  title,
  filename,
  render,
}) {
  // 1) Folio preview (no es atómico — solo para mostrar dentro del PDF)
  let folio = null;
  try {
    if (patientId) {
      folio = await previewFolio(type);
    }
  } catch {
    // ignoramos — el render puede continuar sin folio
  }

  // 2) Render del PDF con el folio embebido
  const blob = await render(folio);
  if (!blob) throw new Error("El generador no devolvió un PDF.");

  // 3) Descarga local inmediata
  const localFilename = folio
    ? `${type.toLowerCase()}_${folio}.pdf`
    : filename || `${type.toLowerCase()}.pdf`;
  triggerDownload(blob, localFilename);

  // 4) Registro en backend (no bloqueante para el UX)
  if (patientId) {
    try {
      // Hash del blob para integridad
      let sha = null;
      try {
        const buf = await blob.arrayBuffer();
        sha = await sha256(canonicalize({ size: blob.size, bytes: buf.byteLength, type }));
      } catch {
        sha = null;
      }
      const record = await registerDocument({
        blob,
        type,
        patientId,
        sourceId,
        title,
        sha256: sha,
      });
      // Notifica al resto de la UI por si tiene listas que actualizar
      try {
        window.dispatchEvent(
          new CustomEvent("klinia:document-generated", { detail: { ...record, type, patientId } })
        );
      } catch { /* SSR safe */ }
      return { blob, record, folio: record?.folio || folio };
    } catch (error) {
      console.warn("[PDF] Documento descargado pero NO registrado:", error);
      return { blob, record: null, folio };
    }
  }
  return { blob, record: null, folio };
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default { generateAndRegister };
