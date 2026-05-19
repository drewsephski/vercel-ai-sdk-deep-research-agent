"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Zap, ArrowRight, FileText } from "lucide-react";
import Link from "next/link";

interface PaywallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PaywallModal({ open, onOpenChange }: PaywallModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/5 flex items-center justify-center mb-2">
            <Zap className="w-5 h-5 text-primary" strokeWidth={1.5} />
          </div>
          <DialogTitle className="text-center text-xl">
            Your trial is complete
          </DialogTitle>
          <DialogDescription className="text-center">
            You have used all 3 free research credits. Upgrade to unlock deeper research, more sources, and unlimited sessions.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <div className="flex items-start gap-3">
              <FileText className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" strokeWidth={1.5} />
              <div>
                <p className="text-sm font-medium">Deeper analysis</p>
                <p className="text-xs text-muted-foreground">Up to 5 levels of follow-up research</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <FileText className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" strokeWidth={1.5} />
              <div>
                <p className="text-sm font-medium">More sources</p>
                <p className="text-xs text-muted-foreground">Up to 10 parallel searches per level</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <FileText className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" strokeWidth={1.5} />
              <div>
                <p className="text-sm font-medium">Unlimited reports</p>
                <p className="text-xs text-muted-foreground">Generate as many PDFs as you need</p>
              </div>
            </div>
          </div>
          <div className="grid gap-3">
            <Link href="/pricing" onClick={() => onOpenChange(false)}>
              <Button className="w-full font-medium" variant="default">
                View Plans
                <ArrowRight className="w-4 h-4 ml-2" strokeWidth={1.5} />
              </Button>
            </Link>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => onOpenChange(false)}
            >
              Maybe Later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
