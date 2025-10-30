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

export const historyCreateSchema = z.object({
  motive: z.string().min(3),
  psychosocialBackground: z.string().min(3),
  mentalStatusExam: z.string().min(3),
  diagnoses: z.array(diagnosisSchema).max(10).default([]),
  goals: z.string().min(3),
  therapeuticPlan: z.string().min(3),
  professional: professionalSchema,
});

export default {
  historyCreateSchema,
};
