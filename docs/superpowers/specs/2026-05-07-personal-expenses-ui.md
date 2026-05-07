# Personal Expense Tracker — UI design

**Date:** 2026-05-07 (revised same day)
**Status:** Approved tokens, awaiting implementation
**Pairs with:** `2026-05-07-personal-expenses-design.md`

## Visual language

Blush-cream background. Soft "aurora arch" gradient blob anchored at the top of hero cards (pink → lilac → indigo → deep indigo), rounded at the top, blurred and translucent. Sans-serif throughout — no serif fonts. Big tabular numbers, glassy white chip pills, half-arc mini gauges and circular stat rings, floating dark "+" in the center of a glassy bottom tab bar.

The aesthetic is contemporary fintech wellness: warm light surface, dimensional aurora colour, an indigo accent. Visual reference: pastel gradient blobs + clean modern sans + glass cards.

## Design tokens

### Color

```
--bg               #FAF4F4   blush-cream                  app background
--fg               #15131C   deep ink                     primary text
--muted            #6B6478                                secondary text
--hairline         #EEE6E8                                dividers, ring track
--pink-300         #F4C7D6                                aurora top stop
--pink-500         #ED93B3                                accent pop
--lilac-300        #D6CBF2                                aurora mid
--lilac-500        #B0A0E4                                accent pop
--indigo-500       #6F77E0                                primary accent
--indigo-700       #3A37A8                                ring fills, primary buttons
--blob-deep        #2B1F66                                deepest aurora stop
--success          #2F8F5C                                income, under-budget
--danger           #C7402E                                over-budget, destructive
--surface          rgba(255,255,255,0.70)                 glassy card
--surface-quiet    rgba(255,255,255,0.50)                 quieter cards, chip default
--on-dark-fg       #FFFFFF                                text on dark/violet surfaces
```

Dark mode is out of scope for v1.

### Typography (sans-serif only — no serifs)

Single family: **Geist** (variable, OFL). Variable weights 400 / 500 / 600 / 700. Tabular numerals for all numeric labels and amounts.

Bundled fallback: **Inter** (also OFL) if Geist is not available in the build.

Type scale:

```
numHero       Geist 700   56 / 60   tabular            home this-month total
display1      Geist 700   44 / 48   tabular            "1,850 Cal"-style hero numbers
display2      Geist 700   32 / 36                      large card heading
display3      Geist 600   22 / 28                      sheet title, section heading
bodyLg        Geist 500   17 / 24                      list row title
body          Geist 400   15 / 22                      default
caption       Geist 500   12 / 16   letter-spacing 0.6 / uppercase   small caps
mono          system mono 16 / 22                      reserved; rarely used
```

### Radii and elevation

```
--r-sm    8       chips inside detail rows
--r-md    14      fields, inner cards
--r-lg    22      hero cards, modals, bottom tab bar
--r-pill  999     selectable chip pills, primary action button
--shadow-1   0 1 2 rgba(20,16,12,0.04)              default
--shadow-2   0 12 32 rgba(20,16,12,0.08)            floating sheet, tab bar
--shadow-glow 0 0 80 rgba(111,119,224,0.20)         indigo soft halo
```

### Spacing

4-pt grid: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 48 / 64. Screen edge padding: 20. Card inset: 20. Section gap: 32.

## Motifs

### Aurora arch

The hero motif. A rounded "arch"-topped gradient surface used as the background of hero cards (home, reports, budgets summary).

- Shape: rounded rectangle with `r-lg` on the top corners and `r-md` (or 0) on the bottom; sometimes the bottom is clipped by the next card.
- Gradient (linear, top-to-bottom):
  - 0%   `#F4C7D6` (pink-300)
  - 35%  `#D6CBF2` (lilac-300)
  - 70%  `#6F77E0` (indigo-500)
  - 100% `#2B1F66` (blob-deep)
- Soft blur 80–120 (use a fixed gradient + mild noise overlay if hardware blur is too costly).
- Used as a *background* layer of a card; foreground content overlays it.

Implementation: `expo-linear-gradient` `LinearGradient` inside a `View` with `borderRadius` and `overflow: 'hidden'`.

### Half-arc gauge

Used for "78 / 100" style mini stats inside hero cards.

- Sweep ~140°, opening downward.
- Stroke 6, `--indigo-500` fill, `--hairline` track.
- Inside: `<Text variant="display3">78</Text>` + `<Text variant="caption" muted>/ 100</Text>` + caption sub-label.

Implementation: react-native-svg `Path` for the arc with stroke-dasharray for fill.

### Circular ring

Used for budget % / savings rate / 3-up stat rings (Fats / Carbs / Muscle equivalent → Top category / Income vs Expense / Savings rate).

- Diameter 160 (hero) / 84 (compact, 3-up) / 56 (row).
- Stroke 10 / 6 / 4.
- Track `--hairline`. Fill `--indigo-700` (deep). Over 100% switches to `--danger`.
- End cap rounded.
- Inner content: `<Text variant="display3">value</Text>` + small label below the ring (`<Text variant="caption" muted caps>Fats</Text>` style).

### Glassy chip pill

