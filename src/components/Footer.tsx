"use client";

import Link from "next/link";
import { Telescope } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Telescope className="w-4 h-4 text-primary" strokeWidth={1.5} />
            <span className="text-sm font-medium tracking-tight">Deep Research</span>
          </div>
          <nav className="flex items-center gap-6">
            <Link
              href="/pricing"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/research"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Research
            </Link>
            <span className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()}
            </span>
          </nav>
        </div>
      </div>
    </footer>
  );
}
