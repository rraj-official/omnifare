"use client";

import { AuthProvider } from "@/hooks/useAuth";
import { AppStateProvider } from "@/hooks/useAppState";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthModal } from "@/components/omni/AuthModal";
import { UsageLimitModal } from "@/components/omni/UsageLimitModal";
import { BudgetTracker } from "@/components/omni/BudgetTracker";
import { Navbar } from "@/components/omni/Navbar";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AppStateProvider>
        <TooltipProvider>
          <div className="flex min-h-screen flex-col bg-navy-950">
            <Navbar />
            <main className="flex-1">{children}</main>
            <footer className="border-t border-navy-700/50 bg-navy-950 py-6 text-center text-xs text-muted-foreground">
              <div className="mx-auto max-w-4xl px-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
                <span>© {new Date().getFullYear()} OmniFare. All rights reserved.</span>
                <span>Made with ❤️ by Rohit</span>
                <a
                  href="https://github.com/rraj-official"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  github.com/rraj-official
                </a>
              </div>
            </footer>
            <BudgetTracker />
            <AuthModal />
            <UsageLimitModal />
          </div>
        </TooltipProvider>
      </AppStateProvider>
    </AuthProvider>
  );
}
