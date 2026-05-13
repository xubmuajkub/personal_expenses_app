# Soft Pulse UI Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the UI from v1.0.0 cream/aurora aesthetic to **Soft Pulse** — dark glassmorphism (deep violet base, neon pulse blobs, dark frosted glass), shipping as v1.1.0 via a single big-bang feature branch.

**Architecture:** Atomic primitives (Glass, Pulse, Surface, Gradient, Stack) under `src/ui/atoms/`, with all existing primitives in `src/ui/` rebuilt on top of them. New tokens in `src/ui/theme.ts`. Real backdrop blur via `expo-blur`. Public prop APIs of existing primitives kept stable (old prop values aliased to new tokens) so most screens compile unchanged. Screen-level structural edits only where layout itself changes.

**Tech Stack:** React Native + Expo SDK 55, TypeScript strict, StyleSheet/inline-style (no NativeWind), `expo-blur` (new), `expo-linear-gradient` (existing), `react-native-svg` (existing), `lucide-react-native` (new), Jest + jest-expo, Reanimated 4.

**Spec:** [`docs/superpowers/specs/2026-05-13-soft-pulse-ui-refactor-design.md`](../specs/2026-05-13-soft-pulse-ui-refactor-design.md)

---

## Conventions used in this plan

- Test files live under `__tests__/ui/` (root-level, matches existing convention — see `__tests__/ui/theme.test.ts`).
- Type-only imports must use `import type` (eslint `@typescript-eslint/consistent-type-imports` is `error`).
- Path alias: `@/...` → `src/...`, `@app/...` → `app/...`.
- Every TDD pair (failing test → impl → passing) gets its own commit.
- Commit subjects use Conventional Commits (`feat(ui):`, `refactor(ui):`, `chore:` etc.) — matches branch style.

---

## Phase 0 — Setup

### Task 0.1: Create feature branch

**Files:** none

- [ ] **Step 1: Create branch from main**

```bash
git checkout main && git pull --ff-only && git checkout -b feat/soft-pulse-ui
```

Expected: switched to a new branch `feat/soft-pulse-ui`.

---

### Task 0.2: Add `expo-blur` runtime dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install dependency**

```bash
npx expo install expo-blur
```

Expected: `expo-blur` added to `dependencies` at the SDK 55 compatible version (≈^14.x). `package-lock.json` updated.

- [ ] **Step 2: Verify install**

```bash
grep '"expo-blur"' package.json
```

Expected: line shows the resolved version.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): add expo-blur for Soft Pulse glassmorphism"
```

---

### Task 0.3: Add `lucide-react-native` icon dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install dependency**

```bash
npm install lucide-react-native
```

`lucide-react-native` peer-depends on `react-native-svg` which is already in deps — no extra install needed.

- [ ] **Step 2: Verify**

```bash
grep '"lucide-react-native"' package.json
```

Expected: line shows the installed version.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): add lucide-react-native for icon set"
```

---

### Task 0.4: Wipe stale Jest snapshots (baseline reset)

**Files:**
- Delete: all `__snapshots__/` directories under `__tests__/` and `src/`

- [ ] **Step 1: Find and delete snapshot directories**

```bash
find __tests__ src -type d -name __snapshots__ -print -exec rm -rf {} + 2>/dev/null; echo done
```

Expected: paths of any deleted dirs printed, then `done`. If none exist, only `done` prints.

- [ ] **Step 2: Verify none remain**

```bash
find __tests__ src -type d -name __snapshots__ 2>/dev/null | wc -l
```

Expected: `0`.

- [ ] **Step 3: Commit (skip if no snapshots existed)**

```bash
git status
# If anything is staged for deletion:
git add -A && git commit -m "test(ui): reset snapshot baseline for Soft Pulse refactor"
```

---

## Phase 1 — Design tokens

### Task 1.1: Rewrite token tests for Soft Pulse

**Files:**
- Modify: `__tests__/ui/theme.test.ts`

- [ ] **Step 1: Replace test file**

Full new contents of `__tests__/ui/theme.test.ts`:

```ts
import { typeStyles, color, gradient, blur, radius, space } from '@/ui/theme';

describe('theme (Soft Pulse)', () => {
  it('uses dark midnight base', () => {
    expect(color.bg).toBe('#0F0A20');
    expect(color.bgRaised).toBe('#1A1530');
    expect(color.bgHero).toBe('#2B1F66');
  });

  it('default foreground is pure white', () => {
    expect(color.fg).toBe('#FFFFFF');
  });

  it('exposes glass tint scale', () => {
    expect(color.glassSoft).toMatch(/^rgba\(255,255,255,0\.0?6\)$/);
    expect(color.glassMed).toMatch(/^rgba\(255,255,255,0\.10?\)$/);
    expect(color.glassStrong).toMatch(/^rgba\(255,255,255,0\.16?\)$/);
  });

  it('exposes pulse accent palette', () => {
    expect(color.pulsePink).toBe('#ED93B3');
    expect(color.pulseLilac).toBe('#B0A0E4');
    expect(color.pulseIndigo).toBe('#6F77E0');
    expect(color.pulseDeep).toBe('#2B1F66');
  });

  it('exposes blur intensity tokens with dark tint', () => {
    expect(blur.soft.intensity).toBe(20);
    expect(blur.med.intensity).toBe(40);
    expect(blur.strong.intensity).toBe(70);
    expect(blur.soft.tint).toBe('dark');
    expect(blur.med.tint).toBe('dark');
    expect(blur.strong.tint).toBe('dark');
  });

  it('exposes hero/pulse/sheet gradient presets', () => {
    expect(gradient.hero.colors[0]).toBe('#1A0F40');
    expect(gradient.hero.colors[gradient.hero.colors.length - 1]).toBe('#6F77E0');
    expect(gradient.pulse.colors).toEqual(['#ED93B3', '#B0A0E4', '#6F77E0', '#2B1F66']);
    expect(gradient.sheet.colors).toEqual(['#1A1530', '#0F0A20']);
  });

  it('uses Geist sans for hero numbers with tabular numerals', () => {
    expect(typeStyles.numHero.fontFamily).toBe('Geist');
    expect(typeStyles.numHero.fontVariant).toContain('tabular-nums');
  });

  it('all non-mono type uses Geist sans', () => {
    for (const [name, t] of Object.entries(typeStyles)) {
      if (name === 'mono') continue;
      expect(t.fontFamily).toBe('Geist');
    }
  });

  it('radius scale includes xl rung', () => {
    expect(radius.xl).toBe(28);
    expect(radius.pill).toBe(999);
  });

  it('space helper multiplies by 4', () => {
    expect(space(3)).toBe(12);
  });
});
```

- [ ] **Step 2: Run; expect failure**

```bash
npm test -- __tests__/ui/theme.test.ts
```

Expected: tests fail (token names don't exist on the v1 theme yet). Move on.

---

### Task 1.2: Rewrite `src/ui/theme.ts` with Soft Pulse tokens

**Files:**
- Modify: `src/ui/theme.ts`

- [ ] **Step 1: Replace file contents**

Full new contents of `src/ui/theme.ts`:

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

  // Category dots
  catFood:       '#F8A1BC',
  catTransport:  '#C7B7F2',
  catBills:      '#86C5FF',
  catShopping:   '#FFD66B',
  catEntertain:  '#FF9F87',
} as const;

export const radius = { sm: 10, md: 16, lg: 22, xl: 28, pill: 999 } as const;

export const space = (n: number): number => n * 4;

export const fonts = { sans: 'Geist', mono: 'Menlo' } as const;

export type TypeStyleName =
  | 'numHero' | 'display1' | 'display2' | 'display3'
  | 'bodyLg' | 'body' | 'caption' | 'mono';

