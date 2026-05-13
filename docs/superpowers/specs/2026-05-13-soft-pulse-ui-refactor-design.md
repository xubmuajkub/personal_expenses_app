# Soft Pulse — UI Refactor Design

**Date:** 2026-05-13
**Target release:** v1.1.0
**Branch strategy:** Big bang on `main` (single long-lived feature branch → tag v1.1.0)
**Predecessor:** [2026-05-07-personal-expenses-ui.md](2026-05-07-personal-expenses-ui.md) — superseded once merged.

## 1. Goal

Refactor the UI from the v1.0.0 cream-white + violet aurora aesthetic to **Soft Pulse** — a hand-rolled dark glassmorphism look: deep violet base, neon "pulse" blob accents, dark frosted glass surfaces.

## 2. Non-negotiables

- **Hand-built primitives only.** No NativeBase, Tamagui, RN Paper, Magnus, UI Kitten, or any component framework.
- Allowed: React Native + StyleSheet + `expo-blur` + `expo-linear-gradient` + `react-native-svg` (already in deps) + `lucide-react-native` (new, for icons).
- **Token-driven only.** Zero inline color/font literals in `app/*`. All visuals come from `src/ui/theme.ts`.
- **OLED-friendly dark.** No light-mode toggle in v1.1; deferred.

## 3. Visual direction (locked)

Mockup B — Midnight Glass — from brainstorm 2026-05-13:

- Backdrop: deep violet gradient `#1A0F40 → #2B1F66 → #6F77E0` with 2 radial pulse blobs (pink, lilac/indigo) bleeding from screen corners
- Cards: dark frosted glass — translucent white tint over `expo-blur` BlurView with `tint="dark"` + hairline border
- Numbers: bright white, tabular-nums, large
- Type: Geist sans throughout
- Accents: neon pink / lilac / indigo / mint-green (success) / coral (danger)

## 4. Architecture

### 4.1 New directory layout (`src/ui/`)

```
src/ui/
  theme.ts                  rewritten — Soft Pulse tokens
  index.ts                  barrel re-exports
  atoms/                    NEW
    Glass.tsx               BlurView wrapper (intensity, radius, tint, border props)
    Pulse.tsx               radial gradient blob via SVG (color, size, opacity, blur, style)
    Surface.tsx             solid non-glass card (variant: raised|flat)
    Gradient.tsx            LinearGradient preset wrapper (preset: hero|pulse|sheet)
    Stack.tsx               flex layout helper (gap via space(n), direction, align)
  Text.tsx                  rewritten — new variants, default fg white
  Button.tsx                variants: primary|glass|ghost|danger
  Chip.tsx                  glass pill, selected state
  Field.tsx                 glass input + focus glow
  Sheet.tsx                 bottom sheet on gradient+glass
  TabBar.tsx                floating glass pill + center "+"
  Ring.tsx                  SVG ring with pulse-gradient fill
  HalfArcGauge.tsx          half-arc variant
  MiniBars.tsx              bar chart with vertical gradient bars
  StatTriple.tsx            label + numHero number + sub
  TxnRow.tsx                flat Surface row (NEVER wrap in Glass)
  RecurringConfirmCard.tsx  glass card with action buttons
  UndoToast.tsx             floating glass toast
  colorSwatches.ts          derived from color.cat* tokens
  charts/                   Victory wrappers, restyled (axis/line/fill colors)
```

Deleted: `AuroraArch.tsx` (replaced by `Gradient preset="hero"` + 2 `Pulse` atoms).

### 4.2 Dependency adds

- `expo-blur` (^55) — real backdrop blur
- `lucide-react-native` (latest) — icon set; tree-shakeable per-icon import

No other deps added. NativeWind explicitly rejected. No Tailwind config.

## 5. Design tokens (`src/ui/theme.ts`)

