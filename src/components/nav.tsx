"use client";

import { Button } from "@/components/ui/button";
import { SignInButton, SignOutButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { Telescope, LayoutDashboard } from "lucide-react";

export function Nav() {
  const { isSignedIn, user } = useUser();

  return (
    <nav className="border-b border-border/60">
      <div className="max-w-3xl mx-auto px-6 py-5">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-70 transition-opacity duration-200">
            <Telescope className="w-5 h-5 text-primary" strokeWidth={1.5} />
            <span className="font-semibold text-[15px] tracking-tight">Deep Research</span>
          </Link>

          <div className="flex items-center gap-1">
            {isSignedIn ? (
              <>
                <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-white font-normal">
                  <Link href="/dashboard" className="flex items-center gap-2">
                    <LayoutDashboard className="w-4 h-4" strokeWidth={1.5} />
                    Dashboard
                  </Link>
                </Button>
                <div className="h-4 w-px bg-border mx-2" />
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  {user?.firstName || user?.emailAddresses[0]?.emailAddress}
                </span>
                <SignOutButton>
                  <Button variant="ghost" size="sm" className="ml-4 text-muted-foreground hover:text-white font-normal">
                    Sign Out
                  </Button>
                </SignOutButton>
              </>
            ) : (
              <SignInButton>
                <Button size="sm" className="font-medium">Sign In</Button>
              </SignInButton>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
