"use client";

import { Button } from "@/components/ui/button";
import { FileText, Sparkles, ArrowRight } from "lucide-react";

interface ResearchCompleteProps {
  prompt: string;
  pdfUrl: string;
  onNewResearch: () => void;
}

export function ResearchComplete({ prompt, pdfUrl, onNewResearch }: ResearchCompleteProps) {
  return (
    <div className="w-full max-w-2xl mx-auto animate-fade-up space-y-8">
      <div className="text-center space-y-4">
        <div className="relative inline-flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" style={{ animationDuration: '2s' }} />
          <div className="relative inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/5">
            <Sparkles className="w-6 h-6 text-primary" strokeWidth={1.5} />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">Your report is ready</h2>
          <p className="text-muted-foreground text-[15px] max-w-lg mx-auto leading-relaxed">
            We have synthesized sources, cross-checked findings, and formatted a comprehensive report on{" "}
            <span className="text-foreground font-medium">&ldquo;{prompt}&rdquo;</span>.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Button asChild className="font-medium px-6 h-11">
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <FileText className="w-4 h-4 mr-2" strokeWidth={1.5} />
            View Report
            <ArrowRight className="w-4 h-4 ml-2" strokeWidth={1.5} />
          </a>
        </Button>
        <Button
          variant="ghost"
          onClick={onNewResearch}
          className="font-medium h-11"
        >
          Start New Research
        </Button>
      </div>

      <div className="rounded-xl border bg-card p-5 space-y-3 max-w-md mx-auto">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          What is inside
        </p>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="w-1 h-1 rounded-full bg-primary mt-2 flex-shrink-0" />
            Executive summary with key findings
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1 h-1 rounded-full bg-primary mt-2 flex-shrink-0" />
            Source citations and quality assessment
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1 h-1 rounded-full bg-primary mt-2 flex-shrink-0" />
            Structured analysis with visual hierarchy
          </li>
        </ul>
      </div>
    </div>
  );
}
