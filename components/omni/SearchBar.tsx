"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/hooks/useAppState";
import { useAuth } from "@/hooks/useAuth";
import { airports } from "@/lib/mockFlights";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PriceCalendar } from "@/components/omni/PriceCalendar";
import {
  Search, ArrowLeftRight, CalendarDays, Users, ChevronDown,
  MapPin, CircleDot, Armchair,
} from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

export function SearchBar({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const { isLoggedIn, setShowAuthModal } = useAuth();
  const {
    origin, setOrigin,
    destination, setDestination,
    departureDate, setDepartureDate,
    returnDate, setReturnDate,
    passengers, setPassengers,
    cabinClass, setCabinClass,
    tripType, setTripType,
  } = useAppState();

  const [originOpen, setOriginOpen] = useState(false);
  const [destOpen, setDestOpen] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [calendarPrices, setCalendarPrices] = useState<Record<string, number>>({});
  const [loadingPrices, setLoadingPrices] = useState(false);
  const calendarFetchRef = useRef<AbortController | null>(null);

  // Fetch real calendar prices when both origin + destination are set
  useEffect(() => {
    if (!origin || !destination) { setCalendarPrices({}); return; }
    if (calendarFetchRef.current) calendarFetchRef.current.abort();
    const ac = new AbortController();
    calendarFetchRef.current = ac;
    setLoadingPrices(true);
    fetch("/api/geoarb/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ origin, destination }),
      signal: ac.signal,
    })
      .then((r) => r.json())
      .then((data: { prices?: Record<string, number>; days?: Array<{ date: string; price?: number | null; cheapest_price?: number | null }> }) => {
        if (ac.signal.aborted) return;
        if (data.prices) { setCalendarPrices(data.prices); return; }
        if (data.days) {
          const map: Record<string, number> = {};
          for (const d of data.days) {
            const p = d.cheapest_price ?? d.price;
            if (p) map[d.date] = p;
          }
          setCalendarPrices(map);
        }
      })
      .catch(() => {/* silently ignore — calendar is optional */})
      .finally(() => { if (!ac.signal.aborted) setLoadingPrices(false); });
    return () => ac.abort();
  }, [origin, destination]);

  const handleSearch = () => {
    if (!origin && !destination) {
      setValidationError("Please select both origin and destination");
      return;
    }
    if (!origin) {
      setValidationError("Please select an origin airport");
      return;
    }
    if (!destination) {
      setValidationError("Please select a destination airport");
      return;
    }
    setValidationError("");
    if (!isLoggedIn) {
      setShowAuthModal(true);
      return;
    }
    const dateStr = departureDate ? format(departureDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
    router.push(`/results?from=${origin}&to=${destination}&date=${dateStr}`);
  };

  const swapAirports = () => {
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
  };

  const originAirport = airports.find((a) => a.code === origin);
  const destAirport = airports.find((a) => a.code === destination);
  const showPriceGrid = !!(origin && destination);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.5 }}
      className={`mx-auto w-full max-w-5xl px-4 sm:px-6 ${compact ? "" : "-mt-8 relative z-20"}`}
    >
      <div className="rounded-xl border border-navy-700/50 bg-navy-900/95 p-4 shadow-2xl backdrop-blur-sm sm:p-6">
        {/* Trip controls row */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Select value={tripType} onValueChange={setTripType}>
            <SelectTrigger className="h-8 w-[140px] border-navy-700 bg-navy-800 text-sm">
              <ArrowLeftRight className="mr-1.5 h-3.5 w-3.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-navy-700 bg-navy-800">
              <SelectItem value="one-way">One way</SelectItem>
              <SelectItem value="round-trip">Round trip</SelectItem>
              <SelectItem value="multi-city">Multi-city</SelectItem>
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 border-navy-700 bg-navy-800 text-sm">
                <Users className="mr-1.5 h-3.5 w-3.5" />
                {passengers}
                <ChevronDown className="ml-1 h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 border-navy-700 bg-navy-800 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Passengers</span>
                <div className="flex items-center gap-2">
                  <Button size="icon-xs" variant="outline" className="border-navy-600" onClick={() => setPassengers(Math.max(1, passengers - 1))}>-</Button>
                  <span className="w-6 text-center text-sm font-medium">{passengers}</span>
                  <Button size="icon-xs" variant="outline" className="border-navy-600" onClick={() => setPassengers(Math.min(9, passengers + 1))}>+</Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Select value={cabinClass} onValueChange={setCabinClass}>
            <SelectTrigger className="h-8 w-[150px] border-navy-700 bg-navy-800 text-sm">
              <Armchair className="mr-1.5 h-3.5 w-3.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-navy-700 bg-navy-800">
              <SelectItem value="economy">Economy</SelectItem>
              <SelectItem value="premium">Premium Economy</SelectItem>
              <SelectItem value="business">Business</SelectItem>
              <SelectItem value="first">First</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Main search row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
          {/* Origin + Destination */}
          <div className="relative flex flex-1 flex-col gap-3 sm:flex-row sm:gap-0">
            <Popover open={originOpen} onOpenChange={setOriginOpen}>
              <PopoverTrigger asChild>
                <button className="flex h-14 flex-1 items-center gap-3 rounded-lg border border-navy-700 bg-navy-800 px-4 text-left transition-colors hover:border-electric/40 sm:rounded-r-none sm:border-r-0">
                  <CircleDot className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    {originAirport ? (
                      <>
                        <div className="text-sm font-medium text-white">{originAirport.city}</div>
                        <div className="truncate text-xs text-muted-foreground">{originAirport.code}</div>
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground">Where from?</span>
                    )}
                  </div>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] border-navy-700 bg-navy-800 p-2" align="start">
                {airports.map((a) => (
                  <button
                    key={a.code}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-navy-700"
                    onClick={() => { setOrigin(a.code); setOriginOpen(false); setValidationError(""); }}
                  >
                    <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium text-white">{a.city} <span className="text-muted-foreground">{a.code}</span></div>
                      <div className="text-xs text-muted-foreground">{a.country}</div>
                    </div>
                  </button>
                ))}
              </PopoverContent>
            </Popover>

            <button
              onClick={swapAirports}
              className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-navy-600 bg-navy-900 p-2 transition-colors hover:bg-navy-700 sm:relative sm:left-auto sm:top-auto sm:translate-x-0 sm:translate-y-0 sm:self-center sm:-mx-3"
            >
              <ArrowLeftRight className="h-4 w-4 text-electric" />
            </button>

            <Popover open={destOpen} onOpenChange={setDestOpen}>
              <PopoverTrigger asChild>
                <button className="flex h-14 flex-1 items-center gap-3 rounded-lg border border-navy-700 bg-navy-800 px-4 text-left transition-colors hover:border-electric/40 sm:rounded-l-none">
                  <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    {destAirport ? (
                      <>
                        <div className="text-sm font-medium text-white">{destAirport.city}</div>
                        <div className="truncate text-xs text-muted-foreground">{destAirport.code}</div>
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground">Where to?</span>
                    )}
                  </div>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] border-navy-700 bg-navy-800 p-2" align="start">
                {airports.filter((a) => a.code !== origin).map((a) => (
                  <button
                    key={a.code}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-navy-700"
                    onClick={() => { setDestination(a.code); setDestOpen(false); setValidationError(""); }}
                  >
                    <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium text-white">{a.city} <span className="text-muted-foreground">{a.code}</span></div>
                      <div className="text-xs text-muted-foreground">{a.country}</div>
                    </div>
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          </div>

          {/* Date Pickers */}
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex h-14 min-w-[150px] items-center gap-2 rounded-lg border border-navy-700 bg-navy-800 px-4 text-left transition-colors hover:border-electric/40">
                  <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium text-white">
                      {departureDate ? format(departureDate, "EEE, MMM d") : "Departure"}
                    </div>
                  </div>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto border-navy-700 bg-navy-800 p-0" align="start">
                <PriceCalendar
                  selected={departureDate}
                  onSelect={setDepartureDate}
                  showPrices={showPriceGrid}
                  livePrices={calendarPrices}
                  loadingPrices={loadingPrices}
                />
              </PopoverContent>
            </Popover>

            {tripType === "round-trip" && (
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex h-14 min-w-[150px] items-center gap-2 rounded-lg border border-navy-700 bg-navy-800 px-4 text-left transition-colors hover:border-electric/40">
                    <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium text-white">
                        {returnDate ? format(returnDate, "EEE, MMM d") : "Return"}
                      </div>
                    </div>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto border-navy-700 bg-navy-800 p-0" align="start">
                  <PriceCalendar
                    selected={returnDate}
                    onSelect={setReturnDate}
                    showPrices={showPriceGrid}
                    livePrices={calendarPrices}
                    loadingPrices={loadingPrices}
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-4 flex items-center justify-end gap-3">
          <AnimatePresence>
            {validationError && (
              <motion.p
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="text-xs text-danger"
              >
                {validationError}
              </motion.p>
            )}
          </AnimatePresence>
          <Button onClick={handleSearch} className="h-10 gap-2 rounded-full bg-electric px-6 text-white hover:bg-electric-dark">
            <Search className="h-4 w-4" />
            Search
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
