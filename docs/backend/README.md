# OmniFare Backend Documentation

## Overview

The OmniFare backend is a Next.js API layer that orchestrates flight search across multiple geographic Points of Sale (POS). It integrates with the **DataCrawler Google Flights 2** API via RapidAPI, a **GeoArb pricing engine** that selects which countries to query, and **Frankfurter API** for live currency conversion. Results are cached in **Supabase** PostgreSQL.

---

## Documentation Index

| File | Description |
|------|-------------|
| [geoarb-engine.md](./geoarb-engine.md) | **GeoArb Pricing Engine** — POS selection algorithm, priority tiers, devaluation wildcards, full logic flow |
| [search-flow.md](./search-flow.md) | Flight search orchestration — from request to response |
| [api-routes.md](./api-routes.md) | All API routes: search, calendar, booking, booking-details, booking-options, health |
| [flight-api-service.md](./flight-api-service.md) | DataCrawler integration, endpoints, merge logic |
| [exchange-rate.md](./exchange-rate.md) | FX rates, conversion, bank fee, fallback |
| [database.md](./database.md) | Supabase schema, `flight_cache`, `profiles`, RLS |

---

## Architecture Summary

```
Frontend
    │
    ▼
Next.js Route Handlers (/api/geoarb/*)
    │
    ├── GeoArb Engine (lib/geoArbEngine.ts)
    │       → Decides 8 POS countries to query
    │
    ├── Flight API Service (lib/flightApiService.ts)
    │       → DataCrawler Google Flights 2 API
    │       → searchFlights, getCalendarPicker, getBookingDetails, getBookingURL
    │
    ├── Exchange Rate (lib/exchangeRate.ts)
    │       → Frankfurter API, conversion, 3% bank fee
    │
    └── Supabase (flight_cache, profiles)
            → Cache hits, rate-limit fallback, auth
```

---

## Key Concepts

### Point of Sale (POS)
The country from which a flight price is quoted. The same physical flight (e.g., DEL→BLR on IndiGo) can have different prices when booked via India vs Turkey vs Egypt. GeoArb queries multiple POSes in parallel to surface the cheapest option.

### GeoArb Engine
A deterministic algorithm that selects up to 8 countries to query for any route. Priority order:
1. **Origin country** — user's departure market
2. **Destination country** — arrival market
3. **US** — baseline reference market (USD)
4. **Vietnam, Egypt** — structurally cheap OTAs (Traveloka, Almosafer)
5. **Devaluation wildcards** — Turkey, Egypt, Argentina (weak currencies → cheaper local prices)
6. **Padding** — India, Brazil, Malaysia, Thailand, Philippines, Mexico, Colombia, Poland

### Merge & Deduplication
Flights from different POSes are merged by a deterministic **signature** (airline + route + departure time + legs). The same flight seen in 5 POSes becomes one merged flight with 5 POS options, each with its price and booking token.

### Currency Flow
- DataCrawler returns prices in **USD** (or the POS local currency, normalized to USD by the API)
- OmniFare converts to **user_currency** (e.g., INR) via Frankfurter
- A **3% bank fee** is added when the POS currency differs from the user's (foreign transaction fee)

---

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `RAPIDAPI_KEY` | Yes (for live) | DataCrawler API authentication |
| `NEXT_PUBLIC_USE_MOCK_DATA` | No | `"true"` → return mock data, skip live API |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Anon key (cache read, auth) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role (cache write) |

---

## External APIs

| API | Purpose | Auth |
|-----|---------|------|
| DataCrawler Google Flights 2 | searchFlights, getCalendarPicker, getBookingDetails, getBookingURL | RapidAPI key |
| Frankfurter | Live FX rates | None (free) |
| Supabase | PostgreSQL, Auth | URL + keys |