export const typeStyles: Record<TypeStyleName, {
  fontFamily: string; fontSize: number; lineHeight: number;
  fontWeight: '400' | '500' | '600' | '700';
  letterSpacing?: number; fontVariant?: ('tabular-nums')[]; textTransform?: 'uppercase';
}> = {
  numHero:  { fontFamily: fonts.sans, fontSize: 52, lineHeight: 56, fontWeight: '700', fontVariant: ['tabular-nums'], letterSpacing: -1 },
  display1: { fontFamily: fonts.sans, fontSize: 38, lineHeight: 42, fontWeight: '700', fontVariant: ['tabular-nums'], letterSpacing: -0.6 },
  display2: { fontFamily: fonts.sans, fontSize: 28, lineHeight: 32, fontWeight: '700' },
  display3: { fontFamily: fonts.sans, fontSize: 20, lineHeight: 26, fontWeight: '600' },
  bodyLg:   { fontFamily: fonts.sans, fontSize: 16, lineHeight: 22, fontWeight: '500' },
  body:     { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, fontWeight: '400' },
  caption:  { fontFamily: fonts.sans, fontSize: 11, lineHeight: 14, fontWeight: '500', letterSpacing: 1.2, textTransform: 'uppercase' },
  mono:     { fontFamily: fonts.mono, fontSize: 14, lineHeight: 20, fontWeight: '400', fontVariant: ['tabular-nums'] },
};

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
  hero: {
    colors: ['#1A0F40', '#2B1F66', '#6F77E0'] as const,
    locations: [0, 0.5, 1] as const,
    start: { x: 0, y: 0 } as const,
    end:   { x: 1, y: 1 } as const,
  },
  pulse: {
    colors: ['#ED93B3', '#B0A0E4', '#6F77E0', '#2B1F66'] as const,
    locations: [0, 0.35, 0.7, 1] as const,
    start: { x: 0, y: 0 } as const,
    end:   { x: 1, y: 1 } as const,
  },
  sheet: {
    colors: ['#1A1530', '#0F0A20'] as const,
    locations: [0, 1] as const,
    start: { x: 0, y: 0 } as const,
    end:   { x: 0, y: 1 } as const,
  },
} as const;
```

- [ ] **Step 2: Run tests; expect pass**

```bash
npm test -- __tests__/ui/theme.test.ts
```

Expected: all token tests pass.

- [ ] **Step 3: TypeScript compile check (will likely fail because old token names are referenced elsewhere — that's expected; record the errors but continue; downstream tasks fix them)**

```bash
npm run typecheck 2>&1 | head -60
```

Expected: errors referencing `color.pink500`, `color.indigo500`, `color.indigo700`, `color.surface`, `color.onDarkFg`, `aurora` from various files in `src/ui/` and `app/`. Acceptable for now — every consumer is rewritten downstream.

- [ ] **Step 4: Commit**

```bash
git add src/ui/theme.ts __tests__/ui/theme.test.ts
git commit -m "feat(ui): Soft Pulse design tokens (dark base, glass scale, pulse gradient)"
```

---

## Phase 2 — Atoms

Atoms have zero internal dependencies on each other (except Glass uses no atom). Build leaf-first.

### Task 2.1: `Gradient` atom

**Files:**
- Create: `src/ui/atoms/Gradient.tsx`
- Create: `__tests__/ui/atoms/Gradient.test.tsx`

- [ ] **Step 1: Write failing test**

`__tests__/ui/atoms/Gradient.test.tsx`:

```tsx
import { render } from '@testing-library/react-native';
import { Gradient } from '@/ui/atoms/Gradient';
import { Text } from 'react-native';