```ts
export const color = {
  // Backdrop
  bg:            '#0F0A20',
  bgRaised:      '#1A1530',
  bgHero:        '#2B1F66',

  // Foreground
  fg:            '#FFFFFF',
  fgQuiet:       'rgba(255,255,255,0.72)',
  muted:         'rgba(255,255,255,0.52)',
  disabled:      'rgba(255,255,255,0.28)',
  hairline:      'rgba(255,255,255,0.10)',

  // Glass tints
  glassSoft:     'rgba(255,255,255,0.06)',
  glassMed:      'rgba(255,255,255,0.10)',
  glassStrong:   'rgba(255,255,255,0.16)',
  glassBorder:   'rgba(255,255,255,0.18)',

  // Pulse accents
  pulsePink:     '#ED93B3',
  pulseLilac:    '#B0A0E4',
  pulseIndigo:   '#6F77E0',
  pulseDeep:     '#2B1F66',

  // Semantic
  success:       '#5DE0A4',
  danger:        '#FF7A6B',
  warning:       '#FFD66B',

  // Category dots (re-saturated for dark bg)
  catFood:       '#F8A1BC',
  catTransport:  '#C7B7F2',
  catBills:      '#86C5FF',
  catShopping:   '#FFD66B',
  catEntertain:  '#FF9F87',
} as const;

export const radius = { sm: 10, md: 16, lg: 22, xl: 28, pill: 999 } as const;

export const space = (n: number): number => n * 4;

export const fonts = { sans: 'Geist', mono: 'Menlo' } as const;

export const typeStyles = {
  numHero:  { fontFamily: fonts.sans, fontSize: 52, lineHeight: 56, fontWeight: '700', fontVariant: ['tabular-nums'], letterSpacing: -1 },
  display1: { fontFamily: fonts.sans, fontSize: 38, lineHeight: 42, fontWeight: '700', fontVariant: ['tabular-nums'], letterSpacing: -0.6 },
  display2: { fontFamily: fonts.sans, fontSize: 28, lineHeight: 32, fontWeight: '700' },
  display3: { fontFamily: fonts.sans, fontSize: 20, lineHeight: 26, fontWeight: '600' },
  bodyLg:   { fontFamily: fonts.sans, fontSize: 16, lineHeight: 22, fontWeight: '500' },
  body:     { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, fontWeight: '400' },
  caption:  { fontFamily: fonts.sans, fontSize: 11, lineHeight: 14, fontWeight: '500', letterSpacing: 1.2, textTransform: 'uppercase' },
  mono:     { fontFamily: fonts.mono, fontSize: 14, lineHeight: 20, fontVariant: ['tabular-nums'] },
} as const;

export const shadow = {
  s1:   { shadowColor: '#000', shadowOpacity: 0.30, shadowRadius: 8,  shadowOffset: { width: 0, height: 4  }, elevation: 2 },
  s2:   { shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 6 },
  glow: { shadowColor: '#6F77E0', shadowOpacity: 0.45, shadowRadius: 32, shadowOffset: { width: 0, height: 0 }, elevation: 10 },
} as const;

export const blur = {
  soft:   { intensity: 20, tint: 'dark' as const },
  med:    { intensity: 40, tint: 'dark' as const },
  strong: { intensity: 70, tint: 'dark' as const },
} as const;

export const gradient = {
  hero:  { colors: ['#1A0F40', '#2B1F66', '#6F77E0'] as const, locations: [0, 0.5, 1] as const, start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
  pulse: { colors: ['#ED93B3', '#B0A0E4', '#6F77E0', '#2B1F66'] as const, locations: [0, 0.35, 0.7, 1] as const },
  sheet: { colors: ['#1A1530', '#0F0A20'] as const, locations: [0, 1] as const, start: { x: 0, y: 0 }, end: { x: 0, y: 1 } },
} as const;
```

Removed from v1: `pink300/500`, `lilac300/500`, `indigo500/700`, `blobDeep`, `onDarkFg`, `surface`, `surfaceQuiet`, `aurora`.

## 6. Atoms

### Glass

```ts
type GlassProps = {
  intensity?: 'soft' | 'med' | 'strong';      // default 'med' — maps to blur tokens
  radius?: keyof typeof radius;                // default 'lg'
  tint?: 'glassSoft' | 'glassMed' | 'glassStrong'; // default matches intensity
  border?: boolean;                            // default true (rgba hairline)
  style?: ViewStyle;
  children: ReactNode;
};
```

Renders `<BlurView>` clipped to `radius`, then `<View>` absolute-fill overlay with `tint` bg + (when `border=true`) `1px` border of `color.glassBorder`, then `children` above. `overflow: 'hidden'` enforced.

### Pulse

```ts
type PulseProps = {
  color: string;                    // e.g. color.pulsePink
  size: number;                     // diameter
  opacity?: number;                 // default 0.55
  blur?: number;                    // default 40 — Gaussian blur on SVG filter
  style?: ViewStyle;
};
```

`<Svg><Defs><RadialGradient/><Filter id="b"><FeGaussianBlur stdDeviation={blur}/></Filter></Defs><Circle filter="url(#b)"/></Svg>`. Caller positions absolutely.

### Surface

```ts
type SurfaceProps = {
  variant?: 'raised' | 'flat';    // raised = bgRaised + s1 shadow; flat = transparent + hairline border-bottom
  radius?: keyof typeof radius;
  style?: ViewStyle;
  children: ReactNode;
};
```

### Gradient

