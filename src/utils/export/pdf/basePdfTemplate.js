/**
 * Plantilla base para todos los PDFs generados desde ROMI Clínica.
 *
 * Provee un header con identidad de marca, un footer con folio + sello, y
 * helpers de tipografía y layout para que cada generador (notes, reports,
 * prescriptions, orders, history) tenga la misma identidad visual.
 *
 * Identidad:
 *   - Paleta: ink (#1A1A1A), cream (#FDF6EC), yellow (#FFD972), hot (#FF5C7C)
 *   - Header con franja superior amarilla + título grande
 *   - Footer con folio, profesional, sello SHA-256, leyenda legal
 *   - Sistema de margenes 56pt para sentirse aireado pero compacto
 */
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { formatDateISOToHuman } from "../../formatters";

// --- Tokens visuales ---
export const PAGE = {
  MARGIN: 56,
  HEADER_HEIGHT: 88,
  FOOTER_HEIGHT: 72,
};

export const TYPE = {
  TITLE: 22,
  SUBTITLE: 13,
  H2: 14,
  BODY: 11,
  SMALL: 9,
  TINY: 8,
};

export const LH = {
  BODY: 15,
  H2: 18,
  TITLE: 26,
};

export const COLOR = {
  INK: rgb(0.102, 0.102, 0.102),
  INK_SOFT: rgb(0.165, 0.165, 0.165),
  MUTED: rgb(0.35, 0.35, 0.35),
  CREAM: rgb(0.992, 0.965, 0.925),
  YELLOW: rgb(1.0, 0.851, 0.447),
  PINK: rgb(1.0, 0.361, 0.482),
  MINT: rgb(0.659, 0.902, 0.812),
  LILAC: rgb(0.784, 0.714, 1.0),
  HAIRLINE: rgb(0.85, 0.85, 0.85),
};

const BRAND_TITLE = "ROMI Clínica";
const DISCLAIMER =
  "Documento generado digitalmente por ROMI Clínica — Validez clínica conforme a NOM-004-SSA3-2012 y NOM-024-SSA3-2012. El profesional es responsable del contenido.";

// --- Helpers de texto ---

/**
 * Dibuja texto envuelto al ancho de la página y devuelve el cursorY final.
 */
export function drawWrapped(page, text, opts) {
  const {
    x,
    y,
    font,
    size = TYPE.BODY,
    color = COLOR.INK,
    lineHeight = LH.BODY,
    maxWidth = page.getWidth() - PAGE.MARGIN * 2,
  } = opts;
  if (!text) return y;

  const lines = String(text).split(/\n/);
  let cursorY = y;
  for (const rawLine of lines) {
    const words = rawLine.split(/\s+/);
    let current = "";
    for (const word of words) {
      const tentative = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(tentative, size) > maxWidth && current) {
        page.drawText(current, { x, y: cursorY, font, size, color });
        cursorY -= lineHeight;
        current = word;
      } else {
        current = tentative;
      }
    }
    if (current) {
      page.drawText(current, { x, y: cursorY, font, size, color });
      cursorY -= lineHeight;
    }
  }
  return cursorY;
}

/**
 * Sección con encabezado bold + cuerpo wrapped. Devuelve el cursorY final.
 */
export function drawSection(page, { title, body, fonts, x, y, maxWidth }) {
  const { regular, bold } = fonts;
  page.drawText(title, {
    x,
    y,
    font: bold,
    size: TYPE.H2,
    color: COLOR.INK,
  });
  let cursorY = y - LH.H2;
  cursorY = drawWrapped(page, body || "Sin información capturada.", {
    x,
    y: cursorY,
    font: regular,
    size: TYPE.BODY,
    maxWidth,
  });
  return cursorY - 8;
}

/**
 * Layout en 2 columnas para campos key→value. Devuelve cursorY final.
 */
export function drawKeyValues(page, entries, { fonts, x, y, columnWidth = 240 }) {
  const { regular, bold } = fonts;
  let cursorY = y;
  let col = 0;
  for (const [label, value] of entries) {
    const xPos = x + col * columnWidth;
    page.drawText(label.toUpperCase(), {
      x: xPos,
      y: cursorY,
      font: bold,
      size: TYPE.SMALL,
      color: COLOR.MUTED,
    });
    page.drawText(String(value ?? "—"), {
      x: xPos,
      y: cursorY - LH.BODY * 0.8,
      font: regular,
      size: TYPE.BODY,
      color: COLOR.INK,
    });
    col += 1;
    if (col >= 2) {
      col = 0;
      cursorY -= LH.BODY * 1.9;
    }
  }
  if (col !== 0) cursorY -= LH.BODY * 1.9;
  return cursorY - 8;
}

// --- Header / Footer ---

/**
 * Dibuja el header de ROMI Clínica en la página dada.
 * Devuelve la coordenada Y donde el contenido debe empezar.
 */
