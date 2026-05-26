import TBE_SCHEMA, { TBE_TEMPLATE_ID } from "./tbe.schema";
import PSIQUIATRICO_SCHEMA, { PSIQUIATRICO_TEMPLATE_ID } from "./psiquiatrico.schema";
import { SPECIALTIES } from "../../../utils/constants";

export const REPORT_TEMPLATES = {
  [TBE_TEMPLATE_ID]: TBE_SCHEMA,
  [PSIQUIATRICO_TEMPLATE_ID]: PSIQUIATRICO_SCHEMA,
  LIBRE: {
    id: "LIBRE",
    label: "Reporte libre",
    description: "Texto libre sin estructura predefinida (compatibilidad con informes previos).",
    sections: [
      {
        id: "libre",
        title: "Contenido",
        fields: [
          { name: "title", label: "Título", type: "text", required: true },
          { name: "content", label: "Contenido", type: "textarea", rows: 12, required: true },
        ],
      },
    ],
  },
};

export const TEMPLATE_PICKER_OPTIONS = [
  {
    id: TBE_TEMPLATE_ID,
    label: TBE_SCHEMA.label,
    description: TBE_SCHEMA.description,
    available: true,
    requiredSpecialty: null,
  },
  {
    id: PSIQUIATRICO_TEMPLATE_ID,
    label: PSIQUIATRICO_SCHEMA.label,
    description: PSIQUIATRICO_SCHEMA.description,
    available: true,
    requiredSpecialty: SPECIALTIES.PSIQUIATRA,
  },
  {
    id: "LIBRE",
    label: "Reporte libre",
    description: "Texto libre para casos no contemplados en plantillas.",
    available: true,
    requiredSpecialty: null,
  },
];

export function getTemplate(templateId) {
  return REPORT_TEMPLATES[templateId] || null;
}

export function getTemplateLabel(templateId) {
  return REPORT_TEMPLATES[templateId]?.label || templateId || "—";
}

export { TBE_TEMPLATE_ID, PSIQUIATRICO_TEMPLATE_ID };
