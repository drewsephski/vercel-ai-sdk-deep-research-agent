"use client";

import { Search, MessageSquare, BrainCircuit, FileCheck, type LucideIcon } from "lucide-react";

interface Step {
  label: string;
  icon: LucideIcon;
}

const STEPS: Step[] = [
  { label: "Clarifying", icon: MessageSquare },
  { label: "Searching", icon: Search },
  { label: "Synthesizing", icon: BrainCircuit },
  { label: "Formatting", icon: FileCheck },
];

interface ResearchStepsProps {
  progress: number;
  status: string;
}

export function ResearchSteps({ progress, status }: ResearchStepsProps) {
  // Map progress to active step index
  const activeIndex = Math.min(
    Math.floor((progress / 100) * STEPS.length),
    STEPS.length - 1
  );

  const isCompleted = status === "COMPLETED";

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex items-center justify-between relative">
        {/* Progress line */}
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-muted rounded-full" />
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-primary rounded-full transition-all duration-700 ease-out"
          style={{
            width: isCompleted
              ? "100%"
              : `${(activeIndex / (STEPS.length - 1)) * 100}%`,
          }}
        />

        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isActive = index <= activeIndex || isCompleted;
          const isCurrent = index === activeIndex && !isCompleted;

          return (
            <div
              key={step.label}
              className="relative flex flex-col items-center gap-2 z-10"
            >
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-500 ${
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted bg-background text-muted-foreground"
                } ${isCurrent ? "ring-4 ring-primary/20 scale-110" : ""}`}
              >
                <Icon className="w-4 h-4" strokeWidth={1.5} />
              </div>
              <span
                className={`text-[11px] font-medium transition-colors duration-300 ${
                  isActive ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
