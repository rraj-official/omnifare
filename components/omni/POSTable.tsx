"use client";

import { useState } from "react";
import { type Flight, type POSOption, convertCurrency, formatPrice } from "@/lib/mockFlights";
import { useAppState } from "@/hooks/useAppState";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  ExternalLink, Shield, ShieldCheck, AlertTriangle,
  Briefcase, Luggage, Clock, Leaf, Trophy, CreditCard, Loader2,
  BaggageClaim, Globe,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function RiskBadge({ level }: { level: POSOption["riskLevel"] }) {
  if (level === "low")
    return (
      <Badge variant="outline" className="border-success/30 bg-success/10 text-xs text-success">
        <ShieldCheck className="mr-1 h-3 w-3" /> Low Risk
      </Badge>
    );
  return (
    <Badge variant="outline" className="border-warning/30 bg-warning/10 text-xs text-warning">
      <Shield className="mr-1 h-3 w-3" /> Medium Risk
    </Badge>
  );
}

function getFaviconUrl(websiteUrl: string): string | null {
  try {
    const u = new URL(websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`);
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=32`;
  } catch {
    return null;
  }
}

interface VPNDialogState {
  open: boolean;
  countryName: string;
  countryCode: string;
  onConfirm: () => void;
}

export function POSTable({ flight }: { flight: Flight }) {
  const { preferredCurrency, homeCountry, noFxFeeCard, setNoFxFeeCard } = useAppState();
  const { incrementUsage } = useAuth();
  const sorted = [...flight.posOptions].sort((a, b) => a.price - b.price);
  const cheapestPrice = sorted[0]?.price ?? 0;

  const [loadingPOS, setLoadingPOS] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [vpnDialog, setVpnDialog] = useState<VPNDialogState>({
    open: false, countryName: "", countryCode: "", onConfirm: () => {},
  });

  // Pre-populate favicon icons from providerWebsite so they show immediately
  const [posIcons, setPosIcons] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const pos of flight.posOptions) {
      const site = pos.providerWebsite;
      if (site) {
        const fav = getFaviconUrl(site);
        if (fav) initial[pos.provider] = fav;
      }
    }
    return initial;
  });

  const doBooking = async (pos: POSOption) => {
    setBookingError(null);
    const key = `${pos.countryCode}-${pos.provider}`;
    setLoadingPOS(key);

    try {
      const bookingToken = (pos as any).bookingToken ?? (pos as any).booking_token;

      // No live booking token — use providerWebsite directly (mock / demo mode)
      if (!bookingToken) {
        if (pos.providerWebsite) {
          // Fetch favicon for the provider while we're at it
          const fav = getFaviconUrl(pos.providerWebsite);
          if (fav) setPosIcons((prev) => ({ ...prev, [pos.provider]: fav }));
          window.open(pos.providerWebsite, "_blank");
        } else {
          setBookingError("No booking link available for this option.");
        }
        return;
      }

      const res = await fetch("/api/geoarb/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_token: bookingToken,
          currency: preferredCurrency,
          country_code: pos.countryCode,
        }),
      });

      const data = await res.json();

      if (data.options?.length > 0) {
        const newIcons: Record<string, string> = {};
        for (const opt of data.options) {
          if (opt.website) {
            const fav = getFaviconUrl(opt.website);
            if (fav) newIcons[opt.title] = fav;
          }
        }
        setPosIcons((prev) => ({ ...prev, ...newIcons }));
      }

      if (data.booking_url) {
        window.open(data.booking_url, "_blank");
      } else if (data.options?.length > 0) {
        const bestOption = data.options[0];
        if (bestOption.website) {
          const url = bestOption.website.startsWith("http")
            ? bestOption.website
            : `https://${bestOption.website}`;
          window.open(url, "_blank");
        } else {
          setBookingError("No booking URL available for this option.");
        }
      } else {
        setBookingError("Could not retrieve booking details. Please try again.");
      }
    } catch {
      setBookingError("Failed to get booking link. Please try again.");
    } finally {
      setLoadingPOS(null);
    }
  };

  const handleContinue = async (pos: POSOption) => {
    const allowed = await incrementUsage();
    if (!allowed) return;

    const isForeignPOS = pos.countryCode !== homeCountry;

    if (isForeignPOS) {
      setVpnDialog({
        open: true,
        countryName: pos.countryName,
        countryCode: pos.countryCode,
        onConfirm: () => {
          setVpnDialog((prev) => ({ ...prev, open: false }));
          doBooking(pos);
        },
      });
    } else {
      doBooking(pos);
    }
  };

  return (
    <div className="space-y-6">
      {/* VPN Recommendation Dialog */}
      <Dialog open={vpnDialog.open} onOpenChange={(open) => setVpnDialog((prev) => ({ ...prev, open }))}>
        <DialogContent className="border-navy-700 bg-navy-900 sm:max-w-md">
          <AnimatePresence>
            {vpnDialog.open && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <DialogHeader className="items-center text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-electric/10">
                    <Globe className="h-8 w-8 text-electric" />
                  </div>
                  <DialogTitle className="text-xl text-white">
                    VPN Recommended
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    You&apos;re booking through a <strong className="text-white">{vpnDialog.countryName}</strong> Point of Sale.
                    For the best experience and to ensure the price is honored, we recommend
                    using a VPN set to <strong className="text-white">{vpnDialog.countryName} ({vpnDialog.countryCode})</strong> before
                    proceeding to the booking site.
                  </DialogDescription>
                </DialogHeader>
                <div className="mt-6 space-y-3">
                  <Button
                    onClick={vpnDialog.onConfirm}
                    className="w-full gap-2 bg-electric text-white hover:bg-electric-dark"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Continue to Booking
                  </Button>
                  <Button
                    onClick={() => setVpnDialog((prev) => ({ ...prev, open: false }))}
                    variant="outline"
                    className="w-full border-navy-700 text-muted-foreground hover:text-white"
                  >
                    Cancel
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>

      {/* Flight summary header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-navy-700/50 bg-navy-900 p-5"
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">
              {flight.departureCode} → {flight.arrivalCode}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              One way · {flight.cabinClass} · 1 passenger
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-white">
              {formatPrice(convertCurrency(cheapestPrice, preferredCurrency), preferredCurrency)}
            </div>
            <div className="text-xs text-muted-foreground">Lowest total price</div>
          </div>
        </div>

        <h3 className="mb-3 text-sm font-medium text-muted-foreground">Selected flights</h3>

        <div className="rounded-lg border border-navy-700/50 bg-navy-800/50 p-4">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <AirlineLogoDisplay airline={flight.airline} airlineLogo={flight.airlineLogo} />
              <div>
                <div className="text-sm text-muted-foreground">{flight.airline}</div>
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-white">
                {flight.departureDate} · {flight.departure} – {flight.arrival}
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-white">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              {flight.duration}
            </div>
            <div className={`text-sm ${flight.stops === 0 ? "text-success" : "text-warning"}`}>
              {flight.stops === 0 ? "Direct" : `${flight.stops} stop`}
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Leaf className="h-3.5 w-3.5" />
              {flight.co2Emissions} kg CO₂e
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
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
      </motion.div>

      {/* Booking options (POS Table) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl border border-navy-700/50 bg-navy-900 p-5"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="mb-1 text-lg font-semibold text-white">Booking options</h2>
            <p className="text-xs text-muted-foreground">
              Prices from multiple Points of Sale worldwide, converted to your preferred currency
            </p>
          </div>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-navy-700 bg-navy-800 px-3 py-2 text-xs transition-colors hover:border-electric/30">
            <input
              type="checkbox"
              checked={noFxFeeCard}
              onChange={(e) => setNoFxFeeCard(e.target.checked)}
              className="h-3.5 w-3.5 cursor-pointer rounded border-navy-600 bg-navy-700 accent-electric"
            />
            <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">I have a no FX fee card</span>
          </label>
        </div>

        {bookingError && (
          <div className="mb-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
            {bookingError}
          </div>
        )}

        <div className="space-y-2">
          {sorted.map((pos, i) => {
            const converted = convertCurrency(pos.price, preferredCurrency);
            const bankFee = Math.round(converted * 0.03);
            const isCheapest = pos.price === cheapestPrice;
            const key = `${pos.countryCode}-${pos.provider}`;
            const isLoading = loadingPOS === key;
            const favicon = posIcons[pos.provider];

            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`flex flex-col gap-3 rounded-lg border p-4 transition-colors sm:flex-row sm:items-center sm:justify-between ${
                  isCheapest
                    ? "border-electric/40 bg-electric/5"
                    : "border-navy-700/50 bg-navy-800/30 hover:border-navy-600"
                }`}
              >
                <div className="flex items-center gap-3">
                  <ProviderFavicon favicon={favicon} providerLogo={pos.providerLogo} provider={pos.provider} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">
                        Book with {pos.provider}
                      </span>
                      {isCheapest && (
                        <Badge className="bg-electric/20 text-[10px] text-electric">
                          <Trophy className="mr-0.5 h-2.5 w-2.5" /> Best Price
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{pos.countryName} POS</span>
                      <span>·</span>
                      <RiskBadge level={pos.riskLevel} />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-base font-bold text-white">
                      {formatPrice(converted, preferredCurrency)}
                    </div>
                    {!noFxFeeCard && (
                      <div className="text-[10px] text-muted-foreground">
                        + {formatPrice(bankFee, preferredCurrency)} est. FX fee (3%)
                      </div>
                    )}
                  </div>

                  {pos.riskLevel === "medium" ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isLoading}
                          onClick={() => handleContinue(pos)}
                          className="cursor-pointer gap-1.5 border-warning/30 text-warning hover:bg-warning/10"
                        >
                          {isLoading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <AlertTriangle className="h-3.5 w-3.5" />
                          )}
                          Continue
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[250px] border-navy-700 bg-navy-800">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                          <p className="text-xs">
                            {pos.riskNote ?? "May require local ID/Credit Card. Booking through this POS may have additional verification steps."}
                          </p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <Button
                      size="sm"
                      disabled={isLoading}
                      onClick={() => handleContinue(pos)}
                      className="cursor-pointer gap-1.5 bg-electric text-white hover:bg-electric-dark"
                    >
                      {isLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : null}
                      Continue
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        <Separator className="my-4 bg-navy-700/50" />

        <p className="text-[10px] text-muted-foreground">
          Baggage conditions apply to your entire trip. Bag fees may be higher at the airport.
          Prices include required taxes + fees for 1 adult.
          {!noFxFeeCard && " Bank FX fees are estimated at 3% and may vary by your card issuer."}
        </p>
      </motion.div>
    </div>
  );
}

function AirlineLogoDisplay({ airline, airlineLogo }: { airline: string; airlineLogo: string }) {
  const [imgError, setImgError] = useState(false);

  if (airlineLogo && (airlineLogo.startsWith("http") || airlineLogo.startsWith("/")) && !imgError) {
    return (
      <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-white">
        <img
          src={airlineLogo}
          alt={airline}
          className="h-6 w-6 object-contain"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-electric/20 text-xs font-bold text-electric">
      {airline.slice(0, 2).toUpperCase()}
    </div>
  );
}

function ProviderFavicon({ favicon, providerLogo, provider }: { favicon?: string; providerLogo?: string; provider: string }) {
  const [imgError, setImgError] = useState(false);
  const [favError, setFavError] = useState(false);

  // If favicon fails or isn't present, try providerLogo
  const src = !favError && favicon ? favicon : providerLogo;

  if (src && (src.startsWith("http") || src.startsWith("/")) && !imgError) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
        <img
          src={src}
          alt={provider}
          className="h-6 w-6 object-contain"
          onError={() => {
            if (!favError && favicon) setFavError(true);
            else setImgError(true);
          }}
        />
      </div>
    );
  }

  const initials = provider
    .split(/[\s.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy-700/50">
      <span className="text-[10px] font-bold text-muted-foreground">{initials || "?"}</span>
    </div>
  );
}
