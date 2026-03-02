"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState, useEffect } from "react";
import { type Flight } from "@/lib/mockFlights";
import { BookingProviders, type POSOptionBrief } from "@/components/omni/BookingProviders";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle, Clock, Leaf, Briefcase, Luggage, BaggageClaim } from "lucide-react";
import { motion } from "framer-motion";

function AirlineLogoSmall({ airline, airlineLogo }: { airline: string; airlineLogo: string }) {
  const [imgError, setImgError] = useState(false);
  if (airlineLogo && (airlineLogo.startsWith("http") || airlineLogo.startsWith("/")) && !imgError) {
    return (
      <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-white">
        <img src={airlineLogo} alt={airline} className="h-6 w-6 object-contain" onError={() => setImgError(true)} />
      </div>
    );
  }
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-electric/20 text-xs font-bold text-electric">
      {airline.slice(0, 2).toUpperCase()}
    </div>
  );
}

function BookingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const flightId = searchParams.get("id");

  const [flight, setFlight] = useState<Flight | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Load flight from sessionStorage
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
        <Button onClick={() => router.back()} variant="ghost" size="sm"
          className="gap-1.5 text-muted-foreground hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to results
        </Button>
      </motion.div>

      {/* Flight summary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 rounded-xl border border-navy-700/50 bg-navy-900 p-5"
      >
        <h1 className="mb-1 text-xl font-semibold text-white">
          {flight.departureCode} → {flight.arrivalCode}
        </h1>
        <p className="mb-4 text-sm text-muted-foreground">
          One way · {flight.cabinClass} · 1 passenger · {flight.departureDate}
        </p>

        <div className="rounded-lg border border-navy-700/50 bg-navy-800/50 p-4">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <AirlineLogoSmall airline={flight.airline} airlineLogo={flight.airlineLogo} />
              <span className="text-sm text-muted-foreground">{flight.airline}</span>
            </div>
            <div className="text-sm font-medium text-white">
              {flight.departure} – {flight.arrival}
            </div>
            <div className="flex items-center gap-1.5 text-sm text-white">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              {flight.duration}
            </div>
            <div className={`text-sm ${flight.stops === 0 ? "text-success" : "text-warning"}`}>
              {flight.stops === 0 ? "Direct" : `${flight.stops} stop${flight.stops > 1 ? "s" : ""}`}
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Leaf className="h-3.5 w-3.5" />
              {flight.co2Emissions} kg CO₂e
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          {flight.baggageInfo.carryOn && (
            <span className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5" /> 1 free carry-on</span>
          )}
          {flight.baggageInfo.checkedBag && (
            <span className="flex items-center gap-1.5"><Luggage className="h-3.5 w-3.5" /> 1st checked bag free</span>
          )}
          {!flight.baggageInfo.checkedBag && (
            <span className="flex items-center gap-1.5 text-warning">
              <BaggageClaim className="h-3.5 w-3.5" /> No free checked bag
            </span>
          )}
        </div>
      </motion.div>

      {/* Booking providers from API — passes all POS tokens for geo-arb multi-country lookup */}
      <BookingProviders
        posOptions={(flight.posOptions as unknown as POSOptionBrief[])}
      />

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
