import { z } from "zod";

const diagnosisSchema = z.object({
  code: z.string().min(1).max(10),
  label: z.string().min(1).max(120),
});

const professionalSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  license: z.string().optional(),
});

export const noteCreateSchema = z.object({
  subjective: z.string().min(3),
  objective: z.string().min(3),
  analysis: z.string().min(3),
  plan: z.string().min(3),
  diagnoses: z.array(diagnosisSchema).max(10).default([]),
  professional: professionalSchema,
});

export const noteAddendumSchema = z.object({
  text: z.string().min(3),
});

export default {
  noteCreateSchema,
  noteAddendumSchema,
};
