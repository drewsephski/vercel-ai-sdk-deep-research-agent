"use client";

import { useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  QuestionFlowDefinition,
  QuestionFlowOption,
  QuestionFlowChoice,
} from "./schema";

interface ProgressiveModeProps {
  id: string;
  step: number;
  title: string;
  description?: string;
  options: QuestionFlowOption[];
  selectionMode?: "single" | "multi";
  defaultValue?: string[];
  onSelect?: (optionIds: string[]) => void | Promise<void>;
  onBack?: () => void;
}

interface UpfrontModeProps {
  id: string;
  steps: QuestionFlowDefinition[];
  onStepChange?: (stepId: string) => void;
  onComplete?: (answers: Record<string, string[]>) => void | Promise<void>;
}

interface ReceiptModeProps {
  id: string;
  choice: QuestionFlowChoice;
}

type QuestionFlowProps = ProgressiveModeProps | UpfrontModeProps | ReceiptModeProps;

export function QuestionFlow(props: QuestionFlowProps) {
  if ("choice" in props) {
    return <ReceiptView {...props} />;
  }

  if ("steps" in props) {
    return <UpfrontMode {...props} />;
  }

  return <ProgressiveMode {...props} />;
}

function ProgressiveMode({
  id,
  step,
  title,
  description,
  options,
  selectionMode = "single",
  defaultValue = [],
  onSelect,
  onBack,
}: ProgressiveModeProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(defaultValue);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = (optionId: string) => {
    if (selectionMode === "single") {
      setSelectedIds([optionId]);
    } else {
      setSelectedIds((prev) =>
        prev.includes(optionId)
          ? prev.filter((id) => id !== optionId)
          : [...prev, optionId]
      );
    }
  };

  const handleNext = async () => {
    if (selectedIds.length === 0 || !onSelect) return;
    setIsLoading(true);
    await onSelect(selectedIds);
    setIsLoading(false);
  };

  const canProceed = selectionMode === "single" ? selectedIds.length === 1 : selectedIds.length > 0;

  return (
    <div className="w-full max-w-2xl mx-auto p-6 space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Step {step}</span>
      </div>

      {/* Step content */}
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-semibold">{title}</h3>
          {description && (
            <p className="text-muted-foreground mt-1">{description}</p>
          )}
        </div>

        {/* Options */}
        <div className="space-y-2" role="radiogroup">
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => !option.disabled && handleToggle(option.id)}
              disabled={option.disabled || isLoading}
              className={cn(
                "w-full flex items-start gap-3 p-4 text-left rounded-lg border-2 transition-all",
                "hover:border-primary/50 hover:bg-accent/50",
                selectedIds.includes(option.id)
                  ? "border-primary bg-primary/5"
                  : "border-border",
                option.disabled && "opacity-50 cursor-not-allowed"
              )}
              aria-pressed={selectedIds.includes(option.id)}
              aria-disabled={option.disabled}
            >
              {option.icon && (
                <div className="mt-0.5 flex-shrink-0">{option.icon}</div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium">{option.label}</div>
                {option.description && (
                  <div className="text-sm text-muted-foreground mt-0.5">
                    {option.description}
                  </div>
                )}
              </div>
              {selectedIds.includes(option.id) && (
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
              )}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          )}
          <button
            type="button"
            onClick={handleNext}
            disabled={!canProceed || isLoading}
            className="ml-auto flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Loading..." : "Next"}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function UpfrontMode({
  id,
  steps,
  onStepChange,
  onComplete,
}: UpfrontModeProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(false);

  const currentStep = steps[currentStepIndex];
  const isLastStep = currentStepIndex === steps.length - 1;

  const handleSelect = async (optionIds: string[]) => {
    setAnswers((prev) => ({
      ...prev,
      [currentStep.id]: optionIds,
    }));

    if (isLastStep) {
      if (onComplete) {
        setIsLoading(true);
        await onComplete(answers);
        setIsLoading(false);
      }
    } else {
      setCurrentStepIndex((prev) => prev + 1);
      onStepChange?.(steps[currentStepIndex + 1].id);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
      onStepChange?.(steps[currentStepIndex - 1].id);
    }
  };

  return (
    <ProgressiveMode
      id={id}
      step={currentStepIndex + 1}
      title={currentStep.title}
      description={currentStep.description}
      options={currentStep.options}
      selectionMode={currentStep.selectionMode}
      defaultValue={answers[currentStep.id] || []}
      onSelect={handleSelect}
      onBack={currentStepIndex > 0 ? handleBack : undefined}
    />
  );
}

function ReceiptView({ id, choice }: ReceiptModeProps) {
  return (
    <div className="w-full max-w-2xl mx-auto p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
          <CheckCircle2 className="w-5 h-5 text-green-500" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">{choice.title}</h3>
          <p className="text-sm text-muted-foreground">Configuration complete</p>
        </div>
      </div>

      <div className="border rounded-lg divide-y">
        {choice.summary.map((item, index) => (
          <div key={index} className="flex justify-between p-4">
            <span className="text-sm font-medium text-muted-foreground">
              {item.label}
            </span>
            <span className="text-sm">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
