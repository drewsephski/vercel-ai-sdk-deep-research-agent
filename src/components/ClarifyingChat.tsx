"use client";

import { Button } from "@/components/ui/button";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { useChat } from "@ai-sdk/react";
import { CheckCircle2, ChevronRight, Lightbulb, Sparkles, AlertCircle, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { QuestionFlow } from "@/components/tool-ui/runtime-provider";

interface ClarifyingChatProps {
  initialPrompt: string;
  onResearchStart: (refinedPrompt: string, focusAreas: string[]) => void;
  onBack?: () => void;
}

export function ClarifyingChat({
  initialPrompt,
  onResearchStart,
  onBack,
}: ClarifyingChatProps) {
  const [currentQuestion, setCurrentQuestion] = useState<{
    toolCallId: string;
    question: string;
    options: { id: string; label: string }[];
    allowsMultiple: boolean;
  } | null>(null);
  const [submittedToolCallIds, setSubmittedToolCallIds] = useState<Set<string>>(new Set());
  const [finalPlan, setFinalPlan] = useState<{
    refinedPrompt: string;
    focusAreas: string[];
  } | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(3); // Estimate, AI can ask up to 3

  // LocalStorage persistence key
  const STORAGE_KEY = `clarification_${initialPrompt.slice(0, 20).replace(/\s+/g, '_')}`;

  // Save state to localStorage
  const saveToLocalStorage = (key: string, value: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn("Failed to save to localStorage:", e);
    }
  };

  // Load state from localStorage
  const loadFromLocalStorage = (key: string) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (e) {
      console.warn("Failed to load from localStorage:", e);
      return null;
    }
  };

  // Clear localStorage for this session
  const clearLocalStorage = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn("Failed to clear localStorage:", e);
    }
  };

  // Restore state from localStorage on mount
  useEffect(() => {
    const saved = loadFromLocalStorage(STORAGE_KEY);
    if (saved) {
      if (saved.currentQuestion) setCurrentQuestion(saved.currentQuestion);
      if (saved.submittedToolCallIds) setSubmittedToolCallIds(new Set(saved.submittedToolCallIds));
      if (saved.finalPlan) setFinalPlan(saved.finalPlan);
      if (saved.questionCount) setQuestionCount(saved.questionCount);
    }
  }, [STORAGE_KEY]);

  // Auto-save state to localStorage when it changes
  useEffect(() => {
    if (currentQuestion) {
      saveToLocalStorage(STORAGE_KEY, {
        currentQuestion,
        submittedToolCallIds: Array.from(submittedToolCallIds),
        finalPlan,
        questionCount,
      });
    }
  }, [currentQuestion, submittedToolCallIds, finalPlan, questionCount, STORAGE_KEY]);

  // Clear localStorage when research starts or user goes back
  useEffect(() => {
    return () => {
      clearLocalStorage();
    };
  }, []);

  const { messages, sendMessage, addToolOutput, status, error: chatError } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/clarify",
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });

  // Handle chat errors
  useEffect(() => {
    if (chatError) {
      console.error("Chat error:", chatError);
      setError(chatError);
    }
  }, [chatError]);

  const handleRetry = () => {
    setError(null);
    // Clear messages and restart the conversation
    sendMessage({
      text: `I want to research: "${initialPrompt}"`,
    });
  };

  const handleSkipQuestion = (toolCallId: string, question: string) => {
    const skipMessage = `For "${question}", I'd like to skip this question.`;
    addToolOutput({
      tool: "askClarifyingQuestion",
      toolCallId,
      output: skipMessage,
    });
    setSubmittedToolCallIds((prev) => new Set(prev).add(toolCallId));
    setCurrentQuestion(null);
  };

  // Track question count from messages and detect new questions
  useEffect(() => {
    const questionToolCalls = messages.flatMap((m) =>
      m.parts.filter((p) => p.type === "tool-askClarifyingQuestion")
    );
    const currentQuestionCount = questionToolCalls.length;
    if (currentQuestionCount > questionCount) {
      setQuestionCount(currentQuestionCount);
    }

    // Find the most recent unanswered question
    for (const message of [...messages].reverse()) {
      for (const part of message.parts) {
        if (
          part.type === "tool-askClarifyingQuestion" &&
          (part.state === "input-available" || part.state === "input-streaming") &&
          !submittedToolCallIds.has(part.toolCallId) &&
          !currentQuestion
        ) {
          const input = part.input as {
            question: string;
            options: { id: string; label: string }[];
            allowsMultiple: boolean;
          };
          setCurrentQuestion({
            toolCallId: part.toolCallId,
            question: input.question,
            options: input.options,
            allowsMultiple: input.allowsMultiple,
          });
          return;
        }
      }
    }
  }, [messages, questionCount, submittedToolCallIds, currentQuestion]);

  const isLoading = status === "submitted" || status === "streaming";

  // Auto-send the initial prompt on mount
  useEffect(() => {
    if (messages.length === 0 && status === "ready") {
      sendMessage({
        text: `I want to research: "${initialPrompt}"`,
      });
    }
  }, [status, messages.length, initialPrompt, sendMessage]);

  // Display error state
  if (error) {
    return (
      <div className="w-full max-w-2xl mx-auto animate-fade-up space-y-6">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-destructive/5">
            <AlertCircle className="w-5 h-5 text-destructive" strokeWidth={1.5} />
          </div>
          <h2 className="text-xl font-semibold tracking-tight">
            Connection Error
          </h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            {error.message || "Failed to connect to the clarification service. Please check your connection and try again."}
          </p>
        </div>

        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" onClick={onBack}>
            Back
          </Button>
          <Button size="sm" onClick={handleRetry}>
            <RefreshCw className="w-4 h-4 mr-2" strokeWidth={1.5} />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Display loading skeleton while waiting for first question
  if (isLoading && messages.length === 0) {
    return (
      <div className="w-full max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/5">
            <Lightbulb className="w-5 h-5 text-primary animate-pulse" strokeWidth={1.5} />
          </div>
          <h2 className="text-xl font-semibold tracking-tight">
            Analyzing your query...
          </h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Preparing clarifying questions to focus your research.
          </p>
        </div>

        <div className="rounded-xl border bg-card p-5 space-y-4">
          <div className="space-y-3">
            <div className="h-4 w-1/3 bg-muted rounded animate-pulse" />
            <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
          </div>

          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 w-full bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>

          <div className="flex justify-end">
            <div className="h-9 w-20 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  const handleQuestionFlowComplete = (optionIds: string[]) => {
    if (!currentQuestion) return;

    const answerText = currentQuestion.allowsMultiple
      ? `For "${currentQuestion.question}", I selected: ${optionIds.join(", ")}`
      : `For "${currentQuestion.question}", I selected: ${optionIds[0]}`;

    addToolOutput({
      tool: "askClarifyingQuestion",
      toolCallId: currentQuestion.toolCallId,
      output: answerText,
    });

    setSubmittedToolCallIds((prev) => new Set(prev).add(currentQuestion.toolCallId));
    setCurrentQuestion(null);
  };

  // Detect finalizeResearchPlan tool result
  useEffect(() => {
    for (const message of messages) {
      for (const part of message.parts) {
        if (
          part.type === "tool-finalizeResearchPlan" &&
          part.state === "output-available" &&
          part.output
        ) {
          const output = part.output as {
            refinedPrompt: string;
            focusAreas: string[];
          };
          if (!finalPlan) {
            setFinalPlan({
              refinedPrompt: output.refinedPrompt,
              focusAreas: output.focusAreas,
            });
          }
        }
      }
    }
  }, [messages, finalPlan]);

  if (finalPlan) {
    return (
      <div className="w-full max-w-2xl mx-auto animate-fade-up space-y-6">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/5">
            <Sparkles className="w-5 h-5 text-primary" strokeWidth={1.5} />
          </div>
          <h2 className="text-xl font-semibold tracking-tight">
            Research Plan Ready
          </h2>
          <p className="text-muted-foreground text-sm">
            We have refined your query based on your answers.
          </p>
        </div>

        <div className="rounded-xl border bg-card p-5 space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Focus Areas
            </p>
            <div className="flex flex-wrap gap-2">
              {finalPlan.focusAreas.map((area) => (
                <span
                  key={area}
                  className="inline-flex items-center px-2.5 py-1 rounded-md bg-primary/5 text-xs font-medium text-primary"
                >
                  {area}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Refined Prompt
            </p>
            <p className="text-sm leading-relaxed text-foreground">
              {finalPlan.refinedPrompt}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onBack}>
            Back
          </Button>
          <Button
            onClick={() =>
              onResearchStart(finalPlan.refinedPrompt, finalPlan.focusAreas)
            }
            className="font-medium px-5"
          >
            <Sparkles className="w-4 h-4 mr-2" strokeWidth={1.5} />
            Start Deep Research
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/5">
          <Lightbulb className="w-5 h-5 text-primary" strokeWidth={1.5} />
        </div>
        <h2 className="text-xl font-semibold tracking-tight">
          Tailoring your report
        </h2>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          Answer a few quick questions so we can focus the research on what matters most to you.
        </p>
      </div>

      <div className="space-y-4">
        {messages.map((message) => (
          <div key={message.id}>
            {message.parts.map((part, i) => {
              if (part.type === "text" && message.role === "assistant") {
                return (
                  <div
                    key={`${message.id}-${i}`}
                    className="flex justify-start"
                  >
                    <div className="max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed bg-muted">
                      {part.text}
                    </div>
                  </div>
                );
              }

              if (part.type === "tool-askClarifyingQuestion") {
                const callId = part.toolCallId;
                const isSubmitted = submittedToolCallIds.has(callId);

                switch (part.state) {
                  case "input-streaming":
                    return (
                      <div
                        key={callId}
                        className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse"
                      >
                        <Lightbulb className="w-4 h-4" />
                        Generating question...
                      </div>
                    );

                  case "input-available":
                  case "output-available": {
                    const input = part.input as {
                      question: string;
                      options: { id: string; label: string }[];
                      allowsMultiple: boolean;
                    };

                    if (isSubmitted) {
                      return (
                        <div
                          key={callId}
                          className="rounded-xl border bg-card p-4 space-y-2 opacity-60"
                        >
                          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            {input.question}
                          </div>
                        </div>
                      );
                    }

                    // Render QuestionFlow for the current active question
                    if (currentQuestion && currentQuestion.toolCallId === callId) {
                      return (
                        <QuestionFlow
                          key={callId}
                          id={`clarify-${callId}`}
                          step={questionCount}
                          title={input.question}
                          options={input.options.map((opt) => ({
                            id: opt.id,
                            label: opt.label,
                          }))}
                          selectionMode={input.allowsMultiple ? "multi" : "single"}
                          onSelect={handleQuestionFlowComplete}
                          onBack={onBack}
                        />
                      );
                    }

                    return null;
                  }

                  default:
                    return null;
                }
              }

              return null;
            })}
          </div>
        ))}

        {isLoading && messages.length > 0 && !hasPendingQuestion(messages) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
            <Lightbulb className="w-4 h-4" />
            Thinking...
          </div>
        )}
      </div>
    </div>
  );
}

function hasPendingQuestion(messages: any[]): boolean {
  const lastAssistant = [...messages]
    .reverse()
    .find((m) => m.role === "assistant");
  if (!lastAssistant) return false;

  return lastAssistant.parts.some((part: any) => {
    if (part.type !== "tool-askClarifyingQuestion") return false;
    return part.state === "input-available" || part.state === "input-streaming";
  });
}
