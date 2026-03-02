"use client";

import { useState, useEffect } from "react";
import { useAppState } from "@/hooks/useAppState";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  ExternalLink, Shield, ShieldCheck, Trophy, Loader2, AlertCircle,
  Globe, Plane, Wifi, CreditCard,
} from "lucide-react";
import { motion } from "framer-motion";
import { formatPrice, convertCurrency } from "@/lib/mockFlights";

// Countries considered "medium risk" — may require local ID/credit card
const MEDIUM_RISK = new Set([
  "AR", "EG", "VN", "NG", "PK", "BD", "TR", "BO", "KE", "GH",
  "TZ", "UG", "ZM", "ZW", "BI", "CM", "TD", "CF",
]);

export interface POSOptionBrief {
  countryCode: string;
  countryName: string;
  flagEmoji: string;
  price: number;
  riskLevel: "low" | "medium";
  bookingToken?: string;
}

interface LiveBookingOption {
  id: string;
  title: string;
  website: string;
  price: number;
  isAirline: boolean;
  token: string;
  // enriched from the source POS
  posCountryCode: string;
  posCountryName: string;
  posFlagEmoji: string;
  posRiskLevel: "low" | "medium";
}

interface VPNDialogState {
  open: boolean;
  countryName: string;
  flagEmoji: string;
  onConfirm: () => void;
}

function RiskBadge({ level }: { level: "low" | "medium" }) {
  if (level === "low")
    return (
      <Badge variant="outline" className="border-success/30 bg-success/10 text-[9px] text-success">
        <ShieldCheck className="mr-0.5 h-2.5 w-2.5" /> Low Risk
      </Badge>
    );
  return (
    <Badge variant="outline" className="border-warning/30 bg-warning/10 text-[9px] text-warning">
      <Shield className="mr-0.5 h-2.5 w-2.5" /> Medium Risk
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

function ProviderIcon({ title, website }: { title: string; website?: string }) {
  const [imgError, setImgError] = useState(false);
  const favicon = website ? getFaviconUrl(website) : null;

  if (favicon && !imgError) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
        <img src={favicon} alt={title} className="h-6 w-6 object-contain" onError={() => setImgError(true)} />
      </div>
    );
  }

  const initials = title.split(/[\s.]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy-700/50">
      <span className="text-[10px] font-bold text-muted-foreground">{initials || "?"}</span>
    </div>
  );
}

interface BookingProvidersProps {
  posOptions: POSOptionBrief[];
}

