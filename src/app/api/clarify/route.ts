import { openrouter } from "@openrouter/ai-sdk-provider";
import {
  convertToModelMessages,
  streamText,
  tool,
  UIMessage,
} from "ai";
import { z } from "zod";

export const maxDuration = 30;

const model = openrouter("google/gemini-3.1-flash-lite") as any;

const tools = {
  askClarifyingQuestion: tool({
    description:
      "Present a multiple-choice clarifying question to the user to narrow down the research focus. " +
      "Only ask questions that genuinely help scope the research. " +
      "Call this tool when the user's research query is broad, ambiguous, or could benefit from focus areas. " +
      "Ask at most 2-3 questions total, one per tool call. Wait for the answer before asking follow-ups.",
    inputSchema: z.object({
      question: z
        .string()
        .describe("The clarifying question text (1 sentence, clear and specific)"),
      options: z
        .array(
          z.object({
            id: z.string().describe("Unique option identifier"),
            label: z.string().describe("Human-readable option label"),
          })
        )
        .min(2)
        .max(5)
        .describe("The multiple-choice options for the user to pick from"),
      allowsMultiple: z
        .boolean()
        .describe("Whether the user can select multiple options")
        .default(false),
    }),
    execute: async ({ question, options, allowsMultiple }) => {
      return { question, options, allowsMultiple };
    },
  }),

  finalizeResearchPlan: tool({
    description:
      "Call this when you have gathered enough clarification from the user to define a focused research plan. " +
      "This will present the final refined research prompt to the user so they can start the deep research.",
    inputSchema: z.object({
      refinedPrompt: z
        .string()
        .describe(
          "The enriched, focused research prompt that incorporates the user's answers"
        ),
      focusAreas: z
        .array(z.string())
        .describe("The key focus areas extracted from the clarifications"),
    }),
    execute: async ({ refinedPrompt, focusAreas }) => {
      return { status: "ready", refinedPrompt, focusAreas };
    },
  }),
};

export type ClarifyTools = typeof tools;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model,
    system: `You are a research focus assistant. Your job is to help users narrow down broad or ambiguous research queries into well-scoped, answerable research questions.

Workflow:
1. Read the user's research query
2. Determine if it's already specific and focused, or if it needs clarification
3. If it needs clarification, call askClarifyingQuestion with 1 concise multiple-choice question (2-5 options)
4. Wait for the user's answer (it will come back as a tool result)
5. You may ask up to 2 follow-up questions if needed, but keep it brief
6. Once you have enough context, call finalizeResearchPlan with a refined, specific research prompt

Guidelines for questions:
- Ask about scope (e.g., timeframe, geography, specific aspects)
- Ask about depth vs breadth preference
- Ask about target audience or application
- Never ask questions that are already answered in the original query
- Keep options mutually exclusive and collectively exhaustive

Guidelines for the refined prompt:
- Be specific: include timeframes, domains, and key angles
- Incorporate the user's selected focus areas
- Remove ambiguity
- Keep it under 200 words`,
    messages: await convertToModelMessages(messages),
    tools,
  });

  return result.toUIMessageStreamResponse();
}