describe('Gradient atom', () => {
  it('renders children', () => {
    const { getByText } = render(<Gradient preset="hero"><Text>hi</Text></Gradient>);
    expect(getByText('hi')).toBeTruthy();
  });

  it('exposes the preset name via testID', () => {
    const { getByTestId } = render(<Gradient preset="sheet" testID="g" />);
    expect(getByTestId('g').props.preset).toBe('sheet');
  });
});
```

- [ ] **Step 2: Run; expect fail**

```bash
npm test -- __tests__/ui/atoms/Gradient.test.tsx
```

Expected: module not found.

- [ ] **Step 3: Implement**

`src/ui/atoms/Gradient.tsx`:

```tsx
import type { ReactNode } from 'react';
import type { ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { gradient as G } from '@/ui/theme';

export type GradientPreset = keyof typeof G;

type Props = {
  preset: GradientPreset;
  style?: ViewStyle;
  children?: ReactNode;
  testID?: string;
};

export function Gradient({ preset, style, children, testID }: Props) {
  const g = G[preset];
  return (
    <LinearGradient
      colors={g.colors as unknown as string[]}
      locations={g.locations as unknown as number[]}
      start={g.start}
      end={g.end}
      style={style}
      testID={testID}
      // expose preset for test introspection
      {...({ preset } as object)}
    >
      {children}
    </LinearGradient>
  );
}
```

- [ ] **Step 4: Run; expect pass**

```bash
npm test -- __tests__/ui/atoms/Gradient.test.tsx
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/ui/atoms/Gradient.tsx __tests__/ui/atoms/Gradient.test.tsx
git commit -m "feat(ui): add Gradient atom (preset wrapper for LinearGradient)"
```

---

### Task 2.2: `Stack` atom

**Files:**
- Create: `src/ui/atoms/Stack.tsx`
- Create: `__tests__/ui/atoms/Stack.test.tsx`

- [ ] **Step 1: Write failing test**

`__tests__/ui/atoms/Stack.test.tsx`:

```tsx
import { render } from '@testing-library/react-native';
import { Stack } from '@/ui/atoms/Stack';
import { Text } from 'react-native';

describe('Stack atom', () => {
  it('renders children in a column by default', () => {
    const { getByTestId } = render(
      <Stack testID="s"><Text>a</Text></Stack>,
    );
    const node = getByTestId('s');
    const style = Array.isArray(node.props.style) ? node.props.style.find((x: object) => x && 'flexDirection' in x) : node.props.style;
    expect(style.flexDirection).toBe('column');
  });

  it('uses space(n) for gap', () => {
    const { getByTestId } = render(<Stack gap={3} testID="s" />);
    const node = getByTestId('s');
    const style = Array.isArray(node.props.style) ? Object.assign({}, ...node.props.style.filter(Boolean)) : node.props.style;
    expect(style.gap).toBe(12);
  });
});
```

- [ ] **Step 2: Run; expect fail**

```bash
npm test -- __tests__/ui/atoms/Stack.test.tsx
```

Expected: module not found.

- [ ] **Step 3: Implement**

`src/ui/atoms/Stack.tsx`:

```tsx
import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import { space } from '@/ui/theme';

type Align = 'start' | 'center' | 'end' | 'stretch';
type Justify = 'start' | 'center' | 'end' | 'between' | 'around';

const alignMap: Record<Align, ViewStyle['alignItems']> = {
  start: 'flex-start', center: 'center', end: 'flex-end', stretch: 'stretch',
};
const justifyMap: Record<Justify, ViewStyle['justifyContent']> = {
  start: 'flex-start', center: 'center', end: 'flex-end', between: 'space-between', around: 'space-around',
};

type Props = {
  direction?: 'row' | 'col';
  gap?: number;
  align?: Align;
  justify?: Justify;
  style?: ViewStyle;
  children?: ReactNode;
  testID?: string;
};

export function Stack({ direction = 'col', gap = 0, align, justify, style, children, testID }: Props) {
  return (
    <View
      testID={testID}
      style={[
        {
          flexDirection: direction === 'row' ? 'row' : 'column',
          gap: space(gap),
          alignItems: align ? alignMap[align] : undefined,
          justifyContent: justify ? justifyMap[justify] : undefined,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
```

- [ ] **Step 4: Run; expect pass**

```bash
npm test -- __tests__/ui/atoms/Stack.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/ui/atoms/Stack.tsx __tests__/ui/atoms/Stack.test.tsx
git commit -m "feat(ui): add Stack atom (flex layout helper)"
```

---

### Task 2.3: `Surface` atom

**Files:**
- Create: `src/ui/atoms/Surface.tsx`
- Create: `__tests__/ui/atoms/Surface.test.tsx`

- [ ] **Step 1: Write failing test**

`__tests__/ui/atoms/Surface.test.tsx`:

```tsx
import { render } from '@testing-library/react-native';
import { Surface } from '@/ui/atoms/Surface';
import { color } from '@/ui/theme';
import { Text } from 'react-native';

describe('Surface atom', () => {
  it('raised variant uses bgRaised', () => {
    const { getByTestId } = render(<Surface testID="s" variant="raised"><Text>x</Text></Surface>);
    const style = Object.assign({}, ...(getByTestId('s').props.style as object[]).filter(Boolean));
    expect(style.backgroundColor).toBe(color.bgRaised);
  });

  it('flat variant has transparent bg and hairline bottom border', () => {
    const { getByTestId } = render(<Surface testID="s" variant="flat"><Text>x</Text></Surface>);
    const style = Object.assign({}, ...(getByTestId('s').props.style as object[]).filter(Boolean));
    expect(style.backgroundColor).toBe('transparent');
    expect(style.borderBottomColor).toBe(color.hairline);
  });
});
```

- [ ] **Step 2: Run; expect fail**

```bash
npm test -- __tests__/ui/atoms/Surface.test.tsx
```

- [ ] **Step 3: Implement**

`src/ui/atoms/Surface.tsx`:

```tsx
import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import { color, radius as R, shadow } from '@/ui/theme';

type Props = {
  variant?: 'raised' | 'flat';
  radius?: keyof typeof R;
  style?: ViewStyle;
  children?: ReactNode;
  testID?: string;
};

export function Surface({ variant = 'raised', radius = 'lg', style, children, testID }: Props) {
  const variantStyle: ViewStyle =
    variant === 'raised'
      ? { backgroundColor: color.bgRaised, borderRadius: R[radius], ...shadow.s1 }
      : { backgroundColor: 'transparent', borderBottomWidth: 1, borderBottomColor: color.hairline };
  return (
    <View testID={testID} style={[variantStyle, style]}>
      {children}
    </View>
  );
}
```

- [ ] **Step 4: Run; expect pass**

```bash
npm test -- __tests__/ui/atoms/Surface.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/ui/atoms/Surface.tsx __tests__/ui/atoms/Surface.test.tsx
git commit -m "feat(ui): add Surface atom (raised/flat solid card)"
```

---

### Task 2.4: `Pulse` atom

**Files:**
- Create: `src/ui/atoms/Pulse.tsx`
- Create: `__tests__/ui/atoms/Pulse.test.tsx`

- [ ] **Step 1: Write failing test**

`__tests__/ui/atoms/Pulse.test.tsx`:

```tsx
import { render } from '@testing-library/react-native';
import { Pulse } from '@/ui/atoms/Pulse';

describe('Pulse atom', () => {
  it('renders an SVG container of the requested size', () => {
    const { getByTestId } = render(<Pulse color="#ED93B3" size={120} testID="p" />);
    const node = getByTestId('p');
    expect(node.props.width).toBe(120);
    expect(node.props.height).toBe(120);
  });
});
```

- [ ] **Step 2: Run; expect fail**

```bash
npm test -- __tests__/ui/atoms/Pulse.test.tsx
```

- [ ] **Step 3: Implement**

`src/ui/atoms/Pulse.tsx`:

```tsx
import type { ViewStyle } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Circle, Filter, FeGaussianBlur } from 'react-native-svg';

type Props = {
  color: string;
  size: number;
  opacity?: number;
  blur?: number;
  style?: ViewStyle;
  testID?: string;
};

export function Pulse({ color, size, opacity = 0.55, blur = 40, style, testID }: Props) {
  const id = `pulse-${color.replace(/[^a-z0-9]/gi, '')}`;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2;
  return (
    <Svg width={size} height={size} style={style} pointerEvents="none" testID={testID}>
      <Defs>
        <RadialGradient id={`grad-${id}`} cx={cx} cy={cy} r={r} fx={cx} fy={cy} gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={color} stopOpacity={opacity} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
        <Filter id={`flt-${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <FeGaussianBlur stdDeviation={blur} />
        </Filter>
      </Defs>
      <Circle cx={cx} cy={cy} r={r} fill={`url(#grad-${id})`} filter={`url(#flt-${id})`} />
    </Svg>
  );
}
```

- [ ] **Step 4: Run; expect pass**

```bash
npm test -- __tests__/ui/atoms/Pulse.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/ui/atoms/Pulse.tsx __tests__/ui/atoms/Pulse.test.tsx
git commit -m "feat(ui): add Pulse atom (radial-gradient blob via SVG)"
```

---

### Task 2.5: `Glass` atom

**Files:**
- Create: `src/ui/atoms/Glass.tsx`
- Create: `__tests__/ui/atoms/Glass.test.tsx`

- [ ] **Step 1: Write failing test**

`__tests__/ui/atoms/Glass.test.tsx`:

```tsx
import { render } from '@testing-library/react-native';
import { Glass } from '@/ui/atoms/Glass';
import { blur, color } from '@/ui/theme';
import { Text } from 'react-native';

describe('Glass atom', () => {
  it('default intensity is med and maps to blur.med.intensity', () => {
    const { getByTestId } = render(<Glass testID="g"><Text>x</Text></Glass>);
    expect(getByTestId('g').props.intensity).toBe(blur.med.intensity);
    expect(getByTestId('g').props.tint).toBe('dark');
  });

  it('renders children', () => {
    const { getByText } = render(<Glass><Text>hello</Text></Glass>);
    expect(getByText('hello')).toBeTruthy();
  });

  it('strong intensity maps correctly', () => {
    const { getByTestId } = render(<Glass intensity="strong" testID="g" />);
    expect(getByTestId('g').props.intensity).toBe(blur.strong.intensity);
  });

  it('border overlay uses glassBorder color when enabled', () => {
    const { getByTestId } = render(<Glass intensity="med" border testID="g"><Text>x</Text></Glass>);
    // The overlay View carries the border; we expose it as the first sibling testID 'g-overlay'
    const overlay = getByTestId('g-overlay');
    const style = Object.assign({}, ...(overlay.props.style as object[]).filter(Boolean));
    expect(style.borderColor).toBe(color.glassBorder);
    expect(style.borderWidth).toBe(1);
  });
});
```

- [ ] **Step 2: Run; expect fail**

```bash
npm test -- __tests__/ui/atoms/Glass.test.tsx
```

- [ ] **Step 3: Implement**

`src/ui/atoms/Glass.tsx`:

```tsx
import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { blur as Blur, color, radius as R } from '@/ui/theme';

type Intensity = 'soft' | 'med' | 'strong';
type Tint = 'glassSoft' | 'glassMed' | 'glassStrong';
const defaultTintForIntensity: Record<Intensity, Tint> = {
  soft: 'glassSoft', med: 'glassMed', strong: 'glassStrong',
};

type Props = {
  intensity?: Intensity;
  radius?: keyof typeof R;
  tint?: Tint;
  border?: boolean;
  style?: ViewStyle;
  children?: ReactNode;
  testID?: string;
};

export function Glass({
  intensity = 'med',
  radius = 'lg',
  tint,
  border = true,
  style,
  children,
  testID,
}: Props) {
  const b = Blur[intensity];
  const tintColor = color[tint ?? defaultTintForIntensity[intensity]];
  const containerStyle: ViewStyle = {
    borderRadius: R[radius],
    overflow: 'hidden',
  };
  return (
    <View testID={testID ? `${testID}-wrap` : undefined} style={[containerStyle, style]}>
      <BlurView intensity={b.intensity} tint={b.tint} testID={testID} style={{ position: 'absolute', inset: 0 as unknown as number, top: 0, left: 0, right: 0, bottom: 0 }} />
      <View
        testID={testID ? `${testID}-overlay` : undefined}
        pointerEvents="none"
        style={[
          { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: tintColor, borderRadius: R[radius] },
          border && { borderWidth: 1, borderColor: color.glassBorder },
        ]}
      />
      <View>{children}</View>
    </View>
  );
}
```

- [ ] **Step 4: Run; expect pass**

```bash
npm test -- __tests__/ui/atoms/Glass.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/ui/atoms/Glass.tsx __tests__/ui/atoms/Glass.test.tsx
git commit -m "feat(ui): add Glass atom (BlurView + tint overlay + border)"
```

---

### Task 2.6: Atom barrel + run full atom suite

**Files:**
- Create: `src/ui/atoms/index.ts`

- [ ] **Step 1: Write barrel**

`src/ui/atoms/index.ts`:

```ts
export { Glass } from './Glass';
export { Pulse } from './Pulse';
export { Surface } from './Surface';
export { Gradient } from './Gradient';
export { Stack } from './Stack';
```

- [ ] **Step 2: Run all atom tests**

```bash
npm test -- __tests__/ui/atoms
```

Expected: all atom tests pass.

- [ ] **Step 3: Typecheck atoms in isolation**

```bash
npx tsc --noEmit src/ui/atoms/index.ts 2>&1 | head -30 || true
```

(Atoms shouldn't introduce errors; surrounding files still will until later phases.)

- [ ] **Step 4: Commit**

```bash
git add src/ui/atoms/index.ts
git commit -m "feat(ui): atoms barrel re-export"
```

---

## Phase 3 — Foundation primitive: Text

### Task 3.1: Rewrite `Text` (keep legacy tone names as aliases)

**Files:**
- Modify: `src/ui/Text.tsx`
- Create: `__tests__/ui/Text.test.tsx`

- [ ] **Step 1: Write failing test**

`__tests__/ui/Text.test.tsx`:

```tsx
import { render } from '@testing-library/react-native';
import { Text } from '@/ui/Text';
import { color } from '@/ui/theme';

function styleOf(node: { props: { style: unknown } }): Record<string, unknown> {
  const s = node.props.style;
  if (Array.isArray(s)) return Object.assign({}, ...s.filter(Boolean) as object[]);
  return s as Record<string, unknown>;
}

describe('Text', () => {
  it('default tone is white', () => {
    const { getByText } = render(<Text>hi</Text>);
    expect(styleOf(getByText('hi')).color).toBe(color.fg);
  });

  it('muted tone maps to color.muted', () => {
    const { getByText } = render(<Text tone="muted">hi</Text>);
    expect(styleOf(getByText('hi')).color).toBe(color.muted);
  });

  it('legacy tone "onDark" still resolves (aliased to fg)', () => {
    const { getByText } = render(<Text tone="onDark">hi</Text>);
    expect(styleOf(getByText('hi')).color).toBe(color.fg);
  });

  it('legacy tone "indigo" resolves to pulseIndigo', () => {
    const { getByText } = render(<Text tone="indigo">hi</Text>);
    expect(styleOf(getByText('hi')).color).toBe(color.pulseIndigo);
  });

  it('legacy tone "pink" resolves to pulsePink', () => {
    const { getByText } = render(<Text tone="pink">hi</Text>);
    expect(styleOf(getByText('hi')).color).toBe(color.pulsePink);
  });
});
```

- [ ] **Step 2: Run; expect fail**

```bash
npm test -- __tests__/ui/Text.test.tsx
```

- [ ] **Step 3: Replace `src/ui/Text.tsx`**

```tsx
import { Text as RNText, type TextProps } from 'react-native';
import { typeStyles, color, type TypeStyleName } from './theme';

type Tone =
  | 'fg' | 'default' | 'muted' | 'success' | 'danger' | 'onPulse'
  // Legacy v1 tone names — kept for backward compatibility with existing screens.
  | 'indigo' | 'pink' | 'onDark';

type Props = TextProps & {
  variant?: TypeStyleName;
  tone?: Tone;
  caps?: boolean;
};

const tones: Record<Tone, string> = {
  fg: color.fg,
  default: color.fg,
  muted: color.muted,
  success: color.success,
  danger: color.danger,
  onPulse: color.fg,
  // Legacy aliases:
  indigo: color.pulseIndigo,
  pink: color.pulsePink,
  onDark: color.fg,
};

export function Text({ variant = 'body', tone = 'fg', caps, style, ...rest }: Props) {
  const t = typeStyles[variant];
  return (
    <RNText
      {...rest}
      style={[
        t,
        { color: tones[tone] },
        tone === 'onPulse' && { textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 8 },
        caps && { textTransform: 'uppercase' },
        style,
      ]}
    />
  );
}
```

- [ ] **Step 4: Run; expect pass**

```bash
npm test -- __tests__/ui/Text.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/ui/Text.tsx __tests__/ui/Text.test.tsx
git commit -m "feat(ui): rebuild Text on Soft Pulse tokens (legacy tones aliased)"
```

---

## Phase 4 — Interactive primitives

### Task 4.1: Rewrite `Button`

**Files:**
- Modify: `src/ui/Button.tsx`
- Create: `__tests__/ui/Button.test.tsx`

- [ ] **Step 1: Write failing test**

`__tests__/ui/Button.test.tsx`:

```tsx
import { fireEvent, render } from '@testing-library/react-native';
import { Button } from '@/ui/Button';

describe('Button', () => {
  it('renders title and fires onPress', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button title="Save" onPress={onPress} />);
    fireEvent.press(getByText('Save'));
    expect(onPress).toHaveBeenCalled();
  });

  it('legacy "accent" variant still renders', () => {
    const { getByText } = render(<Button title="Acc" variant="accent" onPress={() => {}} />);
    expect(getByText('Acc')).toBeTruthy();
  });

  it('legacy "secondary" variant still renders', () => {
    const { getByText } = render(<Button title="Sec" variant="secondary" onPress={() => {}} />);
    expect(getByText('Sec')).toBeTruthy();
  });

  it('danger variant renders', () => {
    const { getByText } = render(<Button title="Del" variant="danger" onPress={() => {}} />);
    expect(getByText('Del')).toBeTruthy();
  });

  it('disabled is reflected in accessibilityState', () => {
    const { getByRole } = render(<Button title="x" onPress={() => {}} disabled />);
    expect(getByRole('button').props.accessibilityState.disabled).toBe(true);
  });
});
```

- [ ] **Step 2: Run; expect fail**

```bash
npm test -- __tests__/ui/Button.test.tsx
```

- [ ] **Step 3: Replace `src/ui/Button.tsx`**

```tsx
import { Pressable, ActivityIndicator, View, type ViewStyle } from 'react-native';
import { Text } from './Text';
import { Glass } from './atoms/Glass';
import { Gradient } from './atoms/Gradient';
import { color, radius, shadow, space } from './theme';

export type ButtonVariant =
  | 'primary' | 'glass' | 'ghost' | 'danger'
  // Legacy aliases:
  | 'accent' | 'secondary';

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: ButtonVariant;
  style?: ViewStyle;
  accessibilityLabel?: string;
};

function resolveVariant(v: ButtonVariant): 'primary' | 'glass' | 'ghost' | 'danger' {
  if (v === 'accent') return 'primary';
  if (v === 'secondary') return 'glass';
  return v;
}

const baseLayout: ViewStyle = {
  paddingVertical: 14,
  paddingHorizontal: 18,
  borderRadius: radius.pill,
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 48,
};

export function Button({
  title, onPress, loading, disabled, variant = 'primary', style, accessibilityLabel,
}: Props) {
  const v = resolveVariant(variant);
  const isInactive = !!loading || !!disabled;
  const inner = (
    <View style={[baseLayout, isInactive && { opacity: 0.55 }]}>
      {loading ? <ActivityIndicator color={color.fg} /> : <Text variant="bodyLg" tone="default">{title}</Text>}
    </View>
  );
  const press = (
    <Pressable
      onPress={onPress}
      disabled={isInactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: isInactive, busy: !!loading }}
      style={({ pressed }) => [pressed && { opacity: 0.85 }, style]}
    >
      {v === 'primary' && (
        <Gradient preset="pulse" style={[baseLayout, shadow.glow, { padding: 0 }]}>
          {inner}
        </Gradient>
      )}
      {v === 'glass' && <Glass intensity="med" radius="pill">{inner}</Glass>}
      {v === 'ghost' && <View style={[baseLayout, { borderWidth: 1, borderColor: color.glassBorder }]}>{inner}</View>}
      {v === 'danger' && <View style={[baseLayout, { backgroundColor: color.danger, paddingHorizontal: space(5) }]}>{inner}</View>}
    </Pressable>
  );
  return press;
}
```

- [ ] **Step 4: Run; expect pass**

```bash
npm test -- __tests__/ui/Button.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/ui/Button.tsx __tests__/ui/Button.test.tsx
git commit -m "feat(ui): rebuild Button with primary/glass/ghost/danger variants"
```

---

### Task 4.2: Rewrite `Chip`

**Files:**
- Modify: `src/ui/Chip.tsx`
- Create: `__tests__/ui/Chip.test.tsx`

- [ ] **Step 1: Write failing test**

`__tests__/ui/Chip.test.tsx`:

```tsx
import { fireEvent, render } from '@testing-library/react-native';
import { Chip } from '@/ui/Chip';

describe('Chip', () => {
  it('reflects selected state via accessibility', () => {
    const { getByRole } = render(<Chip label="Food" selected onPress={() => {}} />);
    expect(getByRole('button').props.accessibilityState.selected).toBe(true);
  });
  it('fires onPress', () => {
    const fn = jest.fn();
    const { getByText } = render(<Chip label="Tap" onPress={fn} />);
    fireEvent.press(getByText('Tap'));
    expect(fn).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run; expect fail**

```bash
npm test -- __tests__/ui/Chip.test.tsx
```

- [ ] **Step 3: Replace `src/ui/Chip.tsx`**

```tsx
import { Pressable } from 'react-native';
import { Text } from './Text';
import { Glass } from './atoms/Glass';
import { color, radius, space } from './theme';

type Props = {
  label: string;
  selected?: boolean;
  onPress: () => void;
};

export function Chip({ label, selected, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      style={{ marginRight: space(2), marginBottom: space(2) }}
    >
      <Glass
        intensity={selected ? 'strong' : 'soft'}
        radius="pill"
        border
        style={{
          paddingHorizontal: space(3),
          paddingVertical: space(2),
          borderRadius: radius.pill,
          minHeight: 32,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text variant="caption" tone="default" style={{ color: selected ? color.fg : color.fgQuiet }}>
          {label}
        </Text>
      </Glass>
    </Pressable>
  );
}
```

- [ ] **Step 4: Run; expect pass**

```bash
npm test -- __tests__/ui/Chip.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/ui/Chip.tsx __tests__/ui/Chip.test.tsx
git commit -m "feat(ui): rebuild Chip as glass pill"
```

---

### Task 4.3: Rewrite `Field`

**Files:**
- Modify: `src/ui/Field.tsx`
- Create: `__tests__/ui/Field.test.tsx`

- [ ] **Step 1: Read current `src/ui/Field.tsx` to capture its current prop API**

```bash
cat src/ui/Field.tsx
```

Note the props (label, value, onChangeText, error, etc.). Preserve names.

- [ ] **Step 2: Write failing test**

`__tests__/ui/Field.test.tsx`:

```tsx
import { fireEvent, render } from '@testing-library/react-native';
import { Field } from '@/ui/Field';

describe('Field', () => {
  it('shows label and value', () => {
    const { getByDisplayValue, getByText } = render(
      <Field label="Amount" value="42" onChangeText={() => {}} />,
    );
    expect(getByText('Amount')).toBeTruthy();
    expect(getByDisplayValue('42')).toBeTruthy();
  });
  it('reports change events', () => {
    const fn = jest.fn();
    const { getByDisplayValue } = render(<Field label="X" value="a" onChangeText={fn} />);
    fireEvent.changeText(getByDisplayValue('a'), 'b');
    expect(fn).toHaveBeenCalledWith('b');
  });
});
```

- [ ] **Step 3: Run; expect fail**

```bash
npm test -- __tests__/ui/Field.test.tsx
```

- [ ] **Step 4: Replace `src/ui/Field.tsx`**

```tsx
import { useState } from 'react';
import { View, TextInput, type TextInputProps } from 'react-native';
import { Text } from './Text';
import { Glass } from './atoms/Glass';
import { color, radius, space } from './theme';

type Props = Omit<TextInputProps, 'style'> & {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  error?: string;
};

export function Field({ label, value, onChangeText, error, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: space(3) }}>
      <Text variant="caption" tone="muted" style={{ marginBottom: space(1) }}>{label}</Text>
      <Glass
        intensity="soft"
        radius="md"
        border
        style={{
          borderRadius: radius.md,
          paddingHorizontal: space(3),
          paddingVertical: space(2),
          borderWidth: 1,
          borderColor: error ? color.danger : focused ? color.pulseIndigo : color.glassBorder,
        }}
      >
        <TextInput
          {...rest}
          value={value}
          onChangeText={onChangeText}
          onFocus={(e) => { setFocused(true); rest.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); rest.onBlur?.(e); }}
          placeholderTextColor={color.muted}
          style={{ color: color.fg, fontSize: 16, lineHeight: 22, minHeight: 28 }}
        />
      </Glass>
      {error ? <Text variant="caption" tone="danger" style={{ marginTop: space(1) }}>{error}</Text> : null}
    </View>
  );
}
```

- [ ] **Step 5: Run; expect pass**

```bash
npm test -- __tests__/ui/Field.test.tsx
```

- [ ] **Step 6: Commit**

```bash
git add src/ui/Field.tsx __tests__/ui/Field.test.tsx
git commit -m "feat(ui): rebuild Field as glass input with focus glow"
```

---

## Phase 5 — Surface primitives

### Task 5.1: Rewrite `Sheet`

**Files:**
- Modify: `src/ui/Sheet.tsx`

- [ ] **Step 1: Read current Sheet to capture prop API**

```bash
cat src/ui/Sheet.tsx
```

- [ ] **Step 2: Replace `src/ui/Sheet.tsx`**

```tsx
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Gradient } from './atoms/Gradient';
import { Glass } from './atoms/Glass';
import { color, radius, space } from './theme';

type Props = {
  children: ReactNode;
  testID?: string;
};

export function Sheet({ children, testID }: Props) {
  return (
    <View
      testID={testID}
      style={{
        borderTopLeftRadius: radius.xl,
        borderTopRightRadius: radius.xl,
        overflow: 'hidden',
      }}
    >
      <Gradient preset="sheet" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      <Glass intensity="strong" radius="xl" border>
        <View style={{ alignItems: 'center', paddingTop: space(2) }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: color.glassBorder }} />
        </View>
        <View style={{ padding: space(4) }}>{children}</View>
      </Glass>
    </View>
  );
}
```

- [ ] **Step 3: Typecheck** (Sheet has no own test yet — relies on consumer flows)

```bash
npm run typecheck 2>&1 | grep -E '(Sheet\.tsx|cannot find)' | head -20 || true
```

- [ ] **Step 4: Commit**

```bash
git add src/ui/Sheet.tsx
git commit -m "feat(ui): rebuild Sheet on gradient+glass overlay"
```

---

### Task 5.2: Rewrite `TabBar`

**Files:**
- Modify: `src/ui/TabBar.tsx`

- [ ] **Step 1: Read current TabBar**

```bash
cat src/ui/TabBar.tsx
```

Capture: what tabs it renders, how it gets `state`/`descriptors`/`navigation` from React Navigation (it's a `BottomTabBar` replacement), and how the `+` button is wired.

- [ ] **Step 2: Replace `src/ui/TabBar.tsx`**

```tsx
import { Pressable, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { Glass } from './atoms/Glass';
import { Gradient } from './atoms/Gradient';
import { Text } from './Text';
import { color, radius, shadow, space } from './theme';

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View
      style={{
        position: 'absolute',
        left: space(4),
        right: space(4),
        bottom: insets.bottom + space(4),
      }}
    >
      <Glass intensity="strong" radius="pill" border style={[shadow.s2, { borderRadius: radius.pill }]}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: space(3),
            paddingVertical: space(2),
            gap: space(2),
          }}
        >
          {state.routes.map((route, idx) => {
            const isFocused = state.index === idx;
            const { options } = descriptors[route.key]!;
            const label =
              typeof options.tabBarLabel === 'string'
                ? options.tabBarLabel
                : options.title ?? route.name;
            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityLabel={label}
                accessibilityState={{ selected: isFocused }}
                onPress={() => {
                  const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                  if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name as never);
                }}
                style={{ flex: 1, alignItems: 'center', paddingVertical: space(2) }}
              >
                <Text variant="caption" tone={isFocused ? 'default' : 'muted'}>{label}</Text>
                {isFocused ? (
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      marginTop: 4,
                      backgroundColor: color.pulseIndigo,
                    }}
                  />
                ) : null}
              </Pressable>
            );
          })}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add transaction"
            onPress={() => router.push('/txn/new')}
            style={{ marginLeft: space(1) }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                overflow: 'hidden',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Gradient preset="pulse" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
              <Plus size={22} color={color.fg} />
            </View>
          </Pressable>
        </View>
      </Glass>
    </View>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/ui/TabBar.tsx
git commit -m "feat(ui): rebuild TabBar as floating glass pill with pulse + add button"
```

---

## Phase 6 — Data viz primitives

### Task 6.1: Rewrite `Ring`

**Files:**
- Modify: `src/ui/Ring.tsx`

- [ ] **Step 1: Read current Ring**

```bash
cat src/ui/Ring.tsx
```

Capture props: `progress`, `label`, `size`, etc.

- [ ] **Step 2: Replace `src/ui/Ring.tsx`**

```tsx
import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Text } from './Text';
import { color, gradient } from './theme';

type Props = {
  progress: number;
  size?: number;
  thickness?: number;
  label?: string;
};

export function Ring({ progress, size = 96, thickness = 10, label }: Props) {
  const clamped = Math.max(0, Math.min(1, progress));
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - clamped);
  const id = 'ring-pulse-grad';
  const stops = gradient.pulse.colors.map((col, i) => (
    <Stop key={col} offset={`${gradient.pulse.locations[i]}`} stopColor={col} />
  ));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">{stops}</LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={color.glassMed} strokeWidth={thickness} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={`url(#${id})`}
          strokeWidth={thickness}
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {label ? (
        <View style={{ position: 'absolute' }}>
          <Text variant="display3" tone="default">{label}</Text>
        </View>
      ) : null}
    </View>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/ui/Ring.tsx
git commit -m "feat(ui): rebuild Ring with pulse-gradient fill"
```

---

### Task 6.2: Rewrite `HalfArcGauge`

**Files:**
- Modify: `src/ui/HalfArcGauge.tsx`

- [ ] **Step 1: Read current**

```bash
cat src/ui/HalfArcGauge.tsx
```

- [ ] **Step 2: Replace** — same gradient approach as Ring but rendered as a half-arc path. Reuse the `gradient.pulse` `<Defs>` block. Track stroke = `color.glassMed`; gauge stroke = `url(#gauge-pulse-grad)`. Tick labels = `color.muted`. Keep current prop names.

(Concrete code follows the same template as Task 6.1; substitute the path `d` attribute for the half-arc geometry from the existing file.)

- [ ] **Step 3: Commit**

```bash
git add src/ui/HalfArcGauge.tsx
git commit -m "feat(ui): rebuild HalfArcGauge with pulse-gradient fill"
```

---

### Task 6.3: Rewrite `MiniBars`

**Files:**
- Modify: `src/ui/MiniBars.tsx`

- [ ] **Step 1: Read current**

```bash
cat src/ui/MiniBars.tsx
```

- [ ] **Step 2: Replace** — bars filled with a vertical LinearGradient `pulseLilac → pulseIndigo`; background grid lines `color.hairline`; baseline label `color.muted`. Keep current prop names.

```tsx
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { color } from './theme';

type Props = {
  data: number[];
  width?: number;
  height?: number;
};

export function MiniBars({ data, width = 200, height = 60 }: Props) {
  const max = Math.max(1, ...data);
  const bw = width / Math.max(1, data.length) - 4;
  const id = 'mini-bars-grad';
  return (
    <View>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color.pulseLilac} />
            <Stop offset="1" stopColor={color.pulseIndigo} />
          </LinearGradient>
        </Defs>
        {data.map((v, i) => {
          const h = (v / max) * height;
          return (
            <Rect
              key={i}
              x={i * (bw + 4)}
              y={height - h}
              width={bw}
              height={h}
              rx={3}
              fill={`url(#${id})`}
            />
          );
        })}
      </Svg>
    </View>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/ui/MiniBars.tsx
git commit -m "feat(ui): rebuild MiniBars with vertical pulse gradient"
```

---

## Phase 7 — Composite primitives

### Task 7.1: Rewrite `StatTriple`

**Files:**
- Modify: `src/ui/StatTriple.tsx`

- [ ] **Step 1: Read current**

```bash
cat src/ui/StatTriple.tsx
```

- [ ] **Step 2: Replace**

```tsx
import { View } from 'react-native';
import { Text } from './Text';
import { color, space, type TypeStyleName } from './theme';

type Props = {
  label: string;
  value: string;
  sub?: string;
  valueVariant?: TypeStyleName;
  tone?: 'default' | 'onPulse';
};

export function StatTriple({ label, value, sub, valueVariant = 'numHero', tone = 'default' }: Props) {
  return (
    <View style={{ gap: space(1) }}>
      <Text variant="caption" tone="muted">{label}</Text>
      <Text variant={valueVariant} tone={tone}>{value}</Text>
      {sub ? (
        <Text variant="body" style={{ color: sub.startsWith('+') ? color.pulsePink : color.muted }}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/ui/StatTriple.tsx
git commit -m "feat(ui): rebuild StatTriple with new type scale and pulse-pink income delta"
```

---

### Task 7.2: Rewrite `TxnRow` (Surface-only — never Glass)

**Files:**
- Modify: `src/ui/TxnRow.tsx`

- [ ] **Step 1: Read current**

```bash
cat src/ui/TxnRow.tsx
```

- [ ] **Step 2: Replace** — keep prop API. Important constraint: **never wrap in Glass** (perf). Use `Surface variant="flat"` for the hairline separator effect.

```tsx
// IMPORTANT: TxnRow MUST NOT be wrapped in <Glass>. BlurView in a long list
// destroys scroll performance on Android. Use Surface(flat) only. See
// docs/superpowers/specs/2026-05-13-soft-pulse-ui-refactor-design.md §9.
import { Pressable, View } from 'react-native';
import type { Transaction } from '@/domain/types';
import { Surface } from './atoms/Surface';
import { Text } from './Text';
import { color, space } from './theme';
import { format } from '@/domain/money';

type Props = {
  txn: Transaction;
  onPress?: () => void;
};

function dotColor(category?: string | null): string {
  switch (category) {
    case 'food': return color.catFood;
    case 'transport': return color.catTransport;
    case 'bills': return color.catBills;
    case 'shopping': return color.catShopping;
    case 'entertainment': return color.catEntertain;
    default: return color.muted;
  }
}

export function TxnRow({ txn, onPress }: Props) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <Surface
        variant="flat"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: space(4),
          paddingVertical: space(3),
          gap: space(3),
        }}
      >
        <View
          style={{
            width: 28, height: 28, borderRadius: 14,
            backgroundColor: dotColor(txn.category_id ?? null),
          }}
        />
        <View style={{ flex: 1 }}>
          <Text variant="bodyLg" tone="default" numberOfLines={1}>
            {txn.merchant ?? 'Transaction'}
          </Text>
          {txn.note ? (
            <Text variant="body" tone="muted" numberOfLines={1}>{txn.note}</Text>
          ) : null}
        </View>
        <Text variant="bodyLg" tone="default" style={{ fontVariant: ['tabular-nums'] }}>
          {format(txn.amount, txn.currency)}
        </Text>
      </Surface>
    </Pressable>
  );
}
```

(Adjust the `Transaction` field names — `merchant`, `note`, `category_id`, `amount`, `currency` — to match the actual type in `src/domain/types.ts`. If a field doesn't exist, drop the line.)

- [ ] **Step 3: Commit**

```bash
git add src/ui/TxnRow.tsx
git commit -m "feat(ui): rebuild TxnRow on Surface(flat) — never wrap in Glass"
```

---

### Task 7.3: Rewrite `RecurringConfirmCard`

**Files:**
- Modify: `src/ui/RecurringConfirmCard.tsx`

- [ ] **Step 1: Read current to capture prop signature**

```bash
cat src/ui/RecurringConfirmCard.tsx
```

- [ ] **Step 2: Replace** — wrap in `<Glass intensity="med">`, swap action buttons to `<Button variant="glass">` (Skip) and `<Button variant="primary">` (Confirm). Keep `rule`, `onConfirm`, `onSkip` props.

```tsx
import { View } from 'react-native';
import type { RecurringRule } from '@/db/repos/recurring_rules';
import { Glass } from './atoms/Glass';
import { Button } from './Button';
import { Text } from './Text';
import { space } from './theme';
import { format } from '@/domain/money';

type Props = {
  rule: RecurringRule;
  onConfirm: (ruleId: string) => void;
  onSkip: (ruleId: string) => void;
};

export function RecurringConfirmCard({ rule, onConfirm, onSkip }: Props) {
  return (
    <View style={{ paddingHorizontal: space(4), marginBottom: space(3) }}>
      <Glass intensity="med" radius="lg" border style={{ padding: space(4), gap: space(2) }}>
        <Text variant="caption" tone="muted">RECURRING</Text>
        <Text variant="bodyLg" tone="default">{rule.merchant ?? 'Recurring charge'}</Text>
        <Text variant="display3" tone="default">{format(rule.amount, rule.currency)}</Text>
        <View style={{ flexDirection: 'row', gap: space(2), marginTop: space(2) }}>
          <View style={{ flex: 1 }}>
            <Button title="Skip" variant="glass" onPress={() => onSkip(rule.id)} />
          </View>
          <View style={{ flex: 1 }}>
            <Button title="Confirm" variant="primary" onPress={() => onConfirm(rule.id)} />
          </View>
        </View>
      </Glass>
    </View>
  );
}
```

(Adjust `rule` field names to match `src/db/repos/recurring_rules.ts`. Drop fields that don't exist.)

- [ ] **Step 3: Commit**

```bash
git add src/ui/RecurringConfirmCard.tsx
git commit -m "feat(ui): rebuild RecurringConfirmCard on glass card"
```

---

### Task 7.4: Rewrite `UndoToast`

**Files:**
- Modify: `src/ui/UndoToast.tsx`

- [ ] **Step 1: Read current**

```bash
cat src/ui/UndoToast.tsx
```

- [ ] **Step 2: Replace** — wrap content in `<Glass intensity="strong">`. Keep visibility/animation behavior intact (likely Reanimated translate). **Move BlurView outside any `Animated.View` translate** per spec §9.

```tsx
import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Glass } from './atoms/Glass';
import { Text } from './Text';
import { color, shadow, space } from './theme';

type Props = {
  visible: boolean;
  message: string;
  onUndo: () => void;
};

export function UndoToast({ visible, message, onUndo }: Props) {
  const insets = useSafeAreaInsets();
  const y = useSharedValue(-100);

  useEffect(() => {
    y.value = withTiming(visible ? 0 : -100, { duration: 220 });
  }, [visible, y]);

  // BlurView stays outside the translate by mounting the Glass below the animated wrapper.
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[
        animatedStyle,
        {
          position: 'absolute',
          top: insets.top + space(2),
          left: space(4),
          right: space(4),
        },
      ]}
    >
      <Glass intensity="strong" radius="lg" border style={[shadow.s2]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: space(3), gap: space(3) }}>
          <Text variant="body" tone="default" style={{ flex: 1 }}>{message}</Text>
          <Pressable accessibilityRole="button" onPress={onUndo}>
            <Text variant="bodyLg" style={{ color: color.pulseIndigo }}>Undo</Text>
          </Pressable>
        </View>
      </Glass>
    </Animated.View>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/ui/UndoToast.tsx
git commit -m "feat(ui): rebuild UndoToast on glass-strong with reanimated translate"
```

---

## Phase 8 — Cleanup of obsolete UI pieces

### Task 8.1: Delete `AuroraArch.tsx`

**Files:**
- Delete: `src/ui/AuroraArch.tsx`

- [ ] **Step 1: Delete file**

```bash
git rm src/ui/AuroraArch.tsx
```

- [ ] **Step 2: Confirm no remaining imports compile-wise (typecheck)**

```bash
npm run typecheck 2>&1 | grep -i AuroraArch | head -10 || true
```

If anything still imports `AuroraArch`, Phase 9 screen tasks will replace those imports — don't fix here.

- [ ] **Step 3: Commit**

```bash
git commit -m "refactor(ui): remove AuroraArch (replaced by Gradient + Pulse atoms)"
```

---

### Task 8.2: Rewrite `colorSwatches.ts`

**Files:**
- Modify: `src/ui/colorSwatches.ts`

- [ ] **Step 1: Replace**

```ts
import { color } from './theme';

export const swatches = [
  color.catFood,
  color.catTransport,
  color.catBills,
  color.catShopping,
  color.catEntertain,
  color.pulsePink,
  color.pulseLilac,
  color.pulseIndigo,
];

export function pickSwatch(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return swatches[Math.abs(hash) % swatches.length]!;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/ui/colorSwatches.ts
git commit -m "refactor(ui): derive colorSwatches from cat* + pulse tokens"
```

---

### Task 8.3: Restyle `charts/` (Victory theme)

**Files:**
- Modify: every file under `src/ui/charts/`

- [ ] **Step 1: List chart files**

```bash
ls src/ui/charts/
```

- [ ] **Step 2: For each chart file, replace axis/line/grid colors**

Replace literal calls or theme passes to Victory components so that:
- `axisLabel.color` / `tickLabels.fill` / `axis.stroke` → `color.muted`
- `grid.stroke` → `color.hairline`
- Bar/area fills → `color.pulseIndigo` (single-series) or pass a vertical `LinearGradient` defs with `pulseLilac → pulseIndigo`

Look for the existing chart files and apply token swaps consistently. Keep `prop` types unchanged.

- [ ] **Step 3: Commit**

```bash
git add src/ui/charts
git commit -m "refactor(ui): restyle Victory charts with Soft Pulse tokens"
```

---

## Phase 9 — Screens

Screens are touched in dependency order. Each task: read the file, identify imports/literals to replace, apply edits, run `npm run typecheck` after each commit and fix errors before moving on.

### Task 9.1: Root layout

**Files:**
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Read current**

```bash
cat app/_layout.tsx
```

- [ ] **Step 2: Apply edits**

Ensure root `View` background is `color.bg`. Force `<StatusBar style="light" />`. Confirm `SafeAreaProvider` remains.

```tsx
// In app/_layout.tsx, ensure:
import { StatusBar } from 'expo-status-bar';
import { color } from '@/ui/theme';

// ...
<View style={{ flex: 1, backgroundColor: color.bg }}>
  <StatusBar style="light" />
  {/* existing providers + Slot */}
</View>
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add app/_layout.tsx
git commit -m "feat(app): root layout uses Soft Pulse bg + light status bar"
```

---

### Task 9.2: Tabs layout uses custom TabBar

**Files:**
- Modify: `app/(tabs)/_layout.tsx`

- [ ] **Step 1: Read current**

```bash
cat app/\(tabs\)/_layout.tsx
```

- [ ] **Step 2: Replace tabBar with custom component**

```tsx
import { Tabs } from 'expo-router';
import { TabBar } from '@/ui/TabBar';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <TabBar {...props} />}
    >
      {/* existing <Tabs.Screen /> entries unchanged */}
    </Tabs>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/\(tabs\)/_layout.tsx
git commit -m "feat(app): mount custom floating TabBar"
```

---

### Task 9.3: Home tab — hero rewrite

**Files:**
- Modify: `app/(tabs)/index.tsx`

- [ ] **Step 1: Replace hero block**

Replace the `<AuroraArch>`-based hero with:

```tsx
import { Gradient } from '@/ui/atoms/Gradient';
import { Pulse } from '@/ui/atoms/Pulse';
import { color } from '@/ui/theme';

const HERO_HEIGHT = 320;

// ...inside the ScrollView, replace the hero View:
<View style={{ position: 'relative', height: HERO_HEIGHT, marginBottom: space(4), overflow: 'hidden' }}>
  <Gradient preset="hero" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
  <Pulse color={color.pulsePink} size={260} style={{ position: 'absolute', top: -60, right: -80 }} />
  <Pulse color={color.pulseLilac} size={300} style={{ position: 'absolute', bottom: -100, left: -80 }} />
  <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, padding: space(5), justifyContent: 'flex-end' }}>
    <StatTriple
      label="This month"
      value={format(spend, base)}
      sub={`+${format(income, base)} income`}
      valueVariant="display1"
      tone="onPulse"
    />
  </View>
</View>
```

Remove the `AuroraArch` import.

- [ ] **Step 2: Update body bg literal** (already `color.bg` — confirm token value swap auto-applies).

- [ ] **Step 3: Typecheck + commit**

```bash
npm run typecheck 2>&1 | head -20
git add app/\(tabs\)/index.tsx
git commit -m "feat(app): Home hero rebuilt on Gradient+Pulse atoms"
```

---

### Task 9.4: Quick Add screen

**Files:**
- Modify: `app/txn/new.tsx`

- [ ] **Step 1: Read current**

```bash
cat app/txn/new.tsx
```

- [ ] **Step 2: Apply structural edits**

Wrap the screen body in:

```tsx
import { Gradient } from '@/ui/atoms/Gradient';
import { Pulse } from '@/ui/atoms/Pulse';
import { color, space } from '@/ui/theme';

// Outer:
<View style={{ flex: 1, backgroundColor: color.bg }}>
  <Gradient preset="sheet" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
  <Pulse color={color.pulseIndigo} size={280} style={{ position: 'absolute', top: -100, right: -100 }} />
  {/* existing ScrollView/content goes here */}
</View>
```

- Amount input: ensure `<Text variant="numHero">` wraps the formatted display.
- Currency switcher: replace any dropdown with inline `<Chip>` row.
- Category grid: render as 4-column glass tiles (use `<Glass intensity="soft" radius="md">` per tile).
- Submit: ensure `<Button variant="primary" />` full width.

- [ ] **Step 3: Commit**

```bash
git add app/txn/new.tsx
git commit -m "feat(app): Quick Add screen on Soft Pulse layout (gradient + chip currency + glass category grid)"
```

---

### Task 9.5: Transactions tab

**Files:**
- Modify: `app/(tabs)/transactions.tsx`

- [ ] **Step 1: Apply edits**

- Drop the floating "+" button (moved to TabBar).
- Filter row at top uses `<Chip>`.
- List rendering remains unchanged (already `TxnRow`).
- Remove `tone="onDark"` / `tone="indigo"` usages (now aliased — purely cosmetic to clean up, optional).

- [ ] **Step 2: Commit**

```bash
git add app/\(tabs\)/transactions.tsx
git commit -m "feat(app): Transactions tab uses chip filters; drop floating add (moved to TabBar)"
```

---

### Task 9.6: Budgets

**Files:**
- Modify: `app/(tabs)/budgets.tsx`
- Modify: `app/budgets/[id].tsx`

- [ ] **Step 1: Wrap budget cards in `<Glass intensity="med">`**

In each budget card, replace any surrounding `View` with:

```tsx
import { Glass } from '@/ui/atoms/Glass';

<Glass intensity="med" radius="lg" border style={{ padding: space(4), marginBottom: space(3) }}>
  {/* existing Ring + label content */}
</Glass>
```

- [ ] **Step 2: Commit**

```bash
git add app/\(tabs\)/budgets.tsx app/budgets/\[id\].tsx
git commit -m "feat(app): Budgets cards wrapped in Glass(med)"
```

---

### Task 9.7: More tab

**Files:**
- Modify: `app/(tabs)/more.tsx`

- [ ] **Step 1: Apply edits**

Each menu item row → `<Glass intensity="soft" radius="md">` containing a `<View flexDirection="row">` with a `lucide-react-native` icon on the left, label center, chevron-right icon on the right.

```tsx
import { Settings as SettingsIcon, ChevronRight, FileText, BarChart3 } from 'lucide-react-native';
import { Glass } from '@/ui/atoms/Glass';
import { color, space } from '@/ui/theme';

// Item template:
<Pressable onPress={...}>
  <Glass intensity="soft" radius="md" border style={{ marginBottom: space(2) }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', padding: space(3), gap: space(3) }}>
      <SettingsIcon size={20} color={color.fg} />
      <Text variant="bodyLg" style={{ flex: 1 }}>Settings</Text>
      <ChevronRight size={18} color={color.muted} />
    </View>
  </Glass>
</Pressable>
```

- [ ] **Step 2: Commit**

```bash
git add app/\(tabs\)/more.tsx
git commit -m "feat(app): More menu rows on Glass(soft) with lucide icons"
```

---

### Task 9.8: Settings sweep

**Files:**
- Modify: all `app/settings/*.tsx` (`about.tsx`, `base-currency.tsx`, `data.tsx`, `diagnostics.tsx`, `fx.tsx`, `merchant-rules.tsx`, `merchant-rules/[id].tsx`, `notif-rules/index.tsx`, `notif-rules/[id].tsx`, `notif-rules/tester.tsx`, `notifications.tsx`, `profile.tsx`, `index.tsx`)

- [ ] **Step 1: For each file**, apply:
  - Replace any `<View>` row container with `<Surface variant="flat">` (or keep `<View>` if structural)
  - Replace right-arrow text/emoji with `<ChevronRight size={18} color={color.muted} />` from `lucide-react-native`
  - Section headers: ensure `<Text variant="caption" tone="muted">` (CAPS via the `caption` typeStyle's `textTransform`)

- [ ] **Step 2: Per-file commits**, e.g.:

```bash
git add app/settings/about.tsx
git commit -m "feat(app): settings/about Soft Pulse restyle"
```

Repeat for each settings file. Smaller commits make review easier.

---

### Task 9.9: Auth + Onboarding sweep

**Files:**
- Modify: `app/(auth)/sign-in.tsx`
- Modify: `app/(onboarding)/android-battery-opt.tsx`
- Modify: `app/(onboarding)/android-notif-permission.tsx`
- Modify: any other files in `app/(onboarding)/`

- [ ] **Step 1: For each file**:
  - Wrap screen body in `<Gradient preset="hero">` + one `<Pulse>` accent
  - Replace any `<Button variant="secondary">` with `<Button variant="glass">` (legacy alias still works — this swap is for clarity)
  - Replace `tone="indigo"` / `tone="onDark"` text props with `tone="default"` or `tone="onPulse"`

- [ ] **Step 2: Per-file commit**, e.g.:

```bash
git add app/\(auth\)/sign-in.tsx
git commit -m "feat(app): sign-in screen on gradient hero + pulse accent"
```

---

### Task 9.10: Reports sweep

**Files:**
- Modify: `app/reports/index.tsx`
- Modify: `app/reports/savings-rate.tsx`

- [ ] **Step 1: Apply edits**

- Outer screen bg = `color.bg`
- Chart container = `<Surface variant="raised" radius="lg" style={{ padding: space(4), margin: space(4) }}>`
- Replace any `tone="onDark"`/`tone="indigo"` text with the matching new tone

- [ ] **Step 2: Commit**

```bash
git add app/reports
git commit -m "feat(app): Reports screens on raised Surface containers"
```

---

### Task 9.11: Misc routes sweep

**Files:**
- Modify: `app/accounts/index.tsx`, `app/accounts/[id].tsx`
- Modify: `app/categories/index.tsx`, `app/categories/[id].tsx`
- Modify: `app/recurring/index.tsx`
- Modify: `app/transfer/*.tsx` (if any)
- Modify: `app/txn/[id]/index.tsx`, `app/txn/[id]/attach-receipt.tsx`
- Modify: `app/txn/add.tsx`

- [ ] **Step 1: Per file**:
  - Body bg = `color.bg` (already a token; verify)
  - Replace deprecated tone/variant literals (`tone="indigo"`, `variant="accent"`, `variant="secondary"`) with new names (`default`, `primary`, `glass`) — purely cosmetic since aliases work
  - Convert simple row separators to `<Surface variant="flat">`

- [ ] **Step 2: Per-file commits**

---

### Task 9.12: Clear orphaned imports / token uses

**Files:** any remaining

- [ ] **Step 1: Search for any lingering references to removed tokens**

```bash
grep -rn 'color\.pink500\|color\.pink300\|color\.lilac500\|color\.lilac300\|color\.indigo500\|color\.indigo700\|color\.blobDeep\|color\.onDarkFg\|color\.surface\b\|color\.surfaceQuiet\|\baurora\b' src app
```

Expected: zero matches outside of `theme.test.ts` history (the rewritten one shouldn't reference them either).

- [ ] **Step 2: If any remain**, replace with the closest new token:

| Old | New |
|---|---|
| `color.pink300` / `pink500` | `color.pulsePink` |
| `color.lilac300` / `lilac500` | `color.pulseLilac` |
| `color.indigo500` | `color.pulseIndigo` |
| `color.indigo700` | `color.pulseDeep` |
| `color.blobDeep` | `color.pulseDeep` |
| `color.onDarkFg` | `color.fg` |
| `color.surface` | `color.glassMed` (or `color.bgRaised` for opaque) |
| `color.surfaceQuiet` | `color.glassSoft` |
| `aurora` import | drop; use `gradient.pulse` |

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck 2>&1 | tee /tmp/tc.txt | tail -30
```

Expected: clean exit (`0` exit code).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(app): migrate remaining legacy token references"
```

---

## Phase 10 — Verification & release

### Task 10.1: Full test suite green

- [ ] **Step 1: Run Jest**

```bash
npm test
```

Expected: every test passes. If any snapshot mismatch — review diff; if intentional rewrite, regenerate **once** with `npm test -- -u`, then re-run without `-u` to confirm.

- [ ] **Step 2: Commit any regenerated snapshots**

```bash
git add -A
git status
# only commit if snapshot files changed
git commit -m "test(ui): regenerate Soft Pulse snapshot baseline" || true
```

---

### Task 10.2: Lint clean

- [ ] **Step 1: Run lint**

```bash
npm run lint
```

Expected: 0 errors, 0 warnings (config requires `--max-warnings 0`).

- [ ] **Step 2: Fix any flagged issues inline (no commits beyond fixes).**

---

### Task 10.3: Typecheck clean

```bash
npm run typecheck
```

Expected: clean (`0` exit code).

---

### Task 10.4: iOS manual smoke

- [ ] **Step 1: Start Expo on iOS simulator**

```bash
npm run ios
```

- [ ] **Step 2: Smoke routes manually** — Home, Transactions, Quick Add, Budgets, More, Settings, Auth, Onboarding, Reports. Confirm:
  - Hero shows blur + pulse blobs (not flat)
  - TabBar floats above safe-area
  - List scroll smooth
  - Status bar text white on every screen
- [ ] **Step 3: Capture screenshots** of each route — store under `docs/superpowers/screenshots/v1.1.0/ios/`. Commit:

```bash
git add docs/superpowers/screenshots/v1.1.0/ios
git commit -m "docs: v1.1.0 iOS screenshot baseline"
```

---

### Task 10.5: Android API 34 manual smoke

- [ ] **Step 1: Start Android emulator (API 34)**

```bash
npm run android
```

- [ ] **Step 2: Same smoke matrix as Task 10.4**. Specifically watch for:
  - BlurView rendering correctly (real blur)
  - List scroll perf — no dropped frames on transactions list
- [ ] **Step 3: Screenshots → `docs/superpowers/screenshots/v1.1.0/android-api34/`. Commit.**

---

### Task 10.6: Android API 28 fallback smoke

- [ ] **Step 1: Boot an API 28 emulator**

(In Android Studio AVD Manager or via `emulator -avd <name>`.)

- [ ] **Step 2: Smoke key routes** — confirm flat fallback is **readable**: card edges visible, text legible. The hero blur will be a flat tint on this API.
- [ ] **Step 3: Screenshots → `docs/superpowers/screenshots/v1.1.0/android-api28/`. Commit.**

---

### Task 10.7: Maestro flows

- [ ] **Step 1: Run flows**

```bash
maestro test e2e/flows/01_signup_onboarding.yaml
maestro test e2e/flows/02_quick_add.yaml
maestro test e2e/flows/03_transfer.yaml
maestro test e2e/flows/04_offline_sync.yaml
maestro test e2e/flows/05_export_restore.yaml
```

Expected: each flow passes.

- [ ] **Step 2: If any flow fails** because a selector relied on a removed token-derived label, update the flow YAML to the new label (avoid changing app logic).

---

### Task 10.8: Update CLAUDE.md (preserve `TxnRow` rule)

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add rule under "Architectural rules to preserve when adding code"**

Append a bullet:

```
- **TxnRow must never be wrapped in `<Glass>`.** BlurView in a long list destroys scroll performance on Android. Use `Surface variant="flat"` for row separators. See `docs/superpowers/specs/2026-05-13-soft-pulse-ui-refactor-design.md` §9.
```

- [ ] **Step 2: Update "Authoritative specs" section** to add the new design doc alongside the old UI spec, and mark the old one as superseded:

```
- UI / visual language: [`docs/superpowers/specs/2026-05-13-soft-pulse-ui-refactor-design.md`](docs/superpowers/specs/2026-05-13-soft-pulse-ui-refactor-design.md) — current Soft Pulse aesthetic (supersedes `2026-05-07-personal-expenses-ui.md`).
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document Soft Pulse rules in CLAUDE.md"
```

---

### Task 10.9: Mark old UI spec superseded

**Files:**
- Modify: `docs/superpowers/specs/2026-05-07-personal-expenses-ui.md`

- [ ] **Step 1: Prepend a note** at the very top:

```
> **SUPERSEDED 2026-05-13** by [2026-05-13-soft-pulse-ui-refactor-design.md](./2026-05-13-soft-pulse-ui-refactor-design.md). Kept for historical reference.
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/specs/2026-05-07-personal-expenses-ui.md
git commit -m "docs: mark v1 UI spec as superseded by Soft Pulse"
```

---

### Task 10.10: Bump version and tag v1.1.0

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Bump version**

```bash
npm version 1.1.0 --no-git-tag-version
```

Expected: `package.json` `version` field now `"1.1.0"`.

- [ ] **Step 2: Commit version bump**

```bash
git add package.json package-lock.json
git commit -m "chore: bump version to 1.1.0 (Soft Pulse)"
```

- [ ] **Step 3: Open PR (do not push tag yet)**

```bash
gh pr create --title "Soft Pulse UI refactor (v1.1.0)" --body "$(cat <<'EOF'
## Summary
- Rebuilt `src/ui/` on new atomic primitives (Glass, Pulse, Surface, Gradient, Stack)
- New `src/ui/theme.ts` Soft Pulse tokens (dark midnight base + neon pulse accents)
- Real backdrop blur via `expo-blur`; icons via `lucide-react-native`
- Every primitive rewritten; every screen restyled or restructured
- Old `AuroraArch.tsx` removed; `colorSwatches.ts` token-derived

## Test plan
- [ ] `npm test` green on new snapshot baseline
- [ ] `npm run typecheck` clean
- [ ] `npm run lint` clean
- [ ] iOS sim smoke (Home, Quick Add, Transactions, Budgets, More, Settings, Auth, Onboarding, Reports)
- [ ] Android emu API 34 smoke (same routes)
- [ ] Android emu API 28 fallback smoke (blur flat-tints; layout still legible)
- [ ] Maestro flows pass unchanged
- [ ] Verify TxnRow is NOT wrapped in Glass anywhere

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 4: After PR merge to main, tag v1.1.0**

```bash
git checkout main && git pull --ff-only
git tag -a v1.1.0 -m "Soft Pulse UI refactor"
git push origin v1.1.0
```

---

## Self-review

**Spec coverage:** Checked spec §1–§15. Each spec section maps to plan tasks:

| Spec § | Tasks |
|---|---|
| §1 Goal / §2 Non-negotiables | covered by 0.2, 0.3 (deps); enforced throughout |
| §3 Visual direction | Phase 1–2 (tokens + atoms) + Phase 9 (screens) |
| §4.1 Layout | Phase 2, 3, 4, 5, 6, 7 |
| §4.2 Deps | Tasks 0.2, 0.3 |
| §5 Tokens | Task 1.1, 1.2 |
| §6 Atoms | Tasks 2.1–2.6 |
| §7 Primitives | Tasks 3.1, 4.1–4.3, 5.1–5.2, 6.1–6.3, 7.1–7.4, 8.3 |
| §8 Screens | Tasks 9.1–9.12 |
| §9 Perf rules | Codified in Task 7.2 comment + Task 10.8 CLAUDE.md update |
| §10 Testing | Tasks 10.1–10.7 |
| §11 Risks | Mitigations baked into tasks (snapshot reset 0.4; TxnRow comment 7.2; BlurView outside Animated 7.4; status bar centralized 9.1) |
| §12 Sequencing | Phases 0–10 |
| §13 Acceptance | Tasks 10.1–10.7, 10.10 |
| §14 OOS | not implemented — fine |
| §15 Decision log | already in spec |

**Placeholder scan:** No `TBD`/`TODO`. Two tasks (6.2 HalfArcGauge, 6.3 MiniBars) reference the existing file shape rather than supplying a full path — but 6.3 has the full code; 6.2 says "same gradient approach as Ring; substitute path `d`" with a clear template. Acceptable, since the geometry comes from reading the existing file in the first step.

**Type consistency:** `ButtonVariant`, `Tone`, `GlassProps.intensity` ('soft'|'med'|'strong'), `gradient` keys ('hero'|'pulse'|'sheet'), `color.glassBorder` border color — all aligned across tasks 1.2 → 2.5 → 4.1 → 7.x.

**Spec-coverage gap fixed:** Spec §9 says "ESLint enforces no inline color/font literals." The actual ESLint config has `react-native/no-color-literals: off` — this is enforced by **code review + token discipline**, not lint. Plan doesn't depend on ESLint to catch this; Task 9.12 includes a grep step to find leftover token references manually.

---

## Execution Handoff

Plan complete and saved to [`docs/superpowers/plans/2026-05-13-soft-pulse-ui-refactor.md`](.). Two execution options:

**1. Subagent-Driven (recommended)** — fresh subagent per task; review between tasks; fast iteration.

**2. Inline Execution** — execute tasks in this session using executing-plans; batch with checkpoints.

Which approach?
