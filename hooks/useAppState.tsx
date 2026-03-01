"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface AppState {
  homeCountry: string;
  setHomeCountry: (v: string) => void;
  preferredCurrency: string;
  setPreferredCurrency: (v: string) => void;
  origin: string;
  setOrigin: (v: string) => void;
  destination: string;
  setDestination: (v: string) => void;
  departureDate: Date | undefined;
  setDepartureDate: (v: Date | undefined) => void;
  returnDate: Date | undefined;
  setReturnDate: (v: Date | undefined) => void;
  passengers: number;
  setPassengers: (v: number) => void;
  cabinClass: string;
  setCabinClass: (v: string) => void;
  tripType: string;
  setTripType: (v: string) => void;
  noFxFeeCard: boolean;
  setNoFxFeeCard: (v: boolean) => void;
}

const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [homeCountry, setHomeCountry] = useState("IN");
  const [preferredCurrency, setPreferredCurrency] = useState("INR");
  const [origin, setOrigin] = useState("DEL");
  const [destination, setDestination] = useState("");
  const [departureDate, setDepartureDate] = useState<Date | undefined>(new Date(2026, 2, 17));
  const [returnDate, setReturnDate] = useState<Date | undefined>(new Date(2026, 2, 21));
  const [passengers, setPassengers] = useState(1);
  const [cabinClass, setCabinClass] = useState("economy");
  const [tripType, setTripType] = useState("one-way");
  const [noFxFeeCard, setNoFxFeeCard] = useState(false);

  return (
    <AppStateContext.Provider
      value={{
        homeCountry, setHomeCountry,
        preferredCurrency, setPreferredCurrency,
        origin, setOrigin,
        destination, setDestination,
        departureDate, setDepartureDate,
        returnDate, setReturnDate,
        passengers, setPassengers,
        cabinClass, setCabinClass,
        tripType, setTripType,
        noFxFeeCard, setNoFxFeeCard,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
