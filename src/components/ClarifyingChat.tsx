"use client";

import { Button } from "@/components/ui/button";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { useChat } from "@ai-sdk/react";
import { CheckCircle2, ChevronRight, Lightbulb, Sparkles } from "lucide-react";
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

  const { messages, sendMessage, addToolOutput, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/clarify",
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });

  // Auto-send the initial prompt on mount
  useEffect(() => {
    if (messages.length === 0 && status === "ready") {
      sendMessage({
        text: `I want to research: "${initialPrompt}"`,
      });
    }
  }, [status, messages.length, initialPrompt, sendMessage]);

  const isLoading = status === "submitted" || status === "streaming";

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

                        <div className="flex justify-end">
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
