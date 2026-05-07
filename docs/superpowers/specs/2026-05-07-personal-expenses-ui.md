# Personal Expense Tracker — UI design

**Date:** 2026-05-07
**Status:** Approved tokens, awaiting implementation
**Pairs with:** `2026-05-07-personal-expenses-design.md`

## Visual language

Cream-white base. Arch-shaped violet glow anchored at the bottom-centre of key screens. Big serif display numbers stacked as stat triples. Glassy chip pills for selectors. Hairline dividers, generous whitespace. Gauge rings for budgets and savings rate. A small daily bar chart on the home dashboard.

The aesthetic is editorial-meets-fintech: warm paper, expensive ink, a single saturated accent. No emoji icons in production UI (the tab-bar emoji in the plan are placeholders to be replaced by line icons).

## Design tokens

### Color

```
--bg          #FBF7F0   cream-white                  app background
--fg          #1A1410   deep ink                     primary text, gauge ring fill
--muted       #6B5E54                                secondary text
--hairline    #E9E2D6                                dividers, ring track
--violet-200  #DDD3FF                                chip surface, prior-day bars
--violet-500  #7C5BFF                                primary accent, today's bar, gauge fill
--violet-700  #4B2EE6                                arch glow core
--success     #2F8F5C                                income, under-budget
--danger      #C7402E                                over-budget, destructive
--surface-glass  rgba(255, 255, 255, 0.55)           chip, sticky header
```

Dark mode is out of scope for v1. Reserve `#0F0B08` and a complementary violet shift for a later iteration; do not implement yet.

### Typography

- **Display (serif):** Fraunces, variable. Weights 400 / 600. Optical size 14 for inline, 144 for hero numbers. Tabular numerals for amounts.
- **Body (sans):** Inter, variable. Weights 400 / 500 / 600. Tabular numerals for any numeric label.
- **Mono:** JetBrains Mono, weight 400. Optional, only on transaction detail amount line if it improves alignment.

Type scale:

```
display-hero    Fraunces 600   56 / 60   tabular            home this-month total
display-large   Fraunces 600   36 / 40   tabular            stat-triple primary
display-med     Fraunces 600   28 / 32                      section heading
display-sm      Fraunces 600   22 / 28                      sheet title
body-lg         Inter    500   17 / 24                      list row title
body            Inter    400   15 / 22                      default
caption         Inter    500   12 / 16   small caps         labels above numbers
mono            JetBrains 400  16 / 22                      amount detail (optional)
```

### Radii and elevation

```
--r-sm    8       chips inside detail rows
--r-md    14      cards, sheets, fields
--r-lg    22      hero cards, modals
--r-pill  999     selectable chip pills
--shadow-1   0 1 2 rgba(20,16,12,0.04)           default card
--shadow-2   0 8 24 rgba(20,16,12,0.06)          floating sheet
--shadow-glow 0 0 80 rgba(76,46,230,0.18)        arch glow soft halo
```

### Spacing

4-pt grid: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 48 / 64. Screen edge padding: 20. Card inset: 20. Section gap: 32.

## Motifs

### Arch glow

A radial gradient anchored at `bottom-center`, occupying the lower 60% of the screen. Stops: `violet-700 0% → violet-500 40% → transparent 100%`. Clipped by a top-edge inverse half-disc so the glow reads as the inside of an arch.

Implementation: a full-bleed `View` with `LinearGradient` and a `MaskedView` whose mask is a vector half-disc (radius = 65% of screen width). Place behind everything; do not animate by default.

Used on: Home, Budgets tab, Reports detail.

### Gauge ring

Circular progress ring used for budget % and savings rate.

- Outer diameter: 160 (hero), 84 (compact card), 56 (row).
- Stroke: 10 / 6 / 4 respectively.
- Track: `--hairline`.
- Fill: `--violet-500`. Over 100% switches to `--danger`.
- End cap: rounded.
- Inner content: stat-triple (value, suffix, caption).

Implementation: react-native-svg `Circle` with stroke-dasharray.

### Stat triple

