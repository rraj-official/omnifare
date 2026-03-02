# Design System

OmniFare uses a fully custom dark theme built on Tailwind CSS v4 with CSS custom properties. The theme is defined in `app/globals.css` and is **dark-only** — no light mode exists.

---

## Color Palette

### Navy Scale (Backgrounds)

| Token | CSS Variable | Hex | Usage |
|-------|-------------|-----|-------|
| `navy-950` | `--color-navy-950` | `#060e1f` | Page background, footer |
| `navy-900` | `--color-navy-900` | `#0a1628` | Secondary backgrounds |
| `navy-800` | `--color-navy-800` | `#0f2038` | Card backgrounds |
| `navy-700` | `--color-navy-700` | `#162d4d` | Elevated card backgrounds |
| `navy-600` | `--color-navy-600` | `#1e3a5f` | Hover states, borders |

The navy scale goes from near-black (`#060e1f`) to a deep blue-navy (`#1e3a5f`). All backgrounds use this scale.

### Electric Blue (Accent)

| Token | CSS Variable | Hex | Usage |
|-------|-------------|-----|-------|
| `electric` | `--color-electric` | `#3b82f6` | Primary CTA, active states, logo |
| `electric-dark` | `--color-electric-dark` | `#2563eb` | Button hover |
| `electric-light` | `--color-electric-light` | `#60a5fa` | Secondary text, icons |
| `electric-glow` | `--color-electric-glow` | `#93c5fd` | Highlights, tooltips |

All interactive elements use the electric blue family as their primary color.

### Semantic Colors

| Token | CSS Variable | Hex | Usage |
|-------|-------------|-----|-------|
| `success` | `--color-success` | `#22c55e` | Direct flights, low risk, cheap prices |
| `warning` | `--color-warning` | `#f59e0b` | Medium risk, 70-89% usage |
| `danger` | `--color-danger` | `#ef4444` | Errors, high usage (90%+), expensive prices |

### Text Colors

| Usage | Value |
|-------|-------|
| Primary text | `#e2e8f0` (CSS: `foreground`) |
| Secondary text | `#94a3b8` (CSS: `muted-foreground`) |
| Disabled text | `rgba(148,163,184,0.5)` |

---

## CSS Custom Properties (Design Tokens)

Defined in `app/globals.css` under `@theme inline`:

```css
@theme inline {
  --color-navy-950: #060e1f;
  --color-navy-900: #0a1628;
  --color-navy-800: #0f2038;
  --color-navy-700: #162d4d;
  --color-navy-600: #1e3a5f;

  --color-electric: #3b82f6;
  --color-electric-dark: #2563eb;
  --color-electric-light: #60a5fa;
  --color-electric-glow: #93c5fd;

  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-danger: #ef4444;
}
```

### shadcn/ui Semantic Mappings

The shadcn semantic variables are mapped to the navy/electric palette in `:root`:

```css
:root {
  --background:   #060e1f;           /* navy-950 */
  --foreground:   #e2e8f0;
  --card:         #0a1628;           /* navy-900 */
  --card-foreground: #e2e8f0;
  --popover:      #0f2038;           /* navy-800 */
  --popover-foreground: #e2e8f0;
  --primary:      #3b82f6;           /* electric */
  --primary-foreground: #ffffff;
  --secondary:    #162d4d;           /* navy-700 */
  --secondary-foreground: #94a3b8;
  --muted:        #0f2038;           /* navy-800 */
  --muted-foreground: #94a3b8;
  --accent:       #1e3a5f;           /* navy-600 */
  --accent-foreground: #e2e8f0;
  --destructive:  #ef4444;           /* danger */
  --border:       rgba(59,130,246,0.15);   /* electric at 15% */
  --input:        rgba(59,130,246,0.10);
  --ring:         #3b82f6;           /* electric */
}
```

---

## Typography

### Font Family

```css
/* app/layout.tsx */
const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" })
const geistMono = GeistMono({ subsets: ["latin"], variable: "--font-geist-mono" })

/* Applied as: */
<body className={`${geistSans.variable} ${geistMono.variable}`}>
```

