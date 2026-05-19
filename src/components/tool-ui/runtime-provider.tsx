"use client";

import { QuestionFlow } from "./question-flow";
import {
  safeParseSerializableQuestionFlow,
  SerializableQuestionFlowSchema,
} from "./question-flow/schema";

// Export the QuestionFlow component directly for use in your application
export { QuestionFlow };

// Export the schema for type checking
export {
  safeParseSerializableQuestionFlow,
  SerializableQuestionFlowSchema,
} from "./question-flow/schema";

// Export types for TypeScript
export type {
  QuestionFlowOption,
  QuestionFlowDefinition,
  QuestionFlowChoice,
  SerializableQuestionFlow,
} from "./question-flow/schema";