Three stacked elements: a small-caps caption, a hero serif number, an optional secondary line.

```
LABEL                       caption / muted
36,400                      display-hero / fg
+1.2 vs last month          body / muted
```

Used as the single most important on-screen object. Always left-aligned.

### Mini bar chart

A 14-day or 30-day spend bar chart, height 56.

- Bars: width 8, gap 4, radius `--r-sm` on top corners.
- Today: `--violet-500`.
- Prior days: `--violet-200`.
- Hover/touch: tooltip with date + total.

### Glassy chip pill

```
height: 36, padding-x: 14, radius: --r-pill
background: --surface-glass
border: 1 hairline
backdrop-blur: 12 (Android: emulate via translucent overlay since true blur is iOS-only)
selected: background fg, text bg, border transparent
```

Used for: currency / account / category / kind selection on the add-transaction sheet, time period selectors on reports.

## Component conventions

- Buttons: pill primary uses `--fg` background; secondary uses `--surface-glass` + hairline; ghost has no border.
- Fields: 1px hairline, radius `--r-md`, focused state moves border to `--violet-500`.
- Lists: hairline dividers, no card chrome on row level; card chrome lives at section level only.
- Sheets: full-screen on mobile; spring-in from bottom; drag-to-dismiss.
- Empty states: serif headline + one body line + a single primary action. No illustrations.

## Screens — concrete direction

### Home (dashboard)

- Arch glow background.
- Hero block: stat triple — caption "THIS MONTH", display-hero amount in base currency, body subline showing income delta.
- Below hero: 14-day mini bar chart.
- Three small gauge cards in a row: "Top category", "Income vs expense", "Savings rate".
- Pending recurring confirms cards.
- Recent (5) transactions list with hairline dividers.

### Quick-add sheet

- Sheet title: "New entry" (display-sm).
- Amount: serif display-large, right-aligned, big numeric pad below.
- Currency / Account / Category as horizontally scrollable glassy chip rows.
- Save: full-width pill primary at the bottom.

### Transactions list

- Sticky search header with a single Field; filter trigger as ghost button.
- Rows: title (merchant or category), caption with account + date + source tag, right-aligned amount in serif display-sm.

### Budgets

- Each budget row is a card with a 56-gauge on the left, name + spend / limit on the right.
- Header card: aggregate gauge (total month spend / total budgeted), arch glow.

### Reports

- Period selector as glassy chip row at top.
- Spend-by-category: pie with serif labels, drill-down opens a category detail.
- Trends: line chart in fg ink, dot at current month in violet-500.
- Savings rate: hero gauge.

### Settings

- No arch glow here; just cream + hairline list rows. Settings should feel quieter than the rest.

## Implementation tokens module

The plan must add this module before any UI screen ships. Add as a new task in Phase 0.

```
src/ui/theme.ts          token constants and typed access
src/ui/Text.tsx          typed Text component picking from the type scale
src/ui/ArchGlow.tsx      reusable bottom arch glow background
src/ui/Gauge.tsx         circular gauge ring component
src/ui/MiniBars.tsx      mini bar chart
src/ui/StatTriple.tsx    label / hero / subline composition
```

All UI components from Phase 4 onwards use these primitives. Existing Phase 5 plan code (Button, Field, Chip) is updated to consume tokens instead of inline literals.

## Fonts

- Bundle Fraunces and Inter via `expo-font`.
- Variable axes: keep default; do not animate axes for v1.
- License: both fonts are SIL OFL — fine to ship.

## Accessibility

- Text contrast against `--bg` checked: fg passes AAA, muted passes AA on body sizes.
- Violet-500 against bg passes AA at large sizes only — do not use for body text, only accents and large display numbers.
- Touch targets: 44 minimum.
- Honour `prefersReducedMotion` for sheet transitions and arch glow opacity (no animation).

## Out of scope for v1

- Dark mode.
- Themed accent colour (locked to violet).
- Complex chart interactions beyond tooltip.
- Lottie or vector illustration.
- Custom icon set — use a hairline icon library (e.g. lucide-react-native) tinted to fg.