The body uses Geist Sans by default (via Tailwind's `font-sans`). Code elements use Geist Mono.

### Type Scale (key sizes used)

| Element | Tailwind Class | Size |
|---------|---------------|------|
| Hero headline | `text-5xl` | 48px |
| Page title | `text-2xl` / `text-3xl` | 24–30px |
| Section heading | `text-xl` | 20px |
| Card title | `text-lg` | 18px |
| Body text | `text-sm` | 14px |
| Caption / meta | `text-xs` | 12px |
| Tiny label | `text-[10px]` | 10px |

---

## Spacing & Layout

### Page Layout

```
<html dark>
  <body font-classes>
    <Providers>
      <Navbar />                    h-14, sticky top-0, z-50
      <main>
        {page content}
      </main>
      <footer />                    px-6 py-4
      <BudgetTracker />             fixed bottom-4 right-4
    </Providers>
  </body>
</html>
```

### Container

Most page content uses: `max-w-6xl mx-auto px-4`

### Card Pattern

Cards throughout the app follow this pattern:
```css
bg-navy-800/50          /* semi-transparent navy */
border border-navy-700  /* subtle border */
rounded-xl              /* 12px corners */
p-4 or p-6             /* internal padding */
```

---

## Component Patterns

### Buttons

| Variant | Style | Usage |
|---------|-------|-------|
| Default (primary) | `bg-electric hover:bg-electric-dark text-white` | Main CTAs: Search, Book Now |
| Ghost | `bg-transparent border border-navy-600 hover:bg-navy-700` | Secondary: Back, Cancel |
| Warning (amber) | `bg-warning/10 border-warning text-warning hover:bg-warning/20` | Medium-risk bookings |
| Destructive | `bg-danger text-white` | Not actively used |

All buttons have `cursor-pointer` on hover via global CSS:
```css
button, [role="button"], a { cursor: pointer; }
```

### Badges

```jsx
// Risk badge - Low
<span className="text-xs text-success border border-success/30 rounded px-1.5 py-0.5">
  Low Risk
</span>

// Risk badge - Medium
<span className="text-xs text-warning border border-warning/30 rounded px-1.5 py-0.5">
  Medium
</span>

// Best Price badge
<Badge className="bg-electric/10 text-electric border-electric/30">Best Price</Badge>
```

### Input / Select

All form controls use the `bg-navy-800 border-navy-600` pattern. On focus: `ring-2 ring-electric/30`.

### Popover / Dropdown

```css
bg-navy-800
border border-navy-700
rounded-xl
shadow-xl shadow-black/50
```

---

## Border System

All borders use electric blue at low opacity:
```css
border-[rgba(59,130,246,0.15)]   /* standard border */
border-[rgba(59,130,246,0.10)]   /* subtle border */
border-electric/30               /* hover or active borders */
```

This gives a consistent "electric tint" to all separators without being overwhelming.

---

## Animation System

### Framer Motion Patterns

**Collapsible sections (FlightCard expand):**
```typescript
<motion.div
  initial={{ height: 0, opacity: 0 }}
  animate={{ height: "auto", opacity: 1 }}
  exit={{ height: 0, opacity: 0 }}
  transition={{ duration: 0.25, ease: "easeInOut" }}
>
```

**Validation error (SearchBar):**
```typescript
<motion.div
  initial={{ opacity: 0, y: -4 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0 }}
  transition={{ duration: 0.15 }}
>
```

**Hero airplane (HeroSection):**
```typescript
<motion.div
  animate={{ left: ["-5%", "105%"] }}
  transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
>
```

### CSS Animations

Loading skeleton uses Tailwind's `animate-pulse`:
```jsx
<div className="animate-pulse bg-navy-800 rounded-xl h-32" />
```

---

## Icons

All icons are from **Lucide React** for consistency.

| Icon | Usage |
|------|-------|
| `PlaneTakeoff` | Navbar logo, "Book Now" |
| `Globe` | Country selector, VPN dialog |
| `Coins` | Currency selector |
| `Shield` | Risk badge (low) |
| `ShieldAlert` | Risk badge (medium) |
| `TreePine` | HeroSection landscape |
| `Mountain` | HeroSection background |
| `ChevronDown/Up` | FlightCard collapse toggle |
| `Luggage` | Baggage info |
| `AlertCircle` | Error states |
| `AlertTriangle` | Usage limit modal |
| `LogOut` | Navbar logout button |
| `Infinity` | Unlimited usage indicator |
| `ArrowLeftRight` | Swap airports button |

---

## Responsive Breakpoints

OmniFare is primarily designed for desktop use (flight booking is mostly desktop). Mobile adaptations:

| Element | Mobile | Desktop |
|---------|--------|---------|
| Navbar country/currency selectors | Hidden (`sm:hidden`) | Visible |
| SearchBar layout | Stacked vertically | Side by side |
| Results grid | Single column | Single column (max-w-3xl) |
| Hero section | Preserved | Preserved |

The breakpoint used is Tailwind's `sm` (640px).

---

## Scrollbar

Custom webkit scrollbar applied globally:
```css
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: #0a1628; }      /* navy-900 */
::-webkit-scrollbar-thumb { background: #162d4d; }      /* navy-700 */
::-webkit-scrollbar-thumb:hover { background: #3b82f6; } /* electric */
```

Thin (6px), navy-colored, turns electric blue on hover.

---

## Glassmorphism Effects

Several components use the semi-transparent background pattern:
```css
bg-navy-800/50          /* 50% opacity navy-800 */
backdrop-blur-sm        /* subtle blur */
border border-white/5   /* very subtle white border */
```

Used on: SearchBar floating card, modal overlays.

---

## Dark Mode Implementation

Dark mode is enforced by hardcoding `className="dark"` on the `<html>` element in `app/layout.tsx`. All shadcn/ui components respect the `.dark` class via their CSS variable definitions. There is no `prefers-color-scheme` media query or manual toggle — the app is always dark.
