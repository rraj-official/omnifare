"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { type Flight, type POSOption, getCheapestPOS, formatPrice, convertCurrency } from "@/lib/mockFlights";
import { useAppState } from "@/hooks/useAppState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ChevronDown, ChevronUp, Clock, Leaf, Luggage, Briefcase,
  BaggageClaim, Plane, Shield, ShieldCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function AirlineLogo({ airline, airlineLogo }: { airline: string; airlineLogo?: string }) {
  const [imgError, setImgError] = useState(false);

  if (airlineLogo && (airlineLogo.startsWith("http") || airlineLogo.startsWith("/")) && !imgError) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
        <img
          src={airlineLogo}
          alt={airline}
          className="h-7 w-7 object-contain"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  const colors: Record<string, string> = {
    "Air India Express": "bg-orange-600",
    "Air India": "bg-red-700",
    IndiGo: "bg-blue-600",
    "Akasa Air": "bg-orange-500",
    SpiceJet: "bg-yellow-600",
    Vistara: "bg-purple-700",
  };
  const initials: Record<string, string> = {
    "Air India Express": "IX",
    "Air India": "AI",
    IndiGo: "6E",
    "Akasa Air": "QP",
    SpiceJet: "SG",
    Vistara: "UK",
  };

  return (
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${colors[airline] ?? "bg-navy-600"} text-xs font-bold text-white`}>
      {initials[airline] ?? airline.slice(0, 2).toUpperCase()}
    </div>
  );
}

function SmallRiskBadge({ level }: { level: POSOption["riskLevel"] }) {
  if (level === "low")
    return (
      <Badge variant="outline" className="border-success/30 bg-success/10 text-[10px] text-success">
        <ShieldCheck className="mr-0.5 h-2.5 w-2.5" /> Low Risk
      </Badge>
    );
  return (
    <Badge variant="outline" className="border-warning/30 bg-warning/10 text-[10px] text-warning">
      <Shield className="mr-0.5 h-2.5 w-2.5" /> Medium
    </Badge>
  );
}

export function FlightCard({ flight }: { flight: Flight }) {
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();
  const { preferredCurrency, noFxFeeCard } = useAppState();

  const cheapest = getCheapestPOS(flight);
  const indianOption = flight.posOptions.find((p) => p.countryCode === "IN");
  const displayPrice = indianOption && indianOption.price > 0 ? indianOption.price : cheapest.price;
  const convertedPrice = convertCurrency(displayPrice, preferredCurrency);
  const fxFee = Math.round(convertedPrice * 0.03);

  const stopsText =
    flight.stops === 0
      ? "Direct"
      : `${flight.stops} stop${flight.stops > 1 ? "s" : ""}`;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group overflow-hidden rounded-xl border border-navy-700/50 bg-navy-900 transition-all hover:border-electric/30"
    >
      <div
        className="flex cursor-pointer flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5"
        onClick={() => setExpanded(!expanded)}
      >
        <AirlineLogo airline={flight.airline} airlineLogo={flight.airlineLogo} />

        <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-center">
          <div className="min-w-[180px]">
            <div className="text-base font-semibold text-white">
              {flight.departure} – {flight.arrival}
            </div>
            <div className="text-xs text-muted-foreground">{flight.airline}</div>
          </div>

          <div className="min-w-[100px] text-center">
            <div className="text-sm text-white">{flight.duration}</div>
            <div className="text-xs text-muted-foreground">
              {flight.departureCode}–{flight.arrivalCode}
            </div>
          </div>

          <div className="min-w-[120px] text-center">
            <div className={`text-sm ${flight.stops === 0 ? "text-success" : "text-warning"}`}>
              {stopsText}
            </div>
            {flight.stopLocations && (
              <div className="text-xs text-muted-foreground">
                {flight.stopLocations.join(", ")}
              </div>
            )}
          </div>

          <div className="min-w-[100px] text-center">
            <div className="text-sm text-white">{flight.co2Emissions} kg CO₂e</div>
            {flight.emissionsChange && (
              <div className={`text-xs ${flight.emissionsChange.startsWith("-") ? "text-success" : "text-muted-foreground"}`}>
                {flight.emissionsChange} emissions
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <div className="text-right">
            <div className="text-lg font-bold text-white">
              {formatPrice(convertedPrice, preferredCurrency)}
            </div>
            {!noFxFeeCard && (
              <div className="text-[10px] text-muted-foreground">
                + {formatPrice(fxFee, preferredCurrency)} est. FX fee (3%)
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="border-electric/30 bg-electric/10 text-[10px] text-electric">
              Best Price: {cheapest.flagEmoji} {cheapest.countryName}
            </Badge>
            <SmallRiskBadge level={cheapest.riskLevel} />
          </div>
          {/* POS country flags row */}
          <div className="flex items-center gap-0.5 mt-0.5">
            {flight.posOptions
              .slice()
              .sort((a, b) => a.price - b.price)
              .slice(0, 6)
              .map((pos) => (
                <span
                  key={pos.countryCode}
                  title={`${pos.countryName}: ${formatPrice(convertCurrency(pos.price, preferredCurrency), preferredCurrency)}`}
                  className="text-base leading-none cursor-default"
                >
                  {pos.flagEmoji}
                </span>
              ))}
            {flight.posOptions.length > 6 && (
              <span className="text-[10px] text-muted-foreground ml-0.5">+{flight.posOptions.length - 6}</span>
            )}
          </div>
          <button className="mt-1 text-muted-foreground transition-colors hover:text-white">
            {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <Separator className="bg-navy-700/50" />
            <div className="space-y-4 p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">
                  Departure · {flight.departureDate}
                </h3>
                <div className="flex items-center gap-2">
                  <Leaf className="h-3.5 w-3.5 text-success" />
                  <span className="text-xs text-muted-foreground">
                    Emissions estimate: {flight.co2Emissions} kg CO₂e
                  </span>
                </div>
              </div>

              {flight.legs.map((leg, i) => (
                <div key={i} className="rounded-lg border border-navy-700/50 bg-navy-800/50 p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <div className="h-3 w-3 rounded-full border-2 border-electric bg-navy-900" />
                      <div className="h-16 w-0.5 bg-navy-600" />
                      <div className="h-3 w-3 rounded-full border-2 border-electric bg-electric" />
                    </div>

                    <div className="flex-1 space-y-3">
                      <div>
                        <div className="text-sm font-medium text-white">{leg.departureTime}</div>
                        <div className="text-xs text-muted-foreground">{leg.departureAirport} ({leg.departureCode})</div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Travel time: {leg.duration}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">{leg.arrivalTime}</div>
                        <div className="text-xs text-muted-foreground">{leg.arrivalAirport} ({leg.arrivalCode})</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>{flight.airline} · {flight.cabinClass} · {leg.aircraft} · {leg.flightNumber}</span>
                  </div>
                </div>
              ))}

              <div className="flex items-center gap-4 rounded-lg border border-navy-700/50 bg-navy-800/50 px-4 py-3 text-xs text-muted-foreground">
                {flight.baggageInfo.carryOn && (
                  <span className="flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5" /> 1 free carry-on
                  </span>
                )}
                {flight.baggageInfo.checkedBag && (
                  <span className="flex items-center gap-1.5">
                    <Luggage className="h-3.5 w-3.5" /> 1st checked bag free
                  </span>
                )}
                {!flight.baggageInfo.checkedBag && (
                  <span className="flex items-center gap-1.5 text-warning">
                    <BaggageClaim className="h-3.5 w-3.5" /> No free checked bag
                  </span>
                )}
              </div>

              {/* POS breakdown — real prices from searchFlights across all countries */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground">
                  Available from {flight.posOptions.length} countr{flight.posOptions.length === 1 ? "y" : "ies"}
                </h4>
                {flight.posOptions
                  .slice()
                  .sort((a, b) => a.price - b.price)
                  .map((pos, i) => {
                    const converted = convertCurrency(pos.price, preferredCurrency);
                    const isCheapest = i === 0;
                    return (
                      <div
                        key={pos.countryCode}
                        className="flex items-center justify-between rounded-lg border border-navy-700/30 bg-navy-800/30 px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base leading-none">{pos.flagEmoji}</span>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-medium text-white">{pos.countryName}</span>
                              {isCheapest && (
                                <span className="text-[9px] text-electric">↓ cheapest</span>
                              )}
                            </div>
                            <div className="text-[10px] text-muted-foreground">{pos.countryCode} POS · <SmallRiskBadge level={pos.riskLevel} /></div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-semibold text-white">{formatPrice(converted, preferredCurrency)}</div>
                          {!noFxFeeCard && (
                            <div className="text-[9px] text-muted-foreground">
                              +{formatPrice(Math.round(converted * 0.03), preferredCurrency)} FX
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                <p className="text-[10px] text-muted-foreground">
                  Provider names are loaded on the booking page.
                </p>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/booking?id=${flight.id}`);
                  }}
                  className="gap-2 rounded-full bg-electric px-6 text-white hover:bg-electric-dark"
                >
                  <Plane className="h-4 w-4" />
                  Book Now
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
