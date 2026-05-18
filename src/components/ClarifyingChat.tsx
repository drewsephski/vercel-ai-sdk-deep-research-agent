"use client";

import { Button } from "@/components/ui/button";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { useChat } from "@ai-sdk/react";
import { CheckCircle2, ChevronRight, Lightbulb, Sparkles, AlertCircle, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

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
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
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
      if (saved.selectedOptions) setSelectedOptions(saved.selectedOptions);
      if (saved.submittedToolCallIds) setSubmittedToolCallIds(new Set(saved.submittedToolCallIds));
      if (saved.finalPlan) setFinalPlan(saved.finalPlan);
      if (saved.questionCount) setQuestionCount(saved.questionCount);
    }
  }, [STORAGE_KEY]);

  // Auto-save state to localStorage when it changes
  useEffect(() => {
    if (selectedOptions) {
      saveToLocalStorage(STORAGE_KEY, {
        selectedOptions,
        submittedToolCallIds: Array.from(submittedToolCallIds),
        finalPlan,
        questionCount,
      });
    }
  }, [selectedOptions, submittedToolCallIds, finalPlan, questionCount, STORAGE_KEY]);

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
  };

  // Track question count from messages
  useEffect(() => {
    const questionToolCalls = messages.flatMap((m) =>
      m.parts.filter((p) => p.type === "tool-askClarifyingQuestion")
    );
    const currentQuestionCount = questionToolCalls.length;
    if (currentQuestionCount > questionCount) {
      setQuestionCount(currentQuestionCount);
    }
  }, [messages, questionCount]);

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

  const handleOptionToggle = (
    toolCallId: string,
    optionId: string,
    allowsMultiple: boolean
  ) => {
    setSelectedOptions((prev) => {
      const current = prev[toolCallId] || [];
      if (allowsMultiple) {
        const next = current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId];
        return { ...prev, [toolCallId]: next };
      }
      return { ...prev, [toolCallId]: [optionId] };
    });
  };

  const handleSubmitAnswer = (
    toolCallId: string,
    question: string,
    allowsMultiple: boolean
  ) => {
    const selected = selectedOptions[toolCallId] || [];
    if (selected.length === 0) return;

    const answerText = allowsMultiple
      ? `For "${question}", I selected: ${selected.join(", ")}`
      : `For "${question}", I selected: ${selected[0]}`;

    addToolOutput({
      tool: "askClarifyingQuestion",
      toolCallId,
      output: answerText,
    });

    setSubmittedToolCallIds((prev) => new Set(prev).add(toolCallId));
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
          Narrowing Your Focus
        </h2>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          To deliver the most relevant research, answer a few quick questions about what you need.
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
                    const selected = selectedOptions[callId] || [];

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
                          <p className="text-sm text-muted-foreground pl-6">
                            {selected.join(", ")}
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={callId}
                        className="rounded-xl border bg-card p-5 space-y-4 animate-fade-in"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Question {questionCount} of {totalQuestions}
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-muted-foreground hover:text-white"
                            onClick={() => handleSkipQuestion(callId, input.question)}
                          >
            Skip
          </Button>
        </div>

                        <p className="text-sm font-medium">{input.question}</p>

                        <div className="space-y-2">
                          {input.options.map((option) => {
                            const isSelected = selected.includes(option.id);
                            return (
                              <button
                                key={option.id}
                                onClick={() =>
                                  handleOptionToggle(
                                    callId,
                                    option.id,
                                    input.allowsMultiple
                                  )
                                }
                                className={`w-full flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-all ${
                                  isSelected
                                    ? "border-primary bg-primary/5 text-primary font-medium"
                                    : "border-border hover:border-primary/30 hover:bg-muted/50"
                                }`}
                              >
                                <div
                                  className={`flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                                    isSelected
                                      ? "border-primary bg-primary"
                                      : "border-muted-foreground/30"
                                  }`}
                                >
                                  {isSelected && (
                                    <CheckCircle2 className="w-3 h-3 text-primary-foreground" />
                                  )}
                                </div>
                                {option.label}
                              </button>
                            );
                          })}
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="hover:text-white"
                            onClick={() => handleSkipQuestion(callId, input.question)}
                          >
            Skip
          </Button>
                          <Button
                            size="sm"
                            disabled={selected.length === 0 || isLoading}
                            onClick={() =>
                              handleSubmitAnswer(
                                callId,
                                input.question,
                                input.allowsMultiple
                              )
                            }
                          >
                            Answer
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    );
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
