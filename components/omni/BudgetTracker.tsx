"use client";

import { useState } from "react";
import { Info, X, Infinity } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";

export function BudgetTracker() {
  const [showTooltip, setShowTooltip] = useState(false);
  const { isLoggedIn, apiCallsMade, maxApiLimit, isUnlimited } = useAuth();

  if (!isLoggedIn) return null;

  const used = isUnlimited ? 0 : Math.min(100, Math.round((apiCallsMade / maxApiLimit) * 100));
  const strokeColor = used >= 90 ? "#ef4444" : used >= 70 ? "#f59e0b" : "#3b82f6";

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="fixed bottom-6 right-6 z-50"
    >
      <div className="flex items-center gap-3 rounded-xl border border-navy-700 bg-navy-900/95 px-4 py-3 shadow-2xl backdrop-blur-sm">
        <div className="relative h-10 w-10">
          {isUnlimited ? (
            <div className="flex h-10 w-10 items-center justify-center">
              <Infinity className="h-6 w-6 text-electric" />
            </div>
          ) : (
            <>
              <svg className="h-10 w-10 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(59,130,246,0.15)" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15.5" fill="none"
                  stroke={strokeColor} strokeWidth="3"
                  strokeDasharray={`${used} ${100 - used}`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
                {used}%
              </span>
            </>
          )}
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-medium text-white">
            {isUnlimited ? "Unlimited" : "Usage"}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {isUnlimited ? "Pro access" : `${apiCallsMade}/${maxApiLimit}`}
          </span>
        </div>
        <div
          className="relative ml-1"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <button className="cursor-pointer text-muted-foreground transition-colors hover:text-electric">
            <Info className="h-3.5 w-3.5" />
          </button>

          <AnimatePresence>
            {showTooltip && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="absolute bottom-full right-0 mb-2 w-64 rounded-lg border border-navy-700 bg-navy-800 p-3 shadow-xl"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    This is a passion project built using free-tier APIs with limited resources. Usage resets monthly.
                  </p>
                  <button
                    onClick={() => setShowTooltip(false)}
                    className="shrink-0 cursor-pointer text-muted-foreground hover:text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
