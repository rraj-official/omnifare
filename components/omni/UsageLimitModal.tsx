"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { AlertTriangle, Mail } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function UsageLimitModal() {
  const { showUsageLimitModal, setShowUsageLimitModal, apiCallsMade, maxApiLimit } = useAuth();

  return (
    <Dialog open={showUsageLimitModal} onOpenChange={setShowUsageLimitModal}>
      <DialogContent className="border-navy-700 bg-navy-900 sm:max-w-md">
        <AnimatePresence>
          {showUsageLimitModal && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <DialogHeader className="items-center text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-warning/10">
                  <AlertTriangle className="h-8 w-8 text-warning" />
                </div>
                <DialogTitle className="text-2xl text-white">
                  Usage Limit Reached
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  You have used all {maxApiLimit} of your free-tier API searches
                  ({apiCallsMade}/{maxApiLimit}). This is a passion project running
                  on limited free-tier resources.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-6 space-y-3">
                <p className="text-center text-sm text-muted-foreground">
                  Usage resets at the start of each month. For extended access,
                  please reach out.
                </p>
                <Button
                  onClick={() => {
                    window.location.href = "mailto:rraj.official5@gmail.com?subject=OmniFare%20Usage%20Limit";
                  }}
                  className="flex h-12 w-full items-center justify-center gap-3 rounded-lg bg-electric text-white hover:bg-electric-dark"
                >
                  <Mail className="h-5 w-5" />
                  Request More Access
                </Button>
                <Button
                  onClick={() => setShowUsageLimitModal(false)}
                  variant="outline"
                  className="w-full border-navy-700 text-muted-foreground hover:text-white"
                >
                  Close
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