```ts
type GradientProps = {
  preset: 'hero' | 'pulse' | 'sheet';
  style?: ViewStyle;
  children?: ReactNode;
};
```

Wraps `expo-linear-gradient` LinearGradient with token-driven colors/locations/start/end.

### Stack

```ts
type StackProps = {
  direction?: 'row' | 'col';     // default 'col'
  gap?: number;                  // multiplier into space(n); default 0
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  style?: ViewStyle;
  children: ReactNode;
};
```

## 7. Primitive contracts

Each primitive: keep public prop API stable from v1 where possible (so screens compile), rewrite internals to consume atoms + tokens.

| Primitive | Variants / props introduced | Atom usage |
|---|---|---|
| `Text` | tone: `default` (white) \| `muted` \| `onPulse` (white + drop-shadow) | none |
| `Button` | variant: `primary` \| `glass` \| `ghost` \| `danger`; sizes md/lg | Gradient (primary), Glass (glass/ghost) |
| `Chip` | selected boolean | Glass(soft \| strong) |
| `Field` | error state, floating label, leading icon slot | Glass(soft) |
| `Sheet` | header, dismissable | Gradient(sheet) + Glass(strong) overlay |
| `TabBar` | active tab, onAddPress | Glass(strong), centered Pulse button |
| `Ring` | progress 0..1, label | SVG with LinearGradient pulse fill |
| `HalfArcGauge` | progress 0..1, value | SVG, pulse fill |
| `MiniBars` | series, max | SVG with vertical pulse-gradient bars |
| `StatTriple` | label, value, sub, valueVariant, tone | none directly |
| `TxnRow` | txn, onPress, onSwipeDelete | Surface(flat) — **never Glass** |
| `RecurringConfirmCard` | rule, onConfirm, onSkip | Glass(med) |
| `UndoToast` | message, onUndo, visible | Glass(strong) |

`charts/*` (Victory wrappers): swap theme prop only. Axis/line/grid colors map to `color.muted` / `color.hairline`; fills use `gradient.pulse`.

## 8. Screen-level changes

Screens not listed = restyle only (no structural change) via primitive rebuilds.

### `app/_layout.tsx`
- Root bg = `color.bg`
- Status bar style = `light` (forced; remove per-screen StatusBar usage)

### `app/(tabs)/_layout.tsx`
- Custom `<TabBar>` replaces Expo Router default Tabs bar. Floats 16pt above safe-area bottom. Center "+" routes to `/txn/new`.

### `app/(tabs)/index.tsx` (Home)
- Hero (height 320, was 280): `<Gradient preset="hero">` + `<Pulse pulsePink>` top-right + `<Pulse pulseLilac>` bottom-left + `<StatTriple>` floating
- Section headers wrapped in `Stack direction="row" justify="between"`
- Recents = flat list of `TxnRow` with hairline separators (no glass)

### `app/(tabs)/transactions.tsx`
- Filter pill row at top using `<Chip>`
- Drop floating "+" (now in TabBar)
- List unchanged structure; restyled

### `app/txn/new.tsx` (Quick Add)
- Full-screen `<Gradient preset="sheet">` + 1 corner `<Pulse>`
- Amount = giant `numHero`, currency switch = inline chip row
- Category grid = 4-col glass tiles
- Submit = `<Button variant="primary">` full width

### `app/(tabs)/budgets.tsx`
- Budget cards = `<Glass intensity="med">` with inset `Ring`

### `app/(tabs)/more.tsx`
- Menu items = `<Glass intensity="soft">` rows with `lucide` icons left

### `app/settings/*`
- Section headers = `caption` uppercase + muted
- Rows = `Surface variant="flat"` + chevron-right `lucide` icon

### Reports / charts screens
- Container = `Surface variant="raised"`
- Charts handled via §7 charts changes

### `app/(auth)/*`, `app/(onboarding)/*`
- Background = `<Gradient preset="hero">` + 1 Pulse
- Google sign-in button = `<Button variant="glass">`

### Icons
- Replace any emoji icons with `lucide-react-native` imports (`Plus`, `ChevronRight`, `TrendingUp`, `TrendingDown`, `Wallet`, `Settings`, `BarChart3`, etc.)

## 9. Performance & platform rules

- **Never** wrap `TxnRow` in `Glass` (list virtualization assumes cheap rows). Enforced by code comment + manual review.
- **At most one BlurView per visible viewport** — hero, sheet, tab bar do not stack visually.
- **Never** put BlurView inside an `Animated.View` driving translate during gesture — recompose with BlurView outside the animated layer.
- **At most 2 `Pulse` atoms per screen** — SVG Gaussian blur is costly.
- iOS: native `UIVisualEffectView` — free.
- Android API ≥ 31: native blur. API < 31: flat tint fallback. Smoke-test on API 28.
- Reanimated 4 used for press/focus springs. `useReducedMotion` disables them.

