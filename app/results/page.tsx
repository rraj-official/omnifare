"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { type Flight, airports, getCheapestPOS, convertCurrency, formatPrice } from "@/lib/mockFlights";
import { useAppState } from "@/hooks/useAppState";
import { SearchBar } from "@/components/omni/SearchBar";
import { FlightCard } from "@/components/omni/FlightCard";
import { ResultsFilter } from "@/components/omni/ResultsFilter";
import { CreditCard, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

// ── Helper: format "2025-2-1 08:34" → "8:34 AM" ─────────────

function fmtTime(raw: string): string {
  if (!raw) return "";
  const m = raw.match(/(\d{1,2}):(\d{2})(?:\s*(am|pm))?$/i);
  if (!m) return raw;
  let h = parseInt(m[1]);
  const min = m[2];
  const explicit = m[3]?.toUpperCase();
  if (explicit) return `${h}:${min} ${explicit}`;
  const ampm = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${min} ${ampm}`;
}

// ── Helper: minutes → "X hr Y min" ──────────────────────────

function fmtMins(mins: number): string {
  if (!mins) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

// ── Helper: "YYYY-MM-DD" → "Mon, Mar 17" ────────────────────

function fmtDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

// ── Map API response flight → Flight (mock interface) ────────

function mapApiToFlight(apiFlight: any, idx: number, date: string): Flight {
  const legs: any[] = apiFlight.legs ?? [];
  const firstLeg = legs[0] ?? {};
  const lastLeg = legs[legs.length - 1] ?? firstLeg;

  return {
    id: `live-${apiFlight.signature ?? idx}`,
    airline: apiFlight.airline ?? "Unknown",
    airlineLogo: apiFlight.airline_logo ?? "",
    departure: fmtTime(firstLeg.departureTime ?? ""),
    arrival: fmtTime(lastLeg.arrivalTime ?? ""),
    departureCode: firstLeg.departureCode ?? "",
    arrivalCode: lastLeg.arrivalCode ?? "",
    departureAirport: firstLeg.departureAirport ?? "",
    arrivalAirport: lastLeg.arrivalAirport ?? "",
    departureDate: fmtDate(date),
    duration: fmtMins(apiFlight.total_duration_minutes ?? 0),
    stops: apiFlight.stops ?? 0,
    co2Emissions: apiFlight.co2_kg ?? 0,
    cabinClass: "Economy",
    legs: legs.map((l: any) => ({
      departureTime: fmtTime(l.departureTime ?? ""),
      arrivalTime: fmtTime(l.arrivalTime ?? ""),
      departureAirport: l.departureAirport ?? "",
      departureCode: l.departureCode ?? "",
      arrivalAirport: l.arrivalAirport ?? "",
      arrivalCode: l.arrivalCode ?? "",
      duration: fmtMins(l.durationMinutes ?? 0),
      aircraft: l.aircraft ?? "",
      flightNumber: l.flightNumber ?? "",
    })),
    posOptions: (apiFlight.pos_options ?? []).map((opt: any) => ({
      countryCode: opt.country ?? "",
      countryName: opt.country_name ?? opt.country ?? "",
      flagEmoji: opt.flag_emoji ?? "🌐",
      price: opt.converted_price ?? 0,
      currency: apiFlight.user_currency ?? "USD",
      provider: opt.provider ?? opt.country ?? "Unknown",
      providerWebsite: opt.provider_website ?? undefined,
      bookingToken: opt.booking_token ?? undefined,
      riskLevel: (opt.risk_level ?? "low") as "low" | "medium",
    })),
    baggageInfo: { carryOn: true, checkedBag: false },
  };
}

// ── Skeleton loader ──────────────────────────────────────────

function FlightSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="animate-pulse rounded-xl border border-navy-700/50 bg-navy-900 p-5">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-navy-700" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 rounded bg-navy-700" />
              <div className="h-3 w-32 rounded bg-navy-800" />
            </div>
            <div className="h-6 w-24 rounded bg-navy-700" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────

function ResultsContent() {
  const searchParams = useSearchParams();
  const { preferredCurrency, noFxFeeCard, setNoFxFeeCard } = useAppState();
  const from = searchParams.get("from") ?? "DEL";
  const to = searchParams.get("to") ?? "BLR";
  const date = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);

  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [posStats, setPosStats] = useState<any>(null);

  const [stopsFilter, setStopsFilter] = useState("any");
  const [sortBy, setSortBy] = useState("price");
  const [airlineFilter, setAirlineFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("any");

  const fromAirport = airports.find((a) => a.code === from);
  const toAirport = airports.find((a) => a.code === to);

  const fetchFlights = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/geoarb/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: from,
          destination: to,
          date,
          user_currency: "INR",
          cabin_class: "economy",
          passengers: 1,
        }),
        signal,
      });

      if (signal?.aborted) return;

      const data = await res.json();

      if (!res.ok) {
        const msg = data.error ?? `Server error ${res.status}`;
        console.error("[OmniFare Results] API error:", data);
        setError(msg);
        return;
      }

      if (!data.flights || data.flights.length === 0) {
        console.warn("[OmniFare Results] No flights returned:", data);
        setError("No flights found for this route and date. Try a different date.");
        return;
      }

      console.log(`[OmniFare Results] Received ${data.flights.length} flights | source: ${data.source ?? data.cache}`);
      if (data.pos_stats) {
        console.log("[OmniFare Results] POS stats:", data.pos_stats);
        setPosStats(data.pos_stats);
      }

      const mapped = (data.flights as any[]).map((f, i) => mapApiToFlight(f, i, date));
      setFlights(mapped);

      try {
        sessionStorage.setItem("omnifare_flights", JSON.stringify(mapped));
      } catch {
        // sessionStorage may be unavailable in some contexts
      }
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      console.error("[OmniFare Results] Fetch failed:", err);
      setError("Failed to reach the flight search service. Please check your connection.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [from, to, date]);

  useEffect(() => {
    const ac = new AbortController();
    fetchFlights(ac.signal);
    return () => ac.abort();
  }, [fetchFlights]);

  const airlines = useMemo(() => [...new Set(flights.map((f) => f.airline))], [flights]);

  const filtered = useMemo(() => {
    let list = [...flights];

    if (stopsFilter !== "any") {
      if (stopsFilter === "0") list = list.filter((f) => f.stops === 0);
      else if (stopsFilter === "1") list = list.filter((f) => f.stops === 1);
      else list = list.filter((f) => f.stops >= 2);
    }

    if (airlineFilter !== "all") list = list.filter((f) => f.airline === airlineFilter);

    if (timeFilter !== "any") {
      list = list.filter((f) => {
        const m = f.departure.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (!m) return true;
        let h = parseInt(m[1]);
        const ap = m[3].toUpperCase();
        if (ap === "PM" && h !== 12) h += 12;
        if (ap === "AM" && h === 12) h = 0;
        if (timeFilter === "morning") return h >= 6 && h < 12;
        if (timeFilter === "afternoon") return h >= 12 && h < 18;
        if (timeFilter === "evening") return h >= 18 || h < 6;
        return true;
      });
    }

    if (sortBy === "price") list.sort((a, b) => getCheapestPOS(a).price - getCheapestPOS(b).price);
    else if (sortBy === "duration") {
      list.sort((a, b) => {
        const p = (d: string) => {
          const h = d.match(/(\d+)\s*hr/)?.[1] ?? "0";
          const m2 = d.match(/(\d+)\s*min/)?.[1] ?? "0";
          return parseInt(h) * 60 + parseInt(m2);
        };
        return p(a.duration) - p(b.duration);
      });
    } else if (sortBy === "emissions") {
      list.sort((a, b) => a.co2Emissions - b.co2Emissions);
    }

    return list;
  }, [flights, stopsFilter, sortBy, airlineFilter, timeFilter]);

  const cheapestOverall = useMemo(() => {
    if (filtered.length === 0) return 0;
    return Math.min(...filtered.map((f) => getCheapestPOS(f).price));
  }, [filtered]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <SearchBar compact />

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6">
        <h1 className="text-xl font-semibold text-white">
          {fromAirport?.city ?? from} → {toAirport?.city ?? to}
        </h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Prices include required taxes + fees for 1 adult.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        className="mt-4 flex flex-wrap items-center justify-between gap-3"
      >
        <ResultsFilter
          stopsFilter={stopsFilter} setStopsFilter={setStopsFilter}
          sortBy={sortBy} setSortBy={setSortBy}
          airlineFilter={airlineFilter} setAirlineFilter={setAirlineFilter}
          airlines={airlines}
          timeFilter={timeFilter} setTimeFilter={setTimeFilter}
        />

        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-navy-700 bg-navy-800 px-3 py-1.5 text-xs transition-colors hover:border-electric/30">
          <input
            type="checkbox"
            checked={noFxFeeCard}
            onChange={(e) => setNoFxFeeCard(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-navy-600 bg-navy-700 accent-electric"
          />
          <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">I have a no FX fee card</span>
        </label>
      </motion.div>

      {loading ? (
        <div className="mt-6">
          <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-3 w-3 animate-spin rounded-full border border-electric border-t-transparent" />
            Searching {from} → {to} across multiple countries…
          </div>
          <FlightSkeleton />
        </div>
      ) : error ? (
        <div className="mt-10 flex flex-col items-center gap-4 text-center">
          <AlertCircle className="h-12 w-12 text-danger/60" />
          <p className="text-base text-muted-foreground">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-navy-700 text-white hover:bg-navy-800"
            onClick={() => fetchFlights()}
          >
            <RefreshCw className="h-4 w-4" /> Retry
          </Button>
        </div>
      ) : (
        <>
          {posStats && (posStats.failed > 0) && (
            <div className="mt-4 rounded-lg border border-warning/20 bg-warning/5 px-3 py-2 text-xs text-warning">
              {posStats.failed} POS source{posStats.failed > 1 ? "s" : ""} unavailable ({posStats.failed_countries?.map((f: any) => f.country ?? f).join(", ")}). Results may be incomplete.
            </div>
          )}

          <div className="mt-4 text-sm text-muted-foreground">
            Cheapest from{" "}
            <span className="font-semibold text-white">
              {formatPrice(convertCurrency(cheapestOverall, preferredCurrency), preferredCurrency)}
            </span>
          </div>

          <div className="mt-4 mb-2">
            <h2 className="text-base font-semibold text-white">All flights</h2>
            <p className="text-xs text-muted-foreground">
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="space-y-3 pb-20">
            {filtered.map((flight, i) => (
              <motion.div
                key={flight.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.04 }}
              >
                <FlightCard flight={flight} />
              </motion.div>
            ))}
            {filtered.length === 0 && (
              <div className="py-16 text-center text-muted-foreground">
                No flights match your filters. Try adjusting your search criteria.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-electric border-t-transparent" />
      </div>
    }>
      <ResultsContent />
    </Suspense>
  );
}
