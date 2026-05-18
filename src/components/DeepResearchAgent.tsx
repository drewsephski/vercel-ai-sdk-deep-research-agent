"use client";

import { ProgressSection } from "@/components/progress-section";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useRealtimeTaskTrigger } from "@trigger.dev/react-hooks";
import { Search, Telescope, FileText } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { useUser } from "@clerk/nextjs";

export const ProgressMetadataSchema = z.object({
  status: z.object({
    progress: z.number(),
    label: z.string(),
  }),
  pdfName: z.string().nullable().optional(),
});

export type ProgressMetadata = z.infer<typeof ProgressMetadataSchema>;

export function parseStatus(data: unknown): ProgressMetadata {
  return ProgressMetadataSchema.parse(data);
}

export function DeepResearchAgent({ triggerToken }: { triggerToken: string }) {
  const { user } = useUser();
  const [prompt, setPrompt] = useState("");
  const [promptError, setPromptError] = useState<string | null>(null);

  const triggerInstance = useRealtimeTaskTrigger<any>(
    "deep-research",
    {
      accessToken: triggerToken,
      baseURL: process.env.NEXT_PUBLIC_TRIGGER_API_URL,
    },
  ) as any;

  const run = triggerInstance.run;

  let progress = 0;
  let label = " ";
  let pdfTitle = "";

  if (run?.metadata) {
    const { status, pdfName } = parseStatus(run.metadata);
    progress = status.progress;
    label = status.label;
    pdfTitle = pdfName || "";
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (prompt.length < 30) {
      setPromptError("Research prompt must be at least 30 characters.");
      return;
    }

    setPromptError(null);
    triggerInstance.submit({
      prompt,
      userId: user?.id || undefined,
    });
  };

  const isSubmitDisabled = prompt.length < 30 || prompt.length > 1000;
  const charCount = prompt.length;

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl mx-auto animate-fade-up">
        {!run && (
          <>
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/5 mb-5">
                <Telescope className="w-5 h-5 text-primary" strokeWidth={1.5} />
              </div>
              <h1 className="text-[28px] font-semibold tracking-tight text-foreground mb-2">
                What would you like to research?
              </h1>
              <p className="text-muted-foreground text-[15px] leading-relaxed max-w-md mx-auto">
                Describe a topic or question in detail. Our agent will synthesize sources, analyze findings, and deliver a comprehensive report.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Textarea
                  id="prompt"
                  placeholder="e.g., Analyze the impact of generative AI on software engineering workflows, including productivity metrics, code quality studies, and emerging best practices..."
                  className="min-h-[140px] resize-none bg-card border-border/80 text-[15px] leading-relaxed placeholder:text-muted-foreground/50 focus-visible:ring-primary/20 focus-visible:ring-offset-0 transition-shadow"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
                <div className="absolute bottom-3 right-3 text-xs text-muted-foreground tabular-nums">
                  {charCount}/1000
                </div>
              </div>

              {promptError && (
                <p className="text-sm font-medium text-destructive animate-fade-in">
                  {promptError}
                </p>
              )}

              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Minimum 30 characters required
                </p>
                <Button
                  type="submit"
                  disabled={isSubmitDisabled}
                  className="font-medium px-5"
                >
                  <Search className="w-4 h-4 mr-2" strokeWidth={1.5} />
                  Start Research
                </Button>
              </div>
            </form>
          </>
        )}

        {run && run.status !== "COMPLETED" && (
          <ProgressSection
            prompt={prompt}
            status={run?.status || " "}
            progress={progress}
            message={label}
          />
        )}

        {run && run.status === "COMPLETED" && (
          <div className="text-center space-y-6 animate-fade-up">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/5 mb-2">
              <FileText className="w-5 h-5 text-primary" strokeWidth={1.5} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight">Research Complete</h2>
              <p className="text-muted-foreground text-[15px] max-w-lg mx-auto leading-relaxed">
                Your report on <span className="text-foreground font-medium">&ldquo;{prompt}&rdquo;</span> is ready.
              </p>
            </div>
            <Button asChild className="font-medium px-5">
              <a
                href={`${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${pdfTitle}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FileText className="w-4 h-4 mr-2" strokeWidth={1.5} />
                View Report
              </a>
            </Button>
          </div>
        )}

        {run?.status === "FAILED" && (
          <div className="text-center space-y-4 animate-fade-up">
            <h2 className="text-xl font-semibold text-destructive">Research Failed</h2>
            <p className="text-muted-foreground text-[15px]">
              The research could not be completed. You can try again with a different prompt.
            </p>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="font-medium"
            >
              Try Again
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
