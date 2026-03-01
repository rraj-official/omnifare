"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState, useEffect } from "react";
import { type Flight } from "@/lib/mockFlights";
import { POSTable } from "@/components/omni/POSTable";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

function BookingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const flightId = searchParams.get("id");

  const [flight, setFlight] = useState<Flight | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!flightId) { setNotFound(true); return; }

    try {
      const raw = sessionStorage.getItem("omnifare_flights");
      if (raw) {
        const flights: Flight[] = JSON.parse(raw);
        const found = flights.find((f) => f.id === flightId);
        if (found) { setFlight(found); return; }
      }
    } catch (err) {
      console.error("[OmniFare Booking] Failed to read from sessionStorage:", err);
    }

    console.warn(`[OmniFare Booking] Flight not found in session: id=${flightId}`);
    setNotFound(true);
  }, [flightId]);

  if (notFound) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <AlertCircle className="h-12 w-12 text-danger/60" />
        <p className="text-lg text-muted-foreground">Flight details not found.</p>
        <p className="text-xs text-muted-foreground">Your session may have expired. Please search again.</p>
        <Button onClick={() => router.push("/")} variant="outline" className="border-navy-700">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Search
        </Button>
      </div>
    );
  }

  if (!flight) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-electric border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6">
        <Button
          onClick={() => router.back()}
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to results
        </Button>
      </motion.div>

      <POSTable flight={flight} />

      <div className="h-24" />
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-electric border-t-transparent" />
      </div>
    }>
      <BookingContent />
    </Suspense>
  );
}
