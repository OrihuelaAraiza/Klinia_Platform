/**
 * Brand del repo. Este proyecto es exclusivamente ROMI Clínica (salud mental).
 * Tanatología y Cuidados Paliativos vive en su propio repo (Romi_Tanato_*).
 */

export const BRAND = {
  id: "clinica",
  name: "ROMI Clínica",
  shortName: "Clínica",
  tagline: "Salud mental",
  domain: "romiclinica.com.mx",
  logo: "/heroromi.png",
  favicon: "/favicon.ico",
  theme: "doodle",
  specialties: ["PSICOLOGO", "PSICOTERAPEUTA", "PSIQUIATRA"],
  historyTypes: ["PSICOLOGICA", "PSIQUIATRICA", "PSICOTERAPEUTICA"],
  modules: {
    symptomTrends: false,
    advanceDirectives: false,
    esasChart: false,
  },
  copy: {
    eyebrow: "ROMI Clínica · Ecosistema clínico de salud mental",
    titleLead: "Práctica clínica con",
    titleAccent: "rigor, IA y respaldo NOM-004",
    description:
      "Plataforma clínica de salud mental con Romi Transcript —tu copiloto de IA bajo corpus cerrado— y arquitectura que cumple NOM-004 y NOM-024 desde el primer día. Para pacientes y profesionales que quieren seriedad sin perder agilidad.",
    ctaPrimary: "Ver terapeutas disponibles",
    ctaFinalTitle: "¿Eres profesional de la salud mental?",
    ctaFinalCopy:
      "Únete a la plataforma y administra tu práctica clínica con respaldo NOM-004 y Romi Transcript a tu lado.",
    ctaFinalBtn: "Registrarme como profesional",
    directoryAnchor: "terapeutas",
  },
};

export function isPalliative() {
  return false;
}

export function brandSupportsModule(name) {
  return Boolean(BRAND.modules?.[name]);
}

export default BRAND;
