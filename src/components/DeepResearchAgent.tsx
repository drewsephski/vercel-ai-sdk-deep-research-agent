"use client";

import { ClarifyingChat } from "@/components/ClarifyingChat";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ProgressSection } from "@/components/progress-section";
import { PaywallModal } from "@/components/PaywallModal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useRealtimeTaskTrigger } from "@trigger.dev/react-hooks";
import { Search, Telescope, FileText, Layers, GitBranch, CreditCard } from "lucide-react";
import { useState, useEffect } from "react";
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

type Phase = "input" | "clarify" | "research";

interface Subscription {
  plan: string;
  maxDepth: number;
  maxBreadth: number;
  sessionsUsed: number;
  sessionsLimit: number | null;
}

export function DeepResearchAgent({ triggerToken }: { triggerToken: string }) {
  const { user } = useUser();
  const [prompt, setPrompt] = useState("");
  const [promptError, setPromptError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("input");
  const [refinedPrompt, setRefinedPrompt] = useState("");
  const [depth, setDepth] = useState([2]);
  const [breadth, setBreadth] = useState([2]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [freeCredits, setFreeCredits] = useState<number | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);

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

  // Fetch subscription data on mount
  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      
      try {
        // Fetch subscription
        const subResponse = await fetch('/api/subscription');
        const subData = await subResponse.json();
        
        if (subData.subscription) {
          setSubscription(subData.subscription);
          // Set depth/breadth to plan defaults if they exceed limits
          if (subData.subscription.maxDepth < depth[0]) {
            setDepth([subData.subscription.maxDepth]);
          }
          if (subData.subscription.maxBreadth < breadth[0]) {
            setBreadth([subData.subscription.maxBreadth]);
          }
        } else {
          // Fetch free credits if no subscription
          const creditsResponse = await fetch('/api/user/credits');
          const creditsData = await creditsResponse.json();
          setFreeCredits(creditsData.freeCredits);
          
          // Free tier limits (depth 1, breadth 2)
          setDepth([1]);
          setBreadth([2]);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setSubscriptionLoading(false);
      }
    }

    fetchData();
  }, [user]);

  // Update depth/breadth when subscription changes
  useEffect(() => {
    if (subscription) {
      if (subscription.maxDepth < depth[0]) {
        setDepth([subscription.maxDepth]);
      }
      if (subscription.maxBreadth < breadth[0]) {
        setBreadth([subscription.maxBreadth]);
      }
    }
  }, [subscription]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (prompt.length < 30) {
      setPromptError("Research prompt must be at least 30 characters.");
      return;
    }

    // Check if user has free credits if not subscribed
    if (!subscription && freeCredits !== null && freeCredits <= 0) {
      setShowPaywall(true);
      return;
    }

    setPromptError(null);
    setPhase("clarify");
  };

  const handleResearchStart = (refined: string, _focusAreas: string[]) => {
    setRefinedPrompt(refined);
    setPhase("research");
    triggerInstance.submit({
      prompt: refined,
      userId: user?.id || undefined,
      depth: depth[0],
      breadth: breadth[0],
    });
  };

  const handleBack = () => {
    setPhase("input");
  };

  const isSubmitDisabled = prompt.length < 30 || prompt.length > 1000;
  const charCount = prompt.length;
  const displayPrompt = refinedPrompt || prompt;

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl mx-auto animate-fade-up">
        {phase === "input" && (
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

            <form onSubmit={handleSubmit} className="space-y-6">
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

              {/* Depth and Breadth Sliders */}
              {!subscriptionLoading && subscription && (
                <div className="space-y-5 p-4 rounded-lg bg-muted/30 border border-border/50">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {subscription.plan === 'starter' && 'Starter Plan'}
                      {subscription.plan === 'pro' && 'Pro Plan'}
                      {subscription.plan === 'power' && 'Power Plan'}
                    </span>
                    {subscription.sessionsLimit && (
                      <span className="text-muted-foreground">
                        {subscription.sessionsUsed}/{subscription.sessionsLimit} sessions used
                      </span>
                    )}
                    {!subscription.sessionsLimit && (
                      <span className="text-muted-foreground">Unlimited sessions</span>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="depth" className="text-sm flex items-center gap-2">
                          <Layers className="w-4 h-4" />
                          Depth: {depth[0]}
                        </Label>
                        <span className="text-xs text-muted-foreground">
                          Max: {subscription.maxDepth}
                        </span>
                      </div>
                      <Slider
                        id="depth"
                        min={1}
                        max={subscription.maxDepth}
                        step={1}
                        value={depth}
                        onValueChange={setDepth}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">
                        How deep to research (levels of follow-up queries)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="breadth" className="text-sm flex items-center gap-2">
                          <GitBranch className="w-4 h-4" />
                          Breadth: {breadth[0]}
                        </Label>
                        <span className="text-xs text-muted-foreground">
                          Max: {subscription.maxBreadth}
                        </span>
                      </div>
                      <Slider
                        id="breadth"
                        min={1}
                        max={subscription.maxBreadth}
                        step={1}
                        value={breadth}
                        onValueChange={setBreadth}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">
                        How many parallel searches per level
                      </p>
                    </div>
                  </div>

                  {subscription.plan === 'starter' && (
                    <div className="text-xs text-muted-foreground text-center">
                      <a href="/pricing" className="text-primary hover:underline">
                        Upgrade to Pro for deeper research
                      </a>
                    </div>
                  )}
                </div>
              )}

              {promptError && (
                <p className="text-sm font-medium text-destructive animate-fade-in">
                  {promptError}
                </p>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <p className="text-sm text-muted-foreground">
                    Minimum 30 characters required
                  </p>
                  {freeCredits !== null && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                      <CreditCard className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
                      <span className="text-xs font-medium text-primary">
                        {freeCredits} free credits
                      </span>
                    </div>
                  )}
                </div>
                <Button
                  type="submit"
                  disabled={isSubmitDisabled || subscriptionLoading}
                  className="font-medium px-5"
                >
                  <Search className="w-4 h-4 mr-2" strokeWidth={1.5} />
                  Continue
                </Button>
              </div>
            </form>
          </>
        )}

        {phase === "clarify" && (
          <ErrorBoundary>
            <ClarifyingChat
              initialPrompt={prompt}
              onResearchStart={handleResearchStart}
              onBack={handleBack}
            />
          </ErrorBoundary>
        )}

        {phase === "research" && run && run.status !== "COMPLETED" && (
          <ProgressSection
            prompt={displayPrompt}
            status={run?.status || " "}
            progress={progress}
            message={label}
          />
        )}

        {phase === "research" && run && run.status === "COMPLETED" && (
          <div className="text-center space-y-6 animate-fade-up">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/5 mb-2">
              <FileText className="w-5 h-5 text-primary" strokeWidth={1.5} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight">Research Complete</h2>
              <p className="text-muted-foreground text-[15px] max-w-lg mx-auto leading-relaxed">
                Your report on <span className="text-foreground font-medium">&ldquo;{displayPrompt}&rdquo;</span> is ready.
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

        {phase === "research" && run?.status === "FAILED" && (
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

        <PaywallModal open={showPaywall} onOpenChange={setShowPaywall} />
      </div>
    </div>
  );
}
