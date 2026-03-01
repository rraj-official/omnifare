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
            <BudgetTracker />
            <AuthModal />
            <UsageLimitModal />
          </div>
        </TooltipProvider>
      </AppStateProvider>
    </AuthProvider>
  );
}