export function BookingProviders({ posOptions }: BookingProvidersProps) {
  const { preferredCurrency, homeCountry, noFxFeeCard, setNoFxFeeCard } = useAppState();
  const { incrementUsage } = useAuth();

  const [providers, setProviders] = useState<LiveBookingOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [loadingToken, setLoadingToken] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [vpnDialog, setVpnDialog] = useState<VPNDialogState>({
    open: false, countryName: "", flagEmoji: "", onConfirm: () => { },
  });

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // Fetch providers for the 3 cheapest POS tokens only, sequentially
  useEffect(() => {
    let active = true;

    const fetchAll = async () => {
      const tokened = posOptions
        .filter((p) => p.bookingToken)
        .sort((a, b) => a.price - b.price)
        .slice(0, 3);

      if (tokened.length === 0) {
        setFetchError("No booking tokens available. Please search again to get fresh results.");
        return;
      }

      setLoading(true);
      setLoadingMore(false);
      setFetchError(null);
      setProviders([]);

      const seen = new Map<string, LiveBookingOption>();

      for (let i = 0; i < tokened.length; i++) {
        if (!active) break;
        const posPos = tokened[i];

        if (i === 0) {
          setLoading(true);
        } else {
          setLoading(false);
          setLoadingMore(true);
        }

        const items = [{
          booking_token: posPos.bookingToken!,
          country_code: posPos.countryCode,
          currency: preferredCurrency,
        }];

        console.log(`[OmniFare BookingProviders] Fetching providers for POS: ${posPos.countryCode}`);

        try {
          const res = await fetch("/api/geoarb/booking-options", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items }),
          });

          if (!active) break;

          const data = await res.json();
          if (data.error) {
            console.warn(`[OmniFare BookingProviders] Error fetching POS ${posPos.countryCode}:`, data.error);
            continue;
          }

          const results = data.results ?? [];
          for (const result of results) {
            const riskLevel: "low" | "medium" = MEDIUM_RISK.has(result.country_code) ? "medium" : "low";

            for (const opt of result.options) {
              if (!opt.token || opt.price <= 0) continue;

              const existing = seen.get(opt.title);
              if (!existing || opt.price < existing.price) {
                seen.set(opt.title, {
                  id: opt.id,
                  title: opt.title,
                  website: opt.website,
                  price: opt.price,
                  isAirline: opt.isAirline,
                  token: opt.token,
                  posCountryCode: result.country_code,
                  posCountryName: posPos.countryName,
                  posFlagEmoji: posPos.flagEmoji,
                  posRiskLevel: riskLevel,
                });
              }
            }
          }

          const flat = [...seen.values()];
          setProviders(flat);

        } catch (err) {
          console.error(`[OmniFare BookingProviders] Failed POS ${posPos.countryCode}:`, err);
        }
      }

      if (active) {
        setLoading(false);
        setLoadingMore(false);

        setProviders(currentProviders => {
          if (currentProviders.length === 0) {
            setFetchError("No booking options returned from any POS. Please try again.");
          }
          return currentProviders;
        });
      }
    };

    fetchAll();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posOptions]);

  const doBooking = async (option: LiveBookingOption) => {
    const allowed = await incrementUsage();
    if (!allowed) return;

    setBookingError(null);
    setLoadingToken(option.token.slice(0, 20));

    const newTab = window.open("about:blank", "_blank");
    if (newTab) {
      newTab.document.title = "OmniFare | Redirecting...";
      newTab.document.body.innerHTML = `
        <div style="margin:0;padding:0;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background-color:#0a0e1a;color:#fff;font-family:system-ui, -apple-system, sans-serif;">
          <style>
            @keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; text-shadow: 0 0 15px rgba(56, 189, 248, 0.6); } 100% { opacity: 0.6; } }
            @keyframes load { 0% { width: 0%; } 20% { width: 30%; } 50% { width: 60%; } 80% { width: 85%; } 100% { width: 95%; } }
            .logo { font-size: 2.25rem; font-weight: 700; margin-bottom: 0.5rem; letter-spacing: -0.025em; animation: pulse 2s infinite ease-in-out; }
            .logo-icon { display: inline-block; transform: rotate(45deg); margin-right: 8px; color: #38bdf8; }
            .subtitle { font-size: 1rem; color: #94a3b8; margin-bottom: 2rem; }
            .bar-container { width: 260px; height: 6px; background: rgba(255, 255, 255, 0.1); border-radius: 99px; overflow: hidden; margin-bottom: 1rem; }
            .bar-fill { height: 100%; background: linear-gradient(90deg, #38bdf8, #818cf8); border-radius: 99px; animation: load 10s cubic-bezier(0.1, 0.7, 1, 0.1) forwards; }
            .status { font-size: 0.75rem; color: #64748b; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; }
          </style>
          <div class="logo"><span class="logo-icon">✈</span>OmniFare</div>
          <div class="subtitle">Securing your price on ${option.title}...</div>
          <div class="bar-container"><div class="bar-fill"></div></div>
          <div class="status">Generating secure deep link</div>
        </div>
      `;
    }

    try {
      const res = await fetch("/api/geoarb/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: option.token,
          currency: preferredCurrency,
          country_code: option.posCountryCode,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.booking_url) {
        newTab?.close();
        setBookingError(data.error ?? "Failed to get booking URL. Please try again.");
        return;
      }

      if (newTab) {
        newTab.location.href = data.booking_url;
      } else {
        window.open(data.booking_url, "_blank");
      }
    } catch {
      newTab?.close();
      setBookingError("Failed to get booking link. Please try again.");
    } finally {
      setLoadingToken(null);
    }
  };

  const handleContinue = (option: LiveBookingOption) => {
    const isForeign = option.posCountryCode !== homeCountry;
    if (isForeign) {
      setVpnDialog({
        open: true,
        countryName: option.posCountryName,
        flagEmoji: option.posFlagEmoji,
        onConfirm: () => {
          setVpnDialog((prev) => ({ ...prev, open: false }));
          doBooking(option);
        },
      });
    } else {
      doBooking(option);
    }
  };

  const sorted = [...providers].sort((a, b) => a.price - b.price);
  const cheapestPrice = sorted[0]?.price ?? 0;

  return (
    <>
      {/* VPN recommendation dialog */}
      <Dialog open={vpnDialog.open} onOpenChange={(o) => setVpnDialog((prev) => ({ ...prev, open: o }))}>
        <DialogContent className="border-navy-700/50 bg-navy-900 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-electric" />
              VPN Recommended
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              You are booking via a{" "}
              <span className="font-semibold text-white">
                {vpnDialog.flagEmoji} {vpnDialog.countryName}
              </span>{" "}
              Point of Sale. For the best experience and to avoid geo-restrictions, we recommend connecting your VPN to{" "}
              <span className="font-semibold text-electric">{vpnDialog.countryName}</span> before continuing.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-1 rounded-lg border border-navy-700/50 bg-navy-800/60 p-3 text-xs text-muted-foreground">
            <div className="flex items-start gap-2">
              <Wifi className="mt-0.5 h-3.5 w-3.5 shrink-0 text-electric" />
              <span>
                Set your VPN server to <strong className="text-white">{vpnDialog.countryName}</strong>, then click
                &quot;Continue Anyway&quot; to proceed to the booking site.
              </span>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <Button
              variant="outline"
              className="flex-1 cursor-pointer border-navy-700 text-muted-foreground"
              onClick={() => setVpnDialog((prev) => ({ ...prev, open: false }))}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 cursor-pointer bg-electric text-white hover:bg-electric-dark"
              onClick={vpnDialog.onConfirm}
            >
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              Continue Anyway
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl border border-navy-700/50 bg-navy-900 p-5"
      >
        {/* Header */}
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="mb-0.5 text-lg font-semibold text-white">Booking options</h2>
            <p className="text-xs text-muted-foreground">
              Best providers across all available Points of Sale, sorted by price
            </p>
          </div>

          {/* FX fee card toggle */}
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-navy-700/50 bg-navy-800/50 px-3 py-2 text-xs text-muted-foreground transition hover:border-navy-600">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 cursor-pointer accent-electric"
              checked={noFxFeeCard}
              onChange={(e) => setNoFxFeeCard(e.target.checked)}
            />
            <CreditCard className="h-3.5 w-3.5 text-electric" />
            I have a no FX fee card
          </label>
        </div>

        {bookingError && (
          <div className="mb-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
            {bookingError}
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-electric" />
            <span>Loading booking options across all Points of Sale…</span>
            <span className="text-[11px]">This may take 15–30 seconds</span>
          </div>
        )}

        {!loading && fetchError && (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
            <AlertCircle className="h-8 w-8 text-danger/50" />
            <p>{fetchError}</p>
          </div>
        )}

        {!loading && !fetchError && sorted.length > 0 && (
          <div className="space-y-2">
            {sorted.slice(0, page * PAGE_SIZE).map((option, i) => {
              const isCheapest = option.price === cheapestPrice;
              const isLoading = loadingToken === option.token.slice(0, 20);
              const fxFee = Math.round(option.price * 0.03);
              const isForeign = option.posCountryCode !== homeCountry;

              return (
                <motion.div
                  key={option.token.slice(0, 20)}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`flex flex-col gap-3 rounded-lg border p-4 transition-colors sm:flex-row sm:items-center sm:justify-between ${isCheapest
                    ? "border-electric/40 bg-electric/5"
                    : "border-navy-700/50 bg-navy-800/30 hover:border-navy-600"
                    }`}
                >
                  {/* Left: provider info */}
                  <div className="flex items-center gap-3">
                    <ProviderIcon title={option.title} website={option.website} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-medium text-white">{option.title}</span>
                        {isCheapest && (
                          <Badge className="bg-electric/20 text-[9px] text-electric">
                            <Trophy className="mr-0.5 h-2.5 w-2.5" /> Best Price
                          </Badge>
                        )}
                        {option.isAirline && (
                          <Badge variant="outline" className="border-navy-600 text-[9px] text-muted-foreground">
                            <Plane className="mr-0.5 h-2.5 w-2.5" /> Airline
                          </Badge>
                        )}
                        <RiskBadge level={option.posRiskLevel} />
                      </div>

                      {/* POS country row */}
                      <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <span>{option.posFlagEmoji} {option.posCountryName} POS</span>
                        {isForeign && (
                          <span className="rounded border border-navy-600 px-1 text-[9px] text-muted-foreground">
                            VPN recommended
                          </span>
                        )}
                      </div>
                      {option.website && (
                        <div className="text-[10px] text-muted-foreground/60">{option.website}</div>
                      )}
                    </div>
                  </div>

                  {/* Right: price + button */}
                  <div className="flex items-center gap-4 sm:shrink-0">
                    <div className="text-right">
                      <div className="text-base font-bold text-white">
                        {formatPrice(convertCurrency(option.price, preferredCurrency), preferredCurrency)}
                      </div>
                      {isForeign && !noFxFeeCard && (
                        <div className="text-[10px] text-muted-foreground">
                          + {formatPrice(convertCurrency(fxFee, preferredCurrency), preferredCurrency)} est. FX fee
                        </div>
                      )}
                      {isForeign && noFxFeeCard && (
                        <div className="text-[10px] text-success">No FX fee</div>
                      )}
                    </div>

                    <Button
                      size="sm"
                      disabled={isLoading}
                      onClick={() => handleContinue(option)}
                      className="cursor-pointer gap-1.5 bg-electric text-white hover:bg-electric-dark"
                    >
                      {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      Continue
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </motion.div>
              );
            })}
            {sorted.length > page * PAGE_SIZE && (
              <div className="mt-4 flex justify-center pb-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 border-navy-700 text-white hover:bg-navy-800"
                  onClick={() => setPage((p) => p + 1)}
                >
                  Show more options ({sorted.length - page * PAGE_SIZE} remaining)
                </Button>
              </div>
            )}
          </div>
        )}

        {loadingMore && (
          <div className="mt-4 flex animate-pulse items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-electric/70" />
            <span>Fetching more options to find better prices...</span>
          </div>
        )}

        <Separator className="my-4 bg-navy-700/50" />
        <p className="text-[10px] text-muted-foreground">
          Prices include required taxes + fees for 1 adult.
          {!noFxFeeCard && " Bank FX fees are estimated at 3% and may vary by your card issuer."}
          {" "}Providers are fetched from multiple Points of Sale — lower prices may require a VPN and a local payment method.
        </p>
      </motion.div>
    </>
  );
}
