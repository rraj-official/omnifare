"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useAppState } from "@/hooks/useAppState";
import { countries } from "@/lib/mockFlights";
import { PlaneTakeoff, LogOut, User, Globe, Coins, Settings } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Link from "next/link";
import { motion } from "framer-motion";

export function Navbar() {
  const router = useRouter();
  const { isLoggedIn, user, logout, setShowAuthModal } = useAuth();
  const { homeCountry, setHomeCountry, preferredCurrency, setPreferredCurrency } = useAppState();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = async () => {
    await logout();
    setShowLogoutConfirm(false);
    router.push("/");
  };

  return (
    <>
      <motion.nav
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 border-b border-navy-700/50 bg-navy-950/80 backdrop-blur-xl"
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-electric">
              <PlaneTakeoff className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">
              Omni<span className="text-electric">Fare</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {/* Desktop Selectors */}
            <div className="hidden items-center gap-2 sm:flex">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <Select value={homeCountry} onValueChange={(v) => {
                setHomeCountry(v);
                const c = countries.find((c) => c.code === v);
                if (c) setPreferredCurrency(c.currency);
              }}>
                <SelectTrigger className="h-8 w-[140px] border-navy-700 bg-navy-800 text-sm">
                  <SelectValue placeholder="Country" />
                </SelectTrigger>
                <SelectContent className="border-navy-700 bg-navy-800">
                  {countries.map((c) => (
                    <SelectItem key={c.code} value={c.code} className="text-sm">
                      {c.flagEmoji} {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="hidden items-center gap-2 sm:flex">
              <Coins className="h-4 w-4 text-muted-foreground" />
              <Select value={preferredCurrency} onValueChange={setPreferredCurrency}>
                <SelectTrigger className="h-8 w-[100px] border-navy-700 bg-navy-800 text-sm">
                  <SelectValue placeholder="Currency" />
                </SelectTrigger>
                <SelectContent className="border-navy-700 bg-navy-800">
                  {countries.map((c) => (
                    <SelectItem key={c.currency} value={c.currency} className="text-sm">
                      {c.symbol} {c.currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Mobile Settings Icon */}
            <div className="flex sm:hidden">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-white">
                    <Settings className="h-5 w-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[220px] border-navy-700 bg-navy-800 p-3" align="end">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Globe className="h-3.5 w-3.5" /> Country
                      </label>
                      <Select value={homeCountry} onValueChange={(v) => {
                        setHomeCountry(v);
                        const c = countries.find((c) => c.code === v);
                        if (c) setPreferredCurrency(c.currency);
                      }}>
                        <SelectTrigger className="h-8 w-full border-navy-700 bg-navy-900 text-sm">
                          <SelectValue placeholder="Country" />
                        </SelectTrigger>
                        <SelectContent className="border-navy-700 bg-navy-900">
                          {countries.map((c) => (
                            <SelectItem key={c.code} value={c.code} className="text-sm">
                              {c.flagEmoji} {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Coins className="h-3.5 w-3.5" /> Currency
                      </label>
                      <Select value={preferredCurrency} onValueChange={setPreferredCurrency}>
                        <SelectTrigger className="h-8 w-full border-navy-700 bg-navy-900 text-sm">
                          <SelectValue placeholder="Currency" />
                        </SelectTrigger>
                        <SelectContent className="border-navy-700 bg-navy-900">
                          {countries.map((c) => (
                            <SelectItem key={c.currency} value={c.currency} className="text-sm">
                              {c.symbol} {c.currency}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {isLoggedIn ? (
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-electric text-xs font-bold text-white">
                  {user?.avatar}
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setShowLogoutConfirm(true)}
                  className="text-muted-foreground hover:text-white"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-white"
                onClick={() => setShowAuthModal(true)}
              >
                <User className="mr-1.5 h-4 w-4" />
                Sign In
              </Button>
            )}
          </div>
        </div>
      </motion.nav>

      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent className="border-navy-700 bg-navy-900">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Sign out?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to sign out of your account?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-navy-700 bg-transparent text-white hover:bg-navy-800 hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              className="bg-electric text-white hover:bg-electric-dark"
            >
              Sign out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
