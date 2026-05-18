"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CreditCard, Zap, Crown } from "lucide-react";
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
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Free Credits Exhausted
          </DialogTitle>
          <DialogDescription>
            You've used all 3 of your free research credits. Upgrade to a paid plan to continue your research.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid gap-3">
            <Link href="/pricing" onClick={() => onOpenChange(false)}>
              <Button className="w-full" variant="default">
                <Zap className="w-4 h-4 mr-2" />
                View Plans
              </Button>
            </Link>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => onOpenChange(false)}
            >
              Maybe Later
            </Button>
          </div>
          <div className="text-center text-sm text-muted-foreground">
            <p>Choose the plan that fits your research needs</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