export function drawHeader(page, fonts, { title, subtitle, folio, generatedAt }) {
  const { regular, bold } = fonts;
  const { width, height } = page.getSize();

  // Franja superior amarilla con un detalle ondulado simulado por overlap
  page.drawRectangle({
    x: 0,
    y: height - PAGE.HEADER_HEIGHT,
    width,
    height: PAGE.HEADER_HEIGHT,
    color: COLOR.YELLOW,
  });
  // Línea de "borde dibujado a mano" — un rectángulo delgado oscuro
  page.drawRectangle({
    x: 0,
    y: height - PAGE.HEADER_HEIGHT - 3,
    width,
    height: 3,
    color: COLOR.INK,
  });

  // Brand top-left
  page.drawText(BRAND_TITLE, {
    x: PAGE.MARGIN,
    y: height - 34,
    font: bold,
    size: 11,
    color: COLOR.INK,
  });
  // Título del documento
  page.drawText(title, {
    x: PAGE.MARGIN,
    y: height - 60,
    font: bold,
    size: TYPE.TITLE,
    color: COLOR.INK,
  });
  if (subtitle) {
    page.drawText(subtitle, {
      x: PAGE.MARGIN,
      y: height - 80,
      font: regular,
      size: TYPE.SMALL,
      color: COLOR.INK_SOFT,
    });
  }

  // Folio + fecha en esquina superior derecha
  const folioLabel = folio ? `Folio · ${folio}` : "Folio · pendiente";
  const folioWidth = bold.widthOfTextAtSize(folioLabel, TYPE.SMALL);
  page.drawText(folioLabel, {
    x: width - PAGE.MARGIN - folioWidth,
    y: height - 34,
    font: bold,
    size: TYPE.SMALL,
    color: COLOR.INK,
  });
  const dateText = formatDateISOToHuman(generatedAt || new Date().toISOString());
  const dateWidth = regular.widthOfTextAtSize(dateText, TYPE.SMALL);
  page.drawText(dateText, {
    x: width - PAGE.MARGIN - dateWidth,
    y: height - 50,
    font: regular,
    size: TYPE.SMALL,
    color: COLOR.INK_SOFT,
  });

  // Marca rosa decorativa (mini punto en la esquina sup derecha como "doodle")
  page.drawCircle({
    x: width - 22,
    y: height - 22,
    size: 8,
    color: COLOR.PINK,
  });

  return height - PAGE.HEADER_HEIGHT - 28; // cursorY donde empieza el body
}

/**
 * Dibuja el footer con leyenda, profesional, sello SHA-256.
 */
export function drawFooter(page, fonts, { folio, professional, sha256 }) {
  const { regular, bold } = fonts;
  const { width } = page.getSize();

  // Línea hairline arriba del footer
  page.drawRectangle({
    x: PAGE.MARGIN,
    y: PAGE.FOOTER_HEIGHT - 6,
    width: width - PAGE.MARGIN * 2,
    height: 1,
    color: COLOR.HAIRLINE,
  });

  // Profesional + folio en la izquierda
  const profLabel = professional?.name
    ? `${professional.name}${professional.license ? ` · Cédula ${professional.license}` : ""}`
    : "Profesional no registrado";
  page.drawText(profLabel, {
    x: PAGE.MARGIN,
    y: PAGE.FOOTER_HEIGHT - 22,
    font: bold,
    size: TYPE.SMALL,
    color: COLOR.INK,
  });

  if (folio) {
    page.drawText(`Folio · ${folio}`, {
      x: PAGE.MARGIN,
      y: PAGE.FOOTER_HEIGHT - 36,
      font: regular,
      size: TYPE.TINY,
      color: COLOR.MUTED,
    });
  }

  if (sha256) {
    const short = `SHA-256 · ${sha256.slice(0, 16)}…`;
    page.drawText(short, {
      x: PAGE.MARGIN,
      y: PAGE.FOOTER_HEIGHT - 50,
      font: regular,
      size: TYPE.TINY,
      color: COLOR.MUTED,
    });
  }

  // Disclaimer envuelto a 60% del ancho en la derecha
  const discWidth = (width - PAGE.MARGIN * 2) * 0.55;
  const discX = width - PAGE.MARGIN - discWidth;
  drawWrapped(page, DISCLAIMER, {
    x: discX,
    y: PAGE.FOOTER_HEIGHT - 22,
    font: regular,
    size: TYPE.TINY,
    color: COLOR.MUTED,
    lineHeight: 11,
    maxWidth: discWidth,
  });
}

/**
 * Crea un PDF base con la primera página renderizada con header.
 * Devuelve { pdfDoc, page, fonts, cursorY } para que el generador concreto
 * agregue su contenido y al final invoque finalize() para drawFooter + save.
 */
export async function createBasePdf({
  title,
  subtitle,
  folio,
  generatedAt = new Date().toISOString(),
}) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage(); // A4 default
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const fonts = { regular, bold, italic };
  const cursorY = drawHeader(page, fonts, { title, subtitle, folio, generatedAt });
  return { pdfDoc, page, fonts, cursorY };
}

/**
 * Finaliza el PDF: dibuja footer en cada página y devuelve los bytes como Blob.
 */
export async function finalizePdf(pdfDoc, fonts, footerData) {
  const pages = pdfDoc.getPages();
  pages.forEach((page) => drawFooter(page, fonts, footerData));
  const bytes = await pdfDoc.save();
  return new Blob([bytes], { type: "application/pdf" });
}

/**
 * Agrega una página nueva con header igual al primero — útil cuando el contenido
 * supera el alto de una página.
 */
export function addContinuationPage(pdfDoc, fonts, { title, subtitle, folio, generatedAt }) {
  const page = pdfDoc.addPage();
  const cursorY = drawHeader(page, fonts, {
    title,
    subtitle: `${subtitle || ""} (cont.)`.trim(),
    folio,
    generatedAt,
  });
  return { page, cursorY };
}

/**
 * Calcula la coordenada Y mínima a partir de la cual debemos saltar a una página nueva.
 */
export function bottomLimit() {
  return PAGE.FOOTER_HEIGHT + 16;
}

export default {
  PAGE,
  TYPE,
  LH,
  COLOR,
  drawWrapped,
  drawSection,
  drawKeyValues,
  drawHeader,
  drawFooter,
  createBasePdf,
  finalizePdf,
  addContinuationPage,
  bottomLimit,
};
