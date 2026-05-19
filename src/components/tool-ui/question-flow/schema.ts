import { z } from "zod";

export const QuestionFlowOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string().optional(),
  icon: z.any().optional(),
  disabled: z.boolean().optional(),
});

export type QuestionFlowOption = z.infer<typeof QuestionFlowOptionSchema>;

export const QuestionFlowDefinitionSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  options: QuestionFlowOptionSchema.array(),
  selectionMode: z.enum(["single", "multi"]).optional().default("single"),
});

export type QuestionFlowDefinition = z.infer<typeof QuestionFlowDefinitionSchema>;

export const QuestionFlowChoiceSchema = z.object({
  title: z.string(),
  summary: z.array(
    z.object({
      label: z.string(),
      value: z.string(),
    })
  ),
});

export type QuestionFlowChoice = z.infer<typeof QuestionFlowChoiceSchema>;

export const SerializableQuestionFlowSchema = z.object({
  id: z.string().optional(),
  step: z.number().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  options: QuestionFlowOptionSchema.array().optional(),
  selectionMode: z.enum(["single", "multi"]).optional(),
  defaultValue: z.array(z.string()).optional(),
  steps: QuestionFlowDefinitionSchema.array().optional(),
  choice: QuestionFlowChoiceSchema.optional(),
});

export type SerializableQuestionFlow = z.infer<typeof SerializableQuestionFlowSchema>;

export function safeParseSerializableQuestionFlow(
  data: unknown
): SerializableQuestionFlow | null {
  const result = SerializableQuestionFlowSchema.safeParse(data);
  return result.success ? result.data : null;
}
