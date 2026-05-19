"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Telescope,
  ArrowRight,
  MessageSquare,
  Search,
  FileText,
  CheckCircle2,
  Mail,
} from "lucide-react";
import { useState } from "react";

export function LandingPage() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.length > 5 && email.includes("@")) {
      setSubscribed(true);
      setEmail("");
    }
  };

  return (
    <div className="flex-1">
      {/* Hero */}
      <section className="px-6 pt-16 pb-20">
        <div className="max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10 text-xs font-medium text-primary mb-8">
            <Telescope className="w-3.5 h-3.5" strokeWidth={1.5} />
            AI-Powered Research Reports
          </div>
          <h1 className="text-[32px] sm:text-[40px] font-semibold tracking-tight leading-[1.15] text-foreground mb-5">
            Publication-grade research reports{" "}
            <span className="text-muted-foreground">in minutes, not hours.</span>
          </h1>
          <p className="text-[17px] text-muted-foreground leading-relaxed max-w-lg mb-8">
            Enter any topic. We source, verify, and synthesize a comprehensive
            report with citations — delivered as a shareable PDF. No search
            fatigue, no paywalled sources, no writer's block.
          </p>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-10">
            <Button asChild size="lg" className="font-medium px-6 h-11">
              <Link href="/research">
                Try 3 reports free
                <ArrowRight className="w-4 h-4 ml-2" strokeWidth={1.5} />
              </Link>
            </Button>
            <Link
              href="/pricing"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              See pricing →
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
              No credit card required
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
              Citation-backed sources
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
              Instant PDF delivery
            </span>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-16 border-t border-border/40">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
            How it works
          </p>
          <h2 className="text-2xl font-semibold tracking-tight mb-10">
            From question to report in three steps
          </h2>
          <div className="space-y-8">
            {[
              {
                icon: MessageSquare,
                title: "Describe what you need",
                description:
                  "Enter any topic, question, or problem. Our AI asks clarifying questions to narrow the scope and focus on what matters.",
              },
              {
                icon: Search,
                title: "We research across the web",
                description:
                  "Our agent searches, cross-references, and evaluates source quality in real time — going multiple levels deep to find the best information.",
              },
              {
                icon: FileText,
                title: "Receive your PDF report",
                description:
                  "Get a beautifully formatted report with executive summary, structured findings, and full citations. Download or share instantly.",
              },
            ].map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="flex gap-5">
                  <div className="flex flex-col items-center">
                    <div className="w-9 h-9 rounded-full bg-primary/5 flex items-center justify-center flex-shrink-0">
                      <Icon
                        className="w-4 h-4 text-primary"
                        strokeWidth={1.5}
                      />
                    </div>
                    {i < 2 && (
                      <div className="w-px flex-1 bg-border/60 my-2" />
                    )}
                  </div>
                  <div className="pb-6">
                    <h3 className="font-semibold text-[15px] mb-1">
                      {step.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Social proof / trust */}
      <section className="px-6 py-16 border-t border-border/40 bg-muted/20">
        <div className="max-w-2xl mx-auto">
          <div className="grid sm:grid-cols-3 gap-8 text-center">
            <div>
              <p className="text-3xl font-semibold tracking-tight text-foreground">
                5 levels
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Of recursive research depth
              </p>
            </div>
            <div>
              <p className="text-3xl font-semibold tracking-tight text-foreground">
                10 sources
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Searched in parallel per level
              </p>
            </div>
            <div>
              <p className="text-3xl font-semibold tracking-tight text-foreground">
                PDF
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Formatted, cited, shareable
              </p>
            </div>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
              Source quality scoring
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
              Automatic deduplication
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
              Clarifying questions
            </span>
          </div>
        </div>
      </section>

      {/* Email capture */}
      <section className="px-6 py-16 border-t border-border/40">
        <div className="max-w-md mx-auto text-center">
          <h2 className="text-xl font-semibold tracking-tight mb-2">
            Research tips in your inbox
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Get weekly insights on better research workflows — no spam, unsubscribe anytime.
          </p>
          {subscribed ? (
            <div className="rounded-lg border bg-card p-4 inline-flex items-center gap-2 text-sm font-medium text-primary">
              <CheckCircle2 className="w-4 h-4" strokeWidth={1.5} />
              You are on the list. Thanks!
            </div>
          ) : (
            <form
              onSubmit={handleSubscribe}
              className="flex gap-2"
            >
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                <input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 pl-9 pr-4 rounded-md border border-border/80 bg-card text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-shadow"
                />
              </div>
              <Button type="submit" size="sm" className="font-medium h-10 px-4">
                Subscribe
              </Button>
            </form>
          )}
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 py-16 border-t border-border/40">
        <div className="max-w-2xl mx-auto text-center space-y-5">
          <h2 className="text-2xl font-semibold tracking-tight">
            Start your first report today
          </h2>
          <p className="text-muted-foreground text-[15px] max-w-md mx-auto leading-relaxed">
            Three free credits. No credit card. See what deep research feels like when the machine does the heavy lifting.
          </p>
          <Button asChild size="lg" className="font-medium px-6 h-11">
            <Link href="/research">
              Try it free
              <ArrowRight className="w-4 h-4 ml-2" strokeWidth={1.5} />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