## 10. Testing & verification

- **Unit (Jest + RTL-RN)**: atoms each get a test; existing primitive tests updated to assert new variants; theme token shape test extended.
- **Snapshots**: delete all old snapshots in commit 1 of branch; re-baseline with `jest -u` once, then no `-u`.
- **Type check**: `npm run typecheck` clean before merge.
- **Lint**: `npm run lint --max-warnings 0` clean. ESLint rule prohibiting inline color/font literals in `app/*` stays active.
- **E2E**: existing Maestro flows in `e2e/flows/` pass unchanged.
- **Manual smoke matrix**: iOS sim iPhone 15; Android emu API 34 + API 28. Routes: Home, Transactions, Quick Add, Budgets, More, Settings, Auth, Onboarding, Reports.
- **Manual visual sweep**: capture screenshots of every route; compare to mockup B.
- **A11y**: contrast — white on `#0F0A20` = 18:1; white on `#2B1F66` = 13:1; muted on bg = 8.5:1. Tap targets ≥ 44pt. `useReducedMotion` honored.

## 11. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Android blur fallback unreadable on old devices | Dark tint floor + opaque shadow keep card edges visible even when blur is flat |
| Contributor wraps `TxnRow` in `Glass` later | Code comment in `TxnRow.tsx` + add to CLAUDE.md architectural rules |
| Snapshot churn swamps PR review | Delete all old snapshots in branch's first commit, separate from logic commits |
| Per-screen `StatusBar` overrides regress style | Centralize in `app/_layout.tsx`; grep for `StatusBar` usage and remove elsewhere |
| Reanimated 4 + BlurView glitching on some Android builds | Render BlurView outside Animated layers; smoke-test scroll-to-top + sheet open |

## 12. Sequencing inside the branch

1. Theme token rewrite (`src/ui/theme.ts`)
2. Delete old snapshots; add `expo-blur` + `lucide-react-native`
3. Build atoms + atom tests
4. Rebuild primitives in dep order: `Text` → `Button`/`Chip`/`Field` → `Sheet`/`TabBar` → `Ring`/`HalfArcGauge`/`MiniBars` → `StatTriple`/`TxnRow`/`RecurringConfirmCard`/`UndoToast`
5. Delete `AuroraArch.tsx`; rewrite `colorSwatches.ts`
6. Screen updates: Home → Quick Add → Transactions → Budgets → More → Settings → Auth/Onboarding → Reports
7. Status bar + root layout
8. Manual visual sweep + screenshot baseline
9. Tag v1.1.0

## 13. Acceptance criteria

- [ ] All existing Jest tests pass on new snapshots
- [ ] `npm run typecheck` clean
- [ ] `npm run lint --max-warnings 0` clean
- [ ] Maestro flows pass unchanged
- [ ] iOS + Android (API 34 + API 28) smoke pass on every route
- [ ] No inline color/font literals in `app/*` (ESLint enforces)
- [ ] No `Glass` wrapping `TxnRow` (manual review of `src/ui/TxnRow.tsx`)
- [ ] A11y contrast checks documented in §10 pass on real devices
- [ ] Only new runtime deps: `expo-blur`, `lucide-react-native`
- [ ] `AuroraArch.tsx` deleted; `colorSwatches.ts` derives from `color.cat*`
- [ ] Tag `v1.1.0` pushed

## 14. Out of scope (v1.2+)

- Light-mode toggle (Soft Pulse is dark-only for v1.1)
- Animated "breathing" pulse loop on hero blobs (static for v1.1)
- Custom haptics
- Themed app icon refresh
- Per-user theme variants

## 15. Decision log

| # | Question | Decision | Rationale |
|---|---|---|---|
| 1 | Refactor scope | Primitives + screens | User picked over tokens-only / primitives-only |
| 2 | Visual direction | B — Midnight Glass | Picked from 3 mockups (A cream, B midnight, C aurora-pulse) |
| 3 | Styling approach | StyleSheet + theme tokens | No new deps; matches current pattern |
| 4 | Glass tech | `expo-blur` real BlurView | Premium feel justifies native dep |
| 5 | Rollout | Big bang on `main` → v1.1.0 | One coherent ship, no half-state |
| 6 | Primitive structure | Atomic base + composed | Best reuse; clear design system |
| 7 | UI lib ban | Hand-built only (no NativeBase/Tamagui/etc.) | User constraint (verbatim) |
| 8 | Icons | `lucide-react-native` | Tree-shakeable; aesthetic fits glassmorphism |
