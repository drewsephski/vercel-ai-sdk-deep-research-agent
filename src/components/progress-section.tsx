"use client";

import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export type ProgressSectionProps = {
  status: string;
  progress?: number;
  message?: string;
  prompt?: string;
  durationInSeconds?: number;
  finalUrl?: string;
};

export function ProgressSection({
  progress,
  status,
  message,
  prompt,
}: ProgressSectionProps) {
  return (
    <div className="w-full space-y-5 animate-fade-up">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">Researching...</h2>
        <p className="text-muted-foreground text-[15px] leading-relaxed max-w-lg mx-auto">
          {prompt}
        </p>
      </div>

      <div className="space-y-3 max-w-md mx-auto">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground font-medium">{message || " "}</span>
          <Badge variant="secondary" className="text-xs font-medium capitalize gap-1.5">
            {status === "EXECUTING" && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-pulse" />
            )}
            {status?.toLowerCase() || " "}
          </Badge>
        </div>
        <Progress value={progress} className="h-1.5" />
        <p className="text-xs text-muted-foreground text-right tabular-nums">
          {progress ?? 0}%
        </p>
      </div>
    </div>
  );
}