```
height 36, padding-x 14, radius pill
background --surface-quiet
border 1 hairline
selected: background --fg, text --on-dark-fg, border transparent
icon variants: 22 leading icon, content centered
```

Used for: currency / account / category / kind selection, period selectors, bottom tab labels.

### Stat triple

Three stacked elements: small-caps caption, hero number, optional sub-line.

```
LABEL                       caption muted caps
1,850                       display1 fg
650 left for today          body muted
```

Always left-aligned. Hero number uses tabular numerals.

### Mini bar chart

Daily-spend strip, 14 or 30 days.

- Bars width 8, gap 4, radius `--r-sm` on top corners only.
- Today: `--indigo-500`.
- Prior days: `--lilac-300`.

### Floating "+" tab

Center of bottom tab bar.

- 56dp circle, background `--fg`, icon `--on-dark-fg`.
- Subtle indigo inner-glow ring (1.5dp ring at `rgba(111,119,224,0.6)`).
- Sits *on top of* the tab bar surface, half-overlapping.
- Tap → `/txn/new`.

### Bottom tab bar

```
height 76 (iOS 64 + safe area), background --surface, blur if available
radius --r-lg on top corners
shadow --shadow-2
items: Home, Transactions, [+], Budgets, More
labels: caption muted; selected: caption fg
icons: line, hairline, fg color
```

## Component conventions

- Buttons:
  - **Primary**: pill, `--fg` bg, `--on-dark-fg` text, `bodyLg` weight 600.
  - **Accent**: pill, `--indigo-700` bg, `--on-dark-fg` text — for emphatic actions.
  - **Secondary**: pill, `--surface` bg + 1px hairline, `--fg` text.
  - **Ghost**: no border, `--indigo-500` text.
- Fields: 1px hairline, `--r-md`, focus border `--indigo-500`. Label sits above the field as `caption muted caps`.
- Lists: hairline dividers, no row chrome; section chrome lives at the section.
- Sheets: full-screen on mobile; spring-in from bottom; drag-to-dismiss.
- Empty states: display3 headline + body line + a single primary action.

## Screens — concrete direction

### Home (dashboard)

- Hero card with **Aurora arch** background.
  - Top-right: half-arc gauge "78 / 100 Good balance"-style — repurposed as "Budget health" (% of monthly budgets healthy).
  - Centered: stat triple (caption "THIS MONTH", `display1` amount in base currency, body muted "+1.2 vs last month" income delta).
- Sub-row of three glassy chips (Active / 30°C / etc → repurposed: "Today" / "This week" / "This month" period selector).
- Card 2: "Today's spend" mini bar chart (14 days).
- Card 3: 3-up circular rings — "Top category", "Income vs expense", "Savings rate".
- Card 4: pending recurring confirms (if any).
- List: 5 most recent transactions with hairline dividers.

### Quick-add sheet

- Full-bleed Aurora arch background at the top of the sheet (height 280).
- Sheet title `display3`.
- Amount input centered, `display1`, big custom numeric pad.
- Glassy chip rows, horizontally scrollable: currency / account / category / kind.
- Save: pill primary at the bottom; floating above keyboard.

### Transactions list

- Sticky search header with single Field; filter trigger as ghost button.
- Rows: title (merchant or category), caption with account + date + source tag, right-aligned amount in `display3` tabular.

### Budgets

- Hero card with Aurora arch + aggregate ring (total spent / total budgeted) + half-arc "Health".
- Each budget row: 56-ring on the left, name + spend / limit on the right, progress bar (mini).

### Reports

- Period selector as glassy chip row at top.
- Spend-by-category: pie with sans labels, drill-down opens a category detail.
- Trends: line chart, dot at current month in indigo-500.
- Savings rate: hero ring on Aurora arch.

### Settings

- No Aurora arch. Plain blush-cream + hairline list rows. Quieter than feature screens.

## Implementation tokens module

Add as Task 0.4 in the plan. Files:

```
src/ui/theme.ts          token constants and typed access
src/ui/Text.tsx          typed Text component picking from the type scale
src/ui/AuroraArch.tsx    rounded gradient arch background
src/ui/HalfArcGauge.tsx  half-arc gauge component
src/ui/Ring.tsx          circular ring component
src/ui/MiniBars.tsx      mini bar chart
src/ui/StatTriple.tsx    label / hero / subline composition
src/ui/TabBar.tsx        bottom tab bar with center floating "+"
```

All UI components from Phase 4 onwards consume these primitives. No inline color or font literals.

## Fonts

- Bundle Geist via `expo-font`. Fallback to Inter if Geist unavailable.
- Variable axes: keep default; do not animate axes.
- Licenses: Geist and Inter are SIL OFL — fine to ship.

## Accessibility

- Text contrast against `--bg`:
  - `--fg`: AAA at all sizes.
  - `--muted`: AA at body sizes.
  - `--indigo-500`: AA at large sizes only — never use for body text.
- Touch targets: 44 minimum.
- Honour `prefersReducedMotion`: skip Aurora arch animation, sheet transitions reduce to fade.

## Out of scope for v1

- Dark mode.
- Themed accent (locked to indigo).
- Complex chart interactions beyond tooltip.
- Lottie or vector illustration.
- Custom icon set — use lucide-react-native (line icons) tinted to `--fg`.
