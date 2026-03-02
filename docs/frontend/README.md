# OmniFare Frontend Documentation

## Overview

OmniFare is a POS-optimized flight search engine built with **Next.js 14 (App Router)**, **Tailwind CSS v4**, **shadcn/ui**, **Framer Motion**, and **Supabase** for authentication. It allows users to compare flight prices across multiple geographic Points of Sale (POS) to find the cheapest booking option globally.

---

## Documentation Index

| File | Description |
|------|-------------|
| [architecture.md](./architecture.md) | High-level architecture, tech stack, folder structure |
| [pages.md](./pages.md) | Every page: Home, Results, Booking — props, state, logic |
| [components.md](./components.md) | Every component in detail: props, state, logic, sub-components |
| [hooks.md](./hooks.md) | `useAppState` and `useAuth` — full API reference |
| [lib.md](./lib.md) | Frontend-relevant lib utilities: mockFlights, exchangeRate, apiConstants, supabaseClient |
| [flows.md](./flows.md) | Complete user flows: search, results, booking, auth |
| [design-system.md](./design-system.md) | Colors, design tokens, Tailwind custom classes, dark theme |
| [state-management.md](./state-management.md) | State architecture, sessionStorage patterns, Context hierarchy |
| [api-integration.md](./api-integration.md) | All frontend→API calls, payloads, response shapes |

---

## Quick Start Reference

### Key Technologies

| Tech | Version | Purpose |
|------|---------|---------|
| Next.js | 14 (App Router) | Framework, routing, SSR |
| TypeScript | Latest | Type safety |
| Tailwind CSS | v4 | Styling |
| shadcn/ui | Latest | UI component library |
| Framer Motion | Latest | Animations |
| Supabase | Latest | Auth + PostgreSQL |
| date-fns | Latest | Date formatting |
| Lucide React | Latest | Icons |

### Key Files at a Glance

```
app/
  layout.tsx           Root HTML layout, font loading, dark mode
  page.tsx             Home page
  providers.tsx        Global context providers + shell UI
  globals.css          Design tokens, Tailwind config
  results/page.tsx     Flight search results page
  booking/page.tsx     Flight booking page

components/omni/
  HeroSection.tsx      Animated hero banner
  SearchBar.tsx        Main flight search form
  FlightCard.tsx       Individual flight result card
  ResultsFilter.tsx    Stops/airline/time filter dropdowns
  PriceCalendar.tsx    Date picker with price heatmap
  Navbar.tsx           Top navigation bar
  BookingProviders.tsx Booking options (live provider list)
  POSTable.tsx         Legacy booking options table
  BudgetTracker.tsx    Usage ring widget
  AuthModal.tsx        Google sign-in dialog
  UsageLimitModal.tsx  Usage limit exceeded dialog

hooks/
  useAppState.tsx      Flight search form state + preferences
  useAuth.tsx          Supabase auth + usage metering

lib/
  mockFlights.ts       Types, airport/country data, static FX rates
  exchangeRate.ts      Server-side live FX rate service (Frankfurter API)
  apiConstants.ts      Supported country/currency code validation sets
  supabaseClient.ts    Supabase client-side singleton
```

---

## Core Concepts

### Points of Sale (POS)
A flight booked through a different country's website often has a different price. OmniFare queries the same flight from multiple country POSes simultaneously (up to 8) and presents the cheapest option.

### GeoArb Engine
The backend selects 8 POS countries to query based on: origin country, destination country, strategic low-cost countries (Vietnam, Egypt), and currency devaluation wildcards (Turkey, Argentina, Egypt).

### Data Flow Summary
```
User Searches → /api/geoarb/search (8 parallel POS queries) → Merged results
→ Results page (client-side filtering) → User clicks flight
→ sessionStorage lookup → Booking page
→ /api/geoarb/booking-options (fetch provider names) → User clicks Continue
→ /api/geoarb/booking (fetch redirect URL) → New tab with booking site
```
