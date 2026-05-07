# Personal Expense Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a solo, multi-currency, offline-first personal expense tracker for iOS and Android (RN + Expo) with Supabase backend, BCELOne notification auto-capture on Android, and full reporting/budget/recurring features.

**Architecture:** Local SQLite is the runtime source of truth. A custom outbox queue drains writes to Supabase Postgres; pulls combine Realtime subscriptions and delta-fetch. Last-write-wins via monotonic `sync_version` enforced by a Postgres trigger (SQLSTATE `PT401`). Edge Functions handle FX refresh, recurring auto-create, and push fan-out. The Android notification listener is a Kotlin `NotificationListenerService` exposed through Expo Modules.

**Tech Stack:** React Native + Expo (dev build), TypeScript strict, Expo Router, expo-sqlite (encrypted), zustand, @supabase/supabase-js, Supabase (Postgres + Auth + Storage + Realtime + Edge Functions/Deno), Kotlin (Android native module), Jest, Maestro, Sentry.

**Authoritative specs:**
- Functional: [`../specs/2026-05-07-personal-expenses-design.md`](../specs/2026-05-07-personal-expenses-design.md)
- UI / visual language: [`../specs/2026-05-07-personal-expenses-ui.md`](../specs/2026-05-07-personal-expenses-ui.md)

When in doubt, the spec wins. UI tasks must consume the tokens defined in the UI spec via `src/ui/theme.ts` (added in Task 0.4) — no inline color or font literals in screens.

**Conventions used in this plan:**
- All commands run from repo root unless stated.
- File paths are repo-relative.
- Each task has its own commit. Commit messages use Conventional Commits.
- "Run test" steps assume dev shell with `npm` available.
- Where a step says "expected output", treat divergence as a failure to investigate, not a thing to ignore.

---

## Phase index

- [Phase 0 — Repo bootstrap](#phase-0--repo-bootstrap)
- [Phase 1 — Supabase schema](#phase-1--supabase-schema)
- [Phase 2 — Local SQLite + repositories](#phase-2--local-sqlite--repositories)
- [Phase 3 — Sync engine](#phase-3--sync-engine)
- [Phase 4 — Auth + onboarding](#phase-4--auth--onboarding)
- [Phase 5 — Manual entry MVP](#phase-5--manual-entry-mvp)
- [Phase 6 — Multi-currency + FX](#phase-6--multi-currency--fx)
- [Phase 7 — Accounts + transfers](#phase-7--accounts--transfers)
- [Phase 8 — Categories + merchant rules](#phase-8--categories--merchant-rules)
- [Phase 9 — Reports + search/filter + export](#phase-9--reports--searchfilter--export)
- [Phase 10 — Budgets](#phase-10--budgets)
- [Phase 11 — Recurring](#phase-11--recurring)
- [Phase 12 — Notifications](#phase-12--notifications)
- [Phase 13 — Receipts](#phase-13--receipts)
- [Phase 14 — BCELOne notif capture (Android)](#phase-14--bcelone-notif-capture-android)
- [Phase 15 — iOS share extension](#phase-15--ios-share-extension)
- [Phase 16 — Polish, observability, ship](#phase-16--polish-observability-ship)

---

## Phase 0 — Repo bootstrap

### Task 0.1: Initialize Expo TypeScript project

**Files:**
- Create: `package.json`, `tsconfig.json`, `app.json`, `app/_layout.tsx`, `app/index.tsx`, `babel.config.js`, `metro.config.js`

- [ ] **Step 1: Create the project**

```bash
npx create-expo-app@latest . --template blank-typescript --no-install
```

Expected: files scaffolded into the existing directory. If it complains about non-empty directory, allow it; we will keep `docs/` and `CLAUDE.md`.

- [ ] **Step 2: Install dependencies**

```bash
npm install expo expo-router expo-linking expo-constants expo-status-bar react-native-safe-area-context react-native-screens react-native-gesture-handler react-native-reanimated
npm install @supabase/supabase-js zustand
npm install expo-sqlite expo-secure-store expo-crypto expo-notifications expo-image-picker expo-image-manipulator expo-auth-session expo-web-browser expo-file-system expo-sharing
npm install @react-native-community/netinfo @react-native-async-storage/async-storage
npm install victory-native react-native-svg
npm install dayjs decimal.js
npm install --save-dev typescript @types/react @types/react-native jest @testing-library/react-native @testing-library/jest-native ts-jest @tsconfig/react-native eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin prettier eslint-config-prettier eslint-plugin-react eslint-plugin-react-native @types/jest
```

- [ ] **Step 3: Set Expo Router as the entry**

Edit `package.json`:

```json
{
  "main": "expo-router/entry"
}
```

Set scheme in `app.json`:

```json
{
  "expo": {
    "name": "personal-expenses",
    "slug": "personal-expenses",
    "scheme": "personalexpenses",
    "version": "0.1.0",
    "orientation": "portrait",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "ios": { "supportsTablet": true, "bundleIdentifier": "la.personalexpenses.app" },
    "android": { "package": "la.personalexpenses.app" },
    "plugins": ["expo-router", "expo-sqlite", "expo-notifications", "expo-secure-store"]
  }
}
```

- [ ] **Step 4: Replace tsconfig with strict config + path alias**

Overwrite `tsconfig.json`:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true,
    "moduleResolution": "bundler",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@app/*": ["app/*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

- [ ] **Step 5: Replace babel config to support reanimated + path alias**

Overwrite `babel.config.js`:

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['module-resolver', { alias: { '@': './src', '@app': './app' } }],
      'react-native-reanimated/plugin',
    ],
  };
};
```

```bash
npm install --save-dev babel-plugin-module-resolver
```

- [ ] **Step 6: Add the root layout**

Create `app/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
```

Replace `app/index.tsx`:

```tsx
import { Text, View } from 'react-native';

export default function Index() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Personal Expenses — bootstrap OK</Text>
    </View>
  );
}
```

- [ ] **Step 7: Verify it boots in the type checker**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: bootstrap expo router app with strict TS"
```

---

### Task 0.2: Lint + Prettier + Jest config

**Files:**
- Create: `.eslintrc.cjs`, `.prettierrc`, `jest.config.js`, `jest.setup.ts`, `__tests__/smoke.test.ts`

- [ ] **Step 1: ESLint config**

Create `.eslintrc.cjs`:

```js
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { project: './tsconfig.json' },
  plugins: ['@typescript-eslint', 'react', 'react-native'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-native/all',
    'prettier',
  ],
  env: { 'react-native/react-native': true, jest: true, node: true, es2022: true },
  settings: { react: { version: 'detect' } },
  rules: {
    'react/react-in-jsx-scope': 'off',
    '@typescript-eslint/consistent-type-imports': 'error',
    '@typescript-eslint/no-floating-promises': 'error',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
  ignorePatterns: ['node_modules', 'android', 'ios', 'dist', '.expo', 'coverage'],
};
```

- [ ] **Step 2: Prettier config**

Create `.prettierrc`:

```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "semi": true
}
```

- [ ] **Step 3: Jest config**

Create `jest.config.js`:

```js
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEach: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@app/(.*)$': '<rootDir>/app/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|expo-modules-core|@unimodules/.*|sentry-expo|native-base|react-clone-referenced-element|@react-native-community/.*|@supabase/.*)',
  ],
  collectCoverageFrom: ['src/**/*.{ts,tsx}'],
};
```

```bash
npm install --save-dev jest-expo
```

- [ ] **Step 4: Jest setup**

Create `jest.setup.ts`:

```ts
import '@testing-library/jest-native/extend-expect';
```

- [ ] **Step 5: Add scripts**

Patch `package.json` `"scripts"`:

```json
{
  "scripts": {
    "start": "expo start --dev-client",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "test": "jest --runInBand",
    "test:watch": "jest --watch",
    "lint": "eslint . --max-warnings 0",
    "format": "prettier --write .",
    "typecheck": "tsc --noEmit"
  }
}
```

- [ ] **Step 6: Add a smoke test**

Create `__tests__/smoke.test.ts`:

```ts
describe('smoke', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 7: Run it**

```bash
npm test -- --silent
```

Expected: `Tests: 1 passed`.

- [ ] **Step 8: Run lint and typecheck**

```bash
npm run lint
npm run typecheck
```

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: add eslint, prettier, and jest with smoke test"
```

---

### Task 0.3: gitignore + env scaffolding

**Files:**
- Create: `.gitignore`, `.env.example`, `src/lib/env.ts`, `__tests__/env.test.ts`

- [ ] **Step 1: gitignore**

Create `.gitignore`:

```
node_modules/
.expo/
dist/
web-build/
*.log
.DS_Store
ios/Pods/
ios/build/
android/.gradle/
android/build/
android/app/build/
android/app/release/
*.keystore
.env
.env.*.local
coverage/
.expo-shared/
```

- [ ] **Step 2: env example**

Create `.env.example`:

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=ey...
EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID_IOS=
EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID_ANDROID=
EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID_WEB=
EXPO_PUBLIC_SENTRY_DSN=
```

Copy locally: `cp .env.example .env` and fill after Supabase setup.

- [ ] **Step 3: typed env loader**

Create `src/lib/env.ts`:

```ts
type Required = 'SUPABASE_URL' | 'SUPABASE_ANON_KEY';
type Optional =
  | 'GOOGLE_OAUTH_CLIENT_ID_IOS'
  | 'GOOGLE_OAUTH_CLIENT_ID_ANDROID'
  | 'GOOGLE_OAUTH_CLIENT_ID_WEB'
  | 'SENTRY_DSN';

function read(key: Required | Optional): string | undefined {
  return process.env[`EXPO_PUBLIC_${key}`];
}

export const env = {
  SUPABASE_URL: requireVar('SUPABASE_URL'),
  SUPABASE_ANON_KEY: requireVar('SUPABASE_ANON_KEY'),
  GOOGLE_OAUTH_CLIENT_ID_IOS: read('GOOGLE_OAUTH_CLIENT_ID_IOS'),
  GOOGLE_OAUTH_CLIENT_ID_ANDROID: read('GOOGLE_OAUTH_CLIENT_ID_ANDROID'),
  GOOGLE_OAUTH_CLIENT_ID_WEB: read('GOOGLE_OAUTH_CLIENT_ID_WEB'),
  SENTRY_DSN: read('SENTRY_DSN'),
};

function requireVar(key: Required): string {
  const v = read(key);
  if (!v) throw new Error(`missing env EXPO_PUBLIC_${key}`);
  return v;
}
```

- [ ] **Step 4: Test env throws when unset**

Create `__tests__/env.test.ts`:

```ts
describe('env', () => {
  beforeEach(() => jest.resetModules());

  it('throws when SUPABASE_URL missing', () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'k';
    expect(() => require('../src/lib/env').env).toThrow(/SUPABASE_URL/);
  });

  it('returns value when set', () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://x.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'k';
    const { env } = require('../src/lib/env');
    expect(env.SUPABASE_URL).toBe('https://x.supabase.co');
  });
});
```

- [ ] **Step 5: Run the test**

```bash
npm test -- env.test
```

Expected: `Tests: 2 passed`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: gitignore, env example, typed env loader"
```

---

### Task 0.4: UI design tokens + primitives

Implements the UI spec's token system. Every screen from Phase 4 onwards consumes these — no inline colour or font literals.

**Files:**
- Create: `src/ui/theme.ts`, `src/ui/Text.tsx`, `src/ui/ArchGlow.tsx`, `src/ui/Gauge.tsx`, `src/ui/MiniBars.tsx`, `src/ui/StatTriple.tsx`, `assets/fonts/Fraunces.ttf`, `assets/fonts/Inter.ttf`
- Test: `__tests__/ui/theme.test.ts`

- [ ] **Step 1: Bundle fonts**

```bash
npm install expo-font
mkdir -p assets/fonts
# Download Fraunces (variable) and Inter (variable) from Google Fonts:
#   https://fonts.google.com/specimen/Fraunces
#   https://fonts.google.com/specimen/Inter
# Place the .ttf files at assets/fonts/Fraunces.ttf and assets/fonts/Inter.ttf
```

Update `app.config.ts` with the font plugin:

```ts
plugins: [
  // ...existing
  ['expo-font', { fonts: ['./assets/fonts/Fraunces.ttf', './assets/fonts/Inter.ttf'] }],
],
```

- [ ] **Step 2: Token module**

`src/ui/theme.ts`:

```ts
export const color = {
  bg:           '#FBF7F0',
  fg:           '#1A1410',
  muted:        '#6B5E54',
  hairline:     '#E9E2D6',
  violet200:    '#DDD3FF',
  violet500:    '#7C5BFF',
  violet700:    '#4B2EE6',
  success:      '#2F8F5C',
  danger:       '#C7402E',
  surfaceGlass: 'rgba(255,255,255,0.55)',
} as const;

export const radius = { sm: 8, md: 14, lg: 22, pill: 999 } as const;

export const space = (n: number): number => n * 4;

export const fonts = {
  display: 'Fraunces',
  body:    'Inter',
  mono:    'JetBrainsMono',
} as const;

export type TypeStyleName =
  | 'displayHero' | 'displayLarge' | 'displayMed' | 'displaySm'
  | 'bodyLg' | 'body' | 'caption' | 'mono';

export const typeStyles: Record<TypeStyleName, {
  fontFamily: string; fontSize: number; lineHeight: number; fontWeight: '400' | '500' | '600';
  letterSpacing?: number; fontVariant?: ('tabular-nums')[];
}> = {
  displayHero:  { fontFamily: fonts.display, fontSize: 56, lineHeight: 60, fontWeight: '600', fontVariant: ['tabular-nums'] },
  displayLarge: { fontFamily: fonts.display, fontSize: 36, lineHeight: 40, fontWeight: '600', fontVariant: ['tabular-nums'] },
  displayMed:   { fontFamily: fonts.display, fontSize: 28, lineHeight: 32, fontWeight: '600' },
  displaySm:    { fontFamily: fonts.display, fontSize: 22, lineHeight: 28, fontWeight: '600' },
  bodyLg:       { fontFamily: fonts.body,    fontSize: 17, lineHeight: 24, fontWeight: '500' },
  body:         { fontFamily: fonts.body,    fontSize: 15, lineHeight: 22, fontWeight: '400' },
  caption:      { fontFamily: fonts.body,    fontSize: 12, lineHeight: 16, fontWeight: '500', letterSpacing: 0.6 },
  mono:         { fontFamily: fonts.mono,    fontSize: 16, lineHeight: 22, fontWeight: '400', fontVariant: ['tabular-nums'] },
};

export const shadow = {
  s1:    { shadowColor: '#141410', shadowOpacity: 0.04, shadowRadius: 2,  shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  s2:    { shadowColor: '#141410', shadowOpacity: 0.06, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  glow:  { shadowColor: '#4B2EE6', shadowOpacity: 0.18, shadowRadius: 80, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
} as const;
```

- [ ] **Step 3: Tests**

`__tests__/ui/theme.test.ts`:

```ts
import { typeStyles, color } from '@/ui/theme';
describe('theme', () => {
  it('exposes hero display style with tabular numerals', () => {
    expect(typeStyles.displayHero.fontFamily).toBe('Fraunces');
    expect(typeStyles.displayHero.fontVariant).toContain('tabular-nums');
  });
  it('uses cream-white background', () => {
    expect(color.bg.toUpperCase()).toBe('#FBF7F0');
  });
});
```

- [ ] **Step 4: Typed Text component**

`src/ui/Text.tsx`:

```tsx
import { Text as RNText, type TextProps } from 'react-native';
import { typeStyles, color, type TypeStyleName } from './theme';

type Props = TextProps & {
  variant?: TypeStyleName;
  tone?: 'fg' | 'muted' | 'violet' | 'success' | 'danger';
  caps?: boolean;
};

const tones = {
  fg: color.fg, muted: color.muted, violet: color.violet500,
  success: color.success, danger: color.danger,
};

export function Text({ variant = 'body', tone = 'fg', caps, style, ...rest }: Props) {
  const t = typeStyles[variant];
  return (
    <RNText
      {...rest}
      style={[
        t,
        { color: tones[tone] },
        caps && { textTransform: 'uppercase' },
        style,
      ]}
    />
  );
}
```

- [ ] **Step 5: ArchGlow**

`src/ui/ArchGlow.tsx`:

```tsx
import { View, useWindowDimensions, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { color } from './theme';

export function ArchGlow() {
  const { width, height } = useWindowDimensions();
  const glowH = Math.round(height * 0.6);

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: glowH }}>
        {Platform.OS === 'ios' ? (
          <MaskedView
            style={{ flex: 1 }}
            maskElement={
              <Svg width={width} height={glowH}>
                <Defs>
                  <RadialGradient id="m" cx="50%" cy="100%" r="80%">
                    <Stop offset="0%" stopColor="#fff" stopOpacity="1" />
                    <Stop offset="100%" stopColor="#fff" stopOpacity="0" />
                  </RadialGradient>
                </Defs>
                <Rect x="0" y="0" width={width} height={glowH} fill="url(#m)" />
              </Svg>
            }>
            <LinearGradient
              colors={[color.violet700, color.violet500, 'transparent']}
              locations={[0, 0.4, 1]}
              start={{ x: 0.5, y: 1 }} end={{ x: 0.5, y: 0 }}
              style={{ flex: 1 }}
            />
          </MaskedView>
        ) : (
          // Android fallback: skip mask, rely on gradient + subtle ellipse
          <LinearGradient
            colors={[color.violet700, color.violet500, 'transparent']}
            locations={[0, 0.4, 1]}
            start={{ x: 0.5, y: 1 }} end={{ x: 0.5, y: 0 }}
            style={{ flex: 1, opacity: 0.6 }}
          />
        )}
      </View>
    </View>
  );
}
```

```bash
npm install expo-linear-gradient @react-native-masked-view/masked-view
```

- [ ] **Step 6: Gauge ring**

`src/ui/Gauge.tsx`:

```tsx
import Svg, { Circle } from 'react-native-svg';
import { View } from 'react-native';
import { color } from './theme';

export function Gauge({
  value, size = 84, stroke = 6, danger = false, children,
}: { value: number; size?: number; stroke?: number; danger?: boolean; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(value, 1));
  const fill = danger || value > 1 ? color.danger : color.violet500;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size/2} cy={size/2} r={r} stroke={color.hairline} strokeWidth={stroke} fill="none" />
        <Circle cx={size/2} cy={size/2} r={r} stroke={fill} strokeWidth={stroke} fill="none"
                strokeLinecap="round" strokeDasharray={`${c * pct} ${c}`} />
      </Svg>
      {children}
    </View>
  );
}
```

- [ ] **Step 7: MiniBars + StatTriple**

`src/ui/MiniBars.tsx`:

```tsx
import { View } from 'react-native';
import { color, radius } from './theme';

export function MiniBars({ values, height = 56 }: { values: number[]; height?: number }) {
  const max = Math.max(1, ...values);
  return (
    <View style={{ height, flexDirection: 'row', alignItems: 'flex-end' }}>
      {values.map((v, i) => {
        const isLast = i === values.length - 1;
        const h = Math.round((v / max) * height);
        return (
          <View key={i}
            style={{
              width: 8, marginRight: 4, height: Math.max(2, h),
              backgroundColor: isLast ? color.violet500 : color.violet200,
              borderTopLeftRadius: radius.sm, borderTopRightRadius: radius.sm,
            }} />
        );
      })}
    </View>
  );
}
```

`src/ui/StatTriple.tsx`:

```tsx
import { View } from 'react-native';
import { Text } from './Text';

export function StatTriple({ label, value, sub, valueVariant = 'displayHero', tone }:
  { label: string; value: string; sub?: string; valueVariant?: 'displayHero' | 'displayLarge' | 'displayMed';
    tone?: 'fg' | 'violet' | 'success' | 'danger' }) {
  return (
    <View>
      <Text variant="caption" tone="muted" caps>{label}</Text>
      <Text variant={valueVariant} tone={tone ?? 'fg'} style={{ marginTop: 4 }}>{value}</Text>
      {sub ? <Text variant="body" tone="muted" style={{ marginTop: 4 }}>{sub}</Text> : null}
    </View>
  );
}
```

- [ ] **Step 8: Update existing primitives to consume theme**

Open `src/ui/Button.tsx`, `src/ui/Field.tsx`, `src/ui/Chip.tsx`, `src/ui/Sheet.tsx`, `src/ui/TxnRow.tsx` (created in earlier tasks once Phase 5 starts) and replace inline color/font literals with `color.*`, `radius.*`, `typeStyles.*`. Specifically:

- Button: primary bg `color.fg`, text `color.bg`; secondary bg `color.surfaceGlass` + 1px hairline; pill radius.
- Field: border `color.hairline` (focused: `color.violet500`), radius `radius.md`.
- Chip: glassy default (`color.surfaceGlass` + hairline + `radius.pill`); selected bg `color.fg`, text `color.bg`.
- Sheet: bg `color.bg`, sheet title uses `<Text variant="displaySm">`.
- TxnRow: amount uses `<Text variant="displaySm">` right-aligned with tabular numerals; meta line uses `caption muted`.

> Engineer note: This task happens *after* the primitives exist (they're created in Phase 4 and 5). When implementing Phase 4 / 5 tasks, write the primitives directly against the theme in the first place. This Task 0.4 step is the placeholder for the design system itself; no primitives exist yet at this point in time, so the "update primitives" step here is forward-looking — it lives here to keep the design system task self-contained, but executes incrementally as primitives are created.

- [ ] **Step 9: Run + commit**

```bash
npm test -- ui/theme.test
git add -A
git commit -m "feat(ui): design tokens, theme module, ArchGlow / Gauge / MiniBars / StatTriple primitives"
```

---

## Phase 1 — Supabase schema

Each migration file lives under `supabase/migrations/`. The CLI prefixes timestamps automatically. We use plain numeric prefixes for ordering inside this plan; rename to the CLI's `YYYYMMDDHHMMSS_*.sql` form when you create them via `supabase migration new`.

### Task 1.1: Install + link Supabase CLI, create the project

**Files:**
- Create: `supabase/config.toml` (auto), `docs/operations/supabase-setup.md`

- [ ] **Step 1: Install the CLI**

```bash
npm install --save-dev supabase
npx supabase --version
```

Expected: prints version `>= 1.x`.

- [ ] **Step 2: Create the project (manual)**

Open the Supabase dashboard and create a new project named `personal-expenses-prod`. Region: `ap-southeast-1` (closest to Laos). Capture:

- Project ref (`xxxx`)
- Anon public key
- Service role key (secrets, never commit)

Document this in `docs/operations/supabase-setup.md`:

```md
# Supabase setup

## Projects
- prod: <ref> (region ap-southeast-1)

## Local env (.env)
EXPO_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon>

## Service role
Stored in `~/.config/personal-expenses/supabase-service-role` outside the repo.
Used only by Edge Function deploy and migration runs.
```

- [ ] **Step 3: Initialise local Supabase config**

```bash
npx supabase init
npx supabase login
npx supabase link --project-ref <ref>
```

Expected: `supabase/config.toml` written, project linked.

- [ ] **Step 4: Commit (no secrets)**

```bash
git add supabase/config.toml docs/operations/supabase-setup.md package.json package-lock.json
git commit -m "chore: link supabase project"
```

---

### Task 1.2: Migration 0001 — extensions + sync_version trigger

**Files:**
- Create: `supabase/migrations/0001_extensions_and_sync_version.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 0001_extensions_and_sync_version.sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- enforce_sync_version: rejects stale updates on synced tables.
-- Custom SQLSTATE 'PT401' avoids built-in serialization_failure auto-retry.
CREATE OR REPLACE FUNCTION enforce_sync_version() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.sync_version <= OLD.sync_version THEN
    RAISE EXCEPTION 'stale_write' USING ERRCODE = 'PT401';
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END $$ LANGUAGE plpgsql;

-- Helper to attach the trigger and a default updated_at touch.
CREATE OR REPLACE FUNCTION attach_sync_triggers(tbl regclass) RETURNS void AS $$
BEGIN
  EXECUTE format(
    'DROP TRIGGER IF EXISTS trg_sync_version ON %s', tbl);
  EXECUTE format(
    'CREATE TRIGGER trg_sync_version BEFORE UPDATE ON %s
       FOR EACH ROW EXECUTE FUNCTION enforce_sync_version()', tbl);
END $$ LANGUAGE plpgsql;
```

- [ ] **Step 2: Apply locally**

```bash
npx supabase db reset
```

Expected: applies migration cleanly; no errors.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0001_extensions_and_sync_version.sql
git commit -m "feat(db): extensions + sync_version trigger helper"
```

---

### Task 1.3: Migration 0002 — profiles (base_currency)

**Files:**
- Create: `supabase/migrations/0002_profiles.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 0002_profiles.sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  base_currency text NOT NULL DEFAULT 'LAK' CHECK (base_currency IN ('LAK','THB','USD')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  sync_version bigint NOT NULL DEFAULT 1
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_owner_all ON profiles
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

SELECT attach_sync_triggers('profiles');

-- Auto-create profile on signup.
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email));
  RETURN NEW;
END $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

- [ ] **Step 2: Apply + verify**

```bash
npx supabase db reset
npx supabase db diff
```

Expected: no diff; migration is the source of truth.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0002_profiles.sql
git commit -m "feat(db): profiles with base_currency"
```

---

### Task 1.4: Migration 0003 — accounts

**Files:**
- Create: `supabase/migrations/0003_accounts.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 0003_accounts.sql
CREATE TABLE accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('cash','bank','credit_card','other')),
  currency text NOT NULL CHECK (currency IN ('LAK','THB','USD')),
  opening_balance numeric(18,4) NOT NULL DEFAULT 0,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  sync_version bigint NOT NULL DEFAULT 1
);
CREATE INDEX accounts_user_updated_at ON accounts (user_id, updated_at);
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY accounts_owner_all ON accounts
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
SELECT attach_sync_triggers('accounts');
```

- [ ] **Step 2: Apply + commit**

```bash
npx supabase db reset
git add supabase/migrations/0003_accounts.sql
git commit -m "feat(db): accounts"
```

---

### Task 1.5: Migration 0004 — categories + seed RPC

**Files:**
- Create: `supabase/migrations/0004_categories.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 0004_categories.sql
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  icon text,
  color text,
  kind text NOT NULL CHECK (kind IN ('expense','income')),
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  sync_version bigint NOT NULL DEFAULT 1
);
CREATE INDEX categories_user_updated_at ON categories (user_id, updated_at);
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY categories_owner_all ON categories
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
SELECT attach_sync_triggers('categories');

-- Seeds default categories for the calling user. Idempotent.
CREATE OR REPLACE FUNCTION seed_default_categories() RETURNS void AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  INSERT INTO categories (user_id, name, icon, color, kind)
  SELECT uid, n, i, c, k FROM (VALUES
    ('Food','utensils','#F59E0B','expense'),
    ('Transport','car','#3B82F6','expense'),
    ('Bills','file-text','#6366F1','expense'),
    ('Health','activity','#EF4444','expense'),
    ('Shopping','shopping-bag','#EC4899','expense'),
    ('Entertainment','film','#8B5CF6','expense'),
    ('Transfer','repeat','#6B7280','expense'),
    ('Other','more-horizontal','#9CA3AF','expense'),
    ('Salary','briefcase','#10B981','income'),
    ('Other Income','plus-circle','#10B981','income')
  ) AS v(n,i,c,k)
  WHERE NOT EXISTS (
    SELECT 1 FROM categories WHERE user_id = uid AND name = v.n AND kind = v.k
  );
END $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

- [ ] **Step 2: Apply + commit**

```bash
npx supabase db reset
git add supabase/migrations/0004_categories.sql
git commit -m "feat(db): categories and seed RPC"
```

---

### Task 1.6: Migration 0005 — transactions + indexes

**Files:**
- Create: `supabase/migrations/0005_transactions.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 0005_transactions.sql
CREATE TABLE transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('expense','income','transfer')),
  amount numeric(18,4) NOT NULL,
  currency text NOT NULL CHECK (currency IN ('LAK','THB','USD')),
  fx_rate_to_base numeric(18,8) NOT NULL,
  amount_base numeric(18,4) NOT NULL,
  occurred_at timestamptz NOT NULL,
  merchant text,
  note text,
  receipt_url text,
  source text NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual','notif','recurring','import')),
  source_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  sync_version bigint NOT NULL DEFAULT 1
);
CREATE INDEX txn_user_occurred_at ON transactions (user_id, occurred_at DESC);
CREATE INDEX txn_user_updated_at ON transactions (user_id, updated_at);
CREATE INDEX txn_user_account ON transactions (user_id, account_id);
CREATE INDEX txn_user_category ON transactions (user_id, category_id);
CREATE UNIQUE INDEX txn_source_ref_unique
  ON transactions (user_id, source, source_ref)
  WHERE source_ref IS NOT NULL;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY transactions_owner_all ON transactions
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
SELECT attach_sync_triggers('transactions');
```

- [ ] **Step 2: Apply + commit**

```bash
npx supabase db reset
git add supabase/migrations/0005_transactions.sql
git commit -m "feat(db): transactions"
```

---

### Task 1.7: Migration 0006 — transfers

**Files:**
- Create: `supabase/migrations/0006_transfers.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 0006_transfers.sql
CREATE TABLE transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_txn_id uuid NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  to_txn_id uuid NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  fx_rate numeric(18,8),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  sync_version bigint NOT NULL DEFAULT 1,
  CHECK (from_txn_id <> to_txn_id)
);
CREATE INDEX transfers_user_updated_at ON transfers (user_id, updated_at);
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY transfers_owner_all ON transfers
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
SELECT attach_sync_triggers('transfers');
```

- [ ] **Step 2: Apply + commit**

```bash
npx supabase db reset
git add supabase/migrations/0006_transfers.sql
git commit -m "feat(db): transfers"
```

---

### Task 1.8: Migration 0007 — budgets

**Files:**
- Create: `supabase/migrations/0007_budgets.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 0007_budgets.sql
CREATE TABLE budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  month date NOT NULL,
  limit_amount numeric(18,4) NOT NULL CHECK (limit_amount > 0),
  limit_currency text NOT NULL CHECK (limit_currency IN ('LAK','THB','USD')),
  last_alert_threshold int NOT NULL DEFAULT 0
    CHECK (last_alert_threshold IN (0, 80, 100)),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  sync_version bigint NOT NULL DEFAULT 1,
  UNIQUE (user_id, category_id, month)
);
CREATE INDEX budgets_user_updated_at ON budgets (user_id, updated_at);
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY budgets_owner_all ON budgets
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
SELECT attach_sync_triggers('budgets');
```

- [ ] **Step 2: Apply + commit**

```bash
npx supabase db reset
git add supabase/migrations/0007_budgets.sql
git commit -m "feat(db): budgets"
```

---

### Task 1.9: Migration 0008 — merchant_rules

**Files:**
- Create: `supabase/migrations/0008_merchant_rules.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 0008_merchant_rules.sql
CREATE TABLE merchant_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pattern text NOT NULL,
  is_regex boolean NOT NULL DEFAULT false,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
  hit_count int NOT NULL DEFAULT 0,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  sync_version bigint NOT NULL DEFAULT 1
);
CREATE INDEX merchant_rules_user_updated_at ON merchant_rules (user_id, updated_at);
ALTER TABLE merchant_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY merchant_rules_owner_all ON merchant_rules
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
SELECT attach_sync_triggers('merchant_rules');
```

- [ ] **Step 2: Apply + commit**

```bash
npx supabase db reset
git add supabase/migrations/0008_merchant_rules.sql
git commit -m "feat(db): merchant_rules"
```

---

### Task 1.10: Migration 0009 — notif_parse_rules

**Files:**
- Create: `supabase/migrations/0009_notif_parse_rules.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 0009_notif_parse_rules.sql
CREATE TABLE notif_parse_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  app_package text NOT NULL,
  regex text NOT NULL,
  field_map jsonb NOT NULL,         -- {amount:'$1', currency:'$2', merchant:'$3'}
  priority int NOT NULL DEFAULT 100,
  enabled boolean NOT NULL DEFAULT true,
  default_account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  sync_version bigint NOT NULL DEFAULT 1
);
CREATE INDEX npr_user_updated_at ON notif_parse_rules (user_id, updated_at);
CREATE INDEX npr_user_pkg_priority
  ON notif_parse_rules (user_id, app_package, priority DESC)
  WHERE enabled AND deleted_at IS NULL;
ALTER TABLE notif_parse_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY npr_owner_all ON notif_parse_rules
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
SELECT attach_sync_triggers('notif_parse_rules');
```

- [ ] **Step 2: Apply + commit**

```bash
npx supabase db reset
git add supabase/migrations/0009_notif_parse_rules.sql
git commit -m "feat(db): notif_parse_rules"
```

---

### Task 1.11: Migration 0010 — recurring_rules

**Files:**
- Create: `supabase/migrations/0010_recurring_rules.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 0010_recurring_rules.sql
CREATE TABLE recurring_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  template_txn jsonb NOT NULL,            -- {account_id, category_id, amount, currency, kind, note, merchant}
  cadence text NOT NULL,                  -- 'monthly_day_15' | 'weekly_dow_3' | cron string
  mode text NOT NULL CHECK (mode IN ('auto','confirm')),
  next_run_at timestamptz NOT NULL,
  last_notified_at timestamptz,
  end_date date,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  sync_version bigint NOT NULL DEFAULT 1
);
CREATE INDEX rr_user_updated_at ON recurring_rules (user_id, updated_at);
CREATE INDEX rr_due ON recurring_rules (next_run_at)
  WHERE enabled AND deleted_at IS NULL;
ALTER TABLE recurring_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY rr_owner_all ON recurring_rules
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
SELECT attach_sync_triggers('recurring_rules');
```

- [ ] **Step 2: Apply + commit**

```bash
npx supabase db reset
git add supabase/migrations/0010_recurring_rules.sql
git commit -m "feat(db): recurring_rules"
```

---

### Task 1.12: Migration 0011 — fx_rates (shared)

**Files:**
- Create: `supabase/migrations/0011_fx_rates.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 0011_fx_rates.sql
-- fx_rates is shared (no user_id). Read-only for all authenticated users.
CREATE TABLE fx_rates (
  date date NOT NULL,
  from_curr text NOT NULL CHECK (from_curr IN ('LAK','THB','USD')),
  to_curr text NOT NULL CHECK (to_curr IN ('LAK','THB','USD')),
  rate numeric(18,8) NOT NULL CHECK (rate > 0),
  PRIMARY KEY (date, from_curr, to_curr)
);
ALTER TABLE fx_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY fx_rates_read ON fx_rates FOR SELECT
  USING (auth.uid() IS NOT NULL);
-- Writes only via service role (Edge Function) — no INSERT/UPDATE policy.
```

- [ ] **Step 2: Apply + commit**

```bash
npx supabase db reset
git add supabase/migrations/0011_fx_rates.sql
git commit -m "feat(db): fx_rates (read-only for users)"
```

---

### Task 1.13: Migration 0012 — push_tokens + push_queue

**Files:**
- Create: `supabase/migrations/0012_push.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 0012_push.sql
CREATE TABLE push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expo_token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('ios','android')),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  sync_version bigint NOT NULL DEFAULT 1,
  UNIQUE (user_id, expo_token)
);
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY push_tokens_owner_all ON push_tokens
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
SELECT attach_sync_triggers('push_tokens');

-- Server-only queue, no RLS for users. Service role drains it.
CREATE TABLE push_queue (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL,
  type text NOT NULL,                 -- 'budget_threshold','recurring_confirm', etc.
  payload jsonb NOT NULL,
  sent_at timestamptz,
  attempts int NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX push_queue_unsent ON push_queue (created_at)
  WHERE sent_at IS NULL;
ALTER TABLE push_queue ENABLE ROW LEVEL SECURITY;
-- No policy = no client access.
```

- [ ] **Step 2: Apply + commit**

```bash
npx supabase db reset
git add supabase/migrations/0012_push.sql
git commit -m "feat(db): push_tokens and push_queue"
```

---

### Task 1.14: Migration 0013 — budget threshold trigger

**Files:**
- Create: `supabase/migrations/0013_budget_threshold_trigger.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 0013_budget_threshold_trigger.sql
-- After a transaction insert/update/delete, recompute spend for the affected
-- (user, category, month) and enqueue a push if a budget threshold is newly crossed.
CREATE OR REPLACE FUNCTION budget_threshold_check() RETURNS trigger AS $$
DECLARE
  v_user uuid;
  v_cat uuid;
  v_month date;
  v_spend numeric;
  v_budget budgets%ROWTYPE;
  v_pct numeric;
  v_threshold int;
BEGIN
  v_user := COALESCE(NEW.user_id, OLD.user_id);
  v_cat := COALESCE(NEW.category_id, OLD.category_id);
  v_month := date_trunc('month', COALESCE(NEW.occurred_at, OLD.occurred_at))::date;
  IF v_cat IS NULL THEN RETURN NULL; END IF;

  SELECT * INTO v_budget FROM budgets
    WHERE user_id = v_user AND category_id = v_cat AND month = v_month
      AND deleted_at IS NULL;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT COALESCE(SUM(amount_base), 0) INTO v_spend
    FROM transactions
    WHERE user_id = v_user
      AND category_id = v_cat
      AND kind = 'expense'
      AND deleted_at IS NULL
      AND date_trunc('month', occurred_at)::date = v_month;

  v_pct := (v_spend / v_budget.limit_amount) * 100;
  v_threshold := CASE
    WHEN v_pct >= 100 THEN 100
    WHEN v_pct >= 80 THEN 80
    ELSE 0
  END;

  IF v_threshold > v_budget.last_alert_threshold THEN
    UPDATE budgets SET last_alert_threshold = v_threshold,
      sync_version = sync_version + 1
      WHERE id = v_budget.id;

    INSERT INTO push_queue (user_id, type, payload)
    VALUES (v_user, 'budget_threshold', jsonb_build_object(
      'budget_id', v_budget.id,
      'category_id', v_cat,
      'month', v_month,
      'threshold', v_threshold,
      'spend_base', v_spend,
      'limit_base', v_budget.limit_amount));
  ELSIF v_threshold < v_budget.last_alert_threshold THEN
    -- spend dropped under threshold (e.g. txn deleted) — reset
    UPDATE budgets SET last_alert_threshold = v_threshold,
      sync_version = sync_version + 1
      WHERE id = v_budget.id;
  END IF;
  RETURN NULL;
END $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_budget_threshold
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW EXECUTE FUNCTION budget_threshold_check();
```

- [ ] **Step 2: Apply + commit**

```bash
npx supabase db reset
git add supabase/migrations/0013_budget_threshold_trigger.sql
git commit -m "feat(db): budget threshold push enqueue trigger"
```

---

### Task 1.15: Migration 0014 — Storage bucket for receipts

**Files:**
- Create: `supabase/migrations/0014_receipts_bucket.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 0014_receipts_bucket.sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Path convention: <user_id>/<txn_id>/<filename>
CREATE POLICY receipts_owner_read ON storage.objects FOR SELECT
  USING (bucket_id = 'receipts'
         AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY receipts_owner_write ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'receipts'
              AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY receipts_owner_update ON storage.objects FOR UPDATE
  USING (bucket_id = 'receipts'
         AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY receipts_owner_delete ON storage.objects FOR DELETE
  USING (bucket_id = 'receipts'
         AND (storage.foldername(name))[1] = auth.uid()::text);
```

- [ ] **Step 2: Apply + commit**

```bash
npx supabase db reset
git add supabase/migrations/0014_receipts_bucket.sql
git commit -m "feat(db): receipts storage bucket with owner-scoped policies"
```

---

### Task 1.16: RLS round-trip integration test (psql)

**Files:**
- Create: `supabase/tests/rls_smoke.sql`, `scripts/test-db.sh`

- [ ] **Step 1: Write a SQL test**

```sql
-- supabase/tests/rls_smoke.sql
BEGIN;
SELECT auth.set_auth_user('00000000-0000-0000-0000-000000000001');
INSERT INTO accounts (user_id, name, type, currency)
VALUES ('00000000-0000-0000-0000-000000000001', 'Cash', 'cash', 'LAK');

-- Switch to other user, ensure not visible.
SELECT auth.set_auth_user('00000000-0000-0000-0000-000000000002');
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM accounts) THEN
    RAISE EXCEPTION 'RLS leak: other user can see accounts';
  END IF;
END $$;
ROLLBACK;
```

`auth.set_auth_user` is a helper we install:

```sql
-- supabase/tests/_helpers.sql (sourced before tests)
CREATE OR REPLACE FUNCTION auth.set_auth_user(uid uuid) RETURNS void AS $$
BEGIN
  PERFORM set_config('request.jwt.claims',
    jsonb_build_object('sub', uid::text, 'role', 'authenticated')::text, true);
  PERFORM set_config('role', 'authenticated', true);
END $$ LANGUAGE plpgsql;
```

- [ ] **Step 2: Wire a runner script**

`scripts/test-db.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/_helpers.sql
psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls_smoke.sql
echo "OK: RLS smoke passed"
```

```bash
chmod +x scripts/test-db.sh
```

- [ ] **Step 3: Run it (local Supabase must be up)**

```bash
npx supabase start
./scripts/test-db.sh
```

Expected: `OK: RLS smoke passed`.

- [ ] **Step 4: Add npm script + commit**

Add to `package.json`:

```json
"db:test": "bash scripts/test-db.sh"
```

```bash
git add -A
git commit -m "test(db): RLS smoke test for accounts"
```

---

## Phase 2 — Local SQLite + repositories

### Task 2.1: Domain types + currency helpers

**Files:**
- Create: `src/domain/types.ts`, `src/domain/money.ts`, `__tests__/domain/money.test.ts`

- [ ] **Step 1: Domain types**

`src/domain/types.ts`:

```ts
export type Currency = 'LAK' | 'THB' | 'USD';
export type AccountType = 'cash' | 'bank' | 'credit_card' | 'other';
export type TxnKind = 'expense' | 'income' | 'transfer';
export type TxnSource = 'manual' | 'notif' | 'recurring' | 'import';
export type CategoryKind = 'expense' | 'income';

export interface SyncedRow {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  sync_version: number;
}

export interface Account extends SyncedRow {
  name: string;
  type: AccountType;
  currency: Currency;
  opening_balance_micro: number;
  archived: boolean;
}

export interface Category extends SyncedRow {
  name: string;
  icon: string | null;
  color: string | null;
  kind: CategoryKind;
  archived: boolean;
}

export interface Transaction extends SyncedRow {
  account_id: string;
  category_id: string | null;
  kind: TxnKind;
  amount_micro: number;
  currency: Currency;
  fx_rate_to_base: number;
  amount_base_micro: number;
  occurred_at: string;
  merchant: string | null;
  note: string | null;
  receipt_url: string | null;
  source: TxnSource;
  source_ref: string | null;
}

export interface Transfer extends SyncedRow {
  from_txn_id: string;
  to_txn_id: string;
  fx_rate: number | null;
}

export interface Budget extends SyncedRow {
  category_id: string;
  month: string;            // YYYY-MM-01
  limit_amount_micro: number;
  limit_currency: Currency;
  last_alert_threshold: 0 | 80 | 100;
}
```

- [ ] **Step 2: Money helpers**

`src/domain/money.ts`:

```ts
import type { Currency } from './types';

export const MICRO = 10_000;

export function toMicro(amount: number): number {
  return Math.round(amount * MICRO);
}

export function fromMicro(micro: number): number {
  return micro / MICRO;
}

export function decimalsFor(c: Currency): number {
  return c === 'LAK' ? 0 : 2;
}

export function formatAmount(micro: number, c: Currency): string {
  const decimals = decimalsFor(c);
  const v = fromMicro(micro);
  return v.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function format(micro: number, c: Currency): string {
  return `${formatAmount(micro, c)} ${c}`;
}

export function applyRate(amount_micro: number, rate: number): number {
  // Multiply, then round to micro precision.
  return Math.round(amount_micro * rate);
}
```

- [ ] **Step 3: Test money helpers**

`__tests__/domain/money.test.ts`:

```ts
import { toMicro, fromMicro, format, applyRate, decimalsFor } from '@/domain/money';

describe('money', () => {
  it('round-trips micro', () => {
    expect(fromMicro(toMicro(12.34))).toBeCloseTo(12.34);
  });

  it('formats LAK with no decimals', () => {
    expect(format(toMicro(15000), 'LAK')).toBe('15,000 LAK');
  });

  it('formats USD with 2 decimals', () => {
    expect(format(toMicro(12.5), 'USD')).toBe('12.50 USD');
  });

  it('decimalsFor', () => {
    expect(decimalsFor('LAK')).toBe(0);
    expect(decimalsFor('USD')).toBe(2);
    expect(decimalsFor('THB')).toBe(2);
  });

  it('applyRate rounds to micro', () => {
    // 1 USD * 21000 LAK/USD => 21000 LAK
    expect(applyRate(toMicro(1), 21000)).toBe(toMicro(21000));
  });
});
```

- [ ] **Step 4: Run + commit**

```bash
npm test -- money.test
git add -A
git commit -m "feat(domain): types and money helpers"
```

---

### Task 2.2: SQLite schema + migrations runner

**Files:**
- Create: `src/db/sqlite.ts`, `src/db/migrations.ts`, `src/db/migrations/001_init.ts`, `__tests__/db/migrations.test.ts`

- [ ] **Step 1: SQLite open + key derivation**

`src/db/sqlite.ts`:

```ts
import * as SQLite from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const DB_NAME = 'personal_expenses.db';
const KEY_NAME = 'sqlite_passphrase_v1';

async function getOrCreateKey(): Promise<string> {
  const existing = await SecureStore.getItemAsync(KEY_NAME);
  if (existing) return existing;
  const bytes = await Crypto.getRandomBytesAsync(32);
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  await SecureStore.setItemAsync(KEY_NAME, hex);
  return hex;
}

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function openDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const key = await getOrCreateKey();
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      // expo-sqlite supports SQLCipher when the binary is built with it.
      // Run PRAGMA key=... unconditionally; harmless on stock SQLite (errors trapped).
      try {
        await db.execAsync(`PRAGMA key = '${key}';`);
      } catch {
        // stock SQLite: encryption skipped, log only
        console.warn('SQLCipher not available; DB is plaintext on disk');
      }
      await db.execAsync('PRAGMA journal_mode = WAL;');
      await db.execAsync('PRAGMA foreign_keys = ON;');
      return db;
    })();
  }
  return dbPromise;
}

export async function closeDb(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise;
    await db.closeAsync();
    dbPromise = null;
  }
}
```

- [ ] **Step 2: Migration runner**

`src/db/migrations.ts`:

```ts
import type { SQLiteDatabase } from 'expo-sqlite';

export interface Migration {
  version: number;
  up: (db: SQLiteDatabase) => Promise<void>;
}

export async function runMigrations(db: SQLiteDatabase, migrations: Migration[]): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);
  const rows = await db.getAllAsync<{ version: number }>('SELECT version FROM _migrations');
  const applied = new Set(rows.map((r) => r.version));
  const ordered = [...migrations].sort((a, b) => a.version - b.version);
  for (const m of ordered) {
    if (applied.has(m.version)) continue;
    await db.withTransactionAsync(async () => {
      await m.up(db);
      await db.runAsync('INSERT INTO _migrations (version, applied_at) VALUES (?, ?)', [
        m.version,
        new Date().toISOString(),
      ]);
    });
  }
}
```

- [ ] **Step 3: Initial schema migration**

`src/db/migrations/001_init.ts`:

```ts
import type { Migration } from '../migrations';

export const m001_init: Migration = {
  version: 1,
  async up(db) {
    await db.execAsync(`
      CREATE TABLE accounts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('cash','bank','credit_card','other')),
        currency TEXT NOT NULL CHECK (currency IN ('LAK','THB','USD')),
        opening_balance_micro INTEGER NOT NULL DEFAULT 0,
        archived INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        sync_version INTEGER NOT NULL DEFAULT 1
      );
      CREATE INDEX accounts_user_updated ON accounts (user_id, updated_at);

      CREATE TABLE categories (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        icon TEXT,
        color TEXT,
        kind TEXT NOT NULL CHECK (kind IN ('expense','income')),
        archived INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        sync_version INTEGER NOT NULL DEFAULT 1
      );
      CREATE INDEX categories_user_updated ON categories (user_id, updated_at);

      CREATE TABLE transactions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        account_id TEXT NOT NULL,
        category_id TEXT,
        kind TEXT NOT NULL CHECK (kind IN ('expense','income','transfer')),
        amount_micro INTEGER NOT NULL,
        currency TEXT NOT NULL CHECK (currency IN ('LAK','THB','USD')),
        fx_rate_to_base REAL NOT NULL,
        amount_base_micro INTEGER NOT NULL,
        occurred_at TEXT NOT NULL,
        merchant TEXT,
        note TEXT,
        receipt_url TEXT,
        source TEXT NOT NULL DEFAULT 'manual',
        source_ref TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        sync_version INTEGER NOT NULL DEFAULT 1
      );
      CREATE INDEX txn_user_occurred ON transactions (user_id, occurred_at DESC);
      CREATE INDEX txn_user_updated ON transactions (user_id, updated_at);
      CREATE INDEX txn_user_account ON transactions (user_id, account_id);
      CREATE INDEX txn_user_category ON transactions (user_id, category_id);
      CREATE UNIQUE INDEX txn_source_ref_unique
        ON transactions (user_id, source, source_ref)
        WHERE source_ref IS NOT NULL;

      CREATE TABLE transfers (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        from_txn_id TEXT NOT NULL,
        to_txn_id TEXT NOT NULL,
        fx_rate REAL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        sync_version INTEGER NOT NULL DEFAULT 1
      );
      CREATE INDEX transfers_user_updated ON transfers (user_id, updated_at);

      CREATE TABLE budgets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        category_id TEXT NOT NULL,
        month TEXT NOT NULL,
        limit_amount_micro INTEGER NOT NULL,
        limit_currency TEXT NOT NULL,
        last_alert_threshold INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        sync_version INTEGER NOT NULL DEFAULT 1,
        UNIQUE (user_id, category_id, month)
      );

      CREATE TABLE merchant_rules (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        pattern TEXT NOT NULL,
        is_regex INTEGER NOT NULL DEFAULT 0,
        category_id TEXT NOT NULL,
        account_id TEXT,
        hit_count INTEGER NOT NULL DEFAULT 0,
        last_used_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        sync_version INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE notif_parse_rules (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        app_package TEXT NOT NULL,
        regex TEXT NOT NULL,
        field_map TEXT NOT NULL,
        priority INTEGER NOT NULL DEFAULT 100,
        enabled INTEGER NOT NULL DEFAULT 1,
        default_account_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        sync_version INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE recurring_rules (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        template_txn TEXT NOT NULL,
        cadence TEXT NOT NULL,
        mode TEXT NOT NULL CHECK (mode IN ('auto','confirm')),
        next_run_at TEXT NOT NULL,
        last_notified_at TEXT,
        end_date TEXT,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        sync_version INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE fx_rates (
        date TEXT NOT NULL,
        from_curr TEXT NOT NULL,
        to_curr TEXT NOT NULL,
        rate REAL NOT NULL,
        PRIMARY KEY (date, from_curr, to_curr)
      );

      CREATE TABLE push_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        expo_token TEXT NOT NULL,
        platform TEXT NOT NULL,
        last_seen_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        sync_version INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE outbox (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        op TEXT NOT NULL CHECK (op IN ('insert','update','delete')),
        table_name TEXT NOT NULL,
        row_id TEXT NOT NULL,
        payload TEXT NOT NULL,
        enqueued_at TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        last_error TEXT
      );
      CREATE INDEX outbox_fifo ON outbox (id);

      CREATE TABLE raw_notifs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        package TEXT NOT NULL,
        title TEXT,
        text TEXT,
        posted_at TEXT NOT NULL,
        key TEXT NOT NULL UNIQUE,
        processed INTEGER NOT NULL DEFAULT 0,
        parsed_txn_id TEXT
      );

      CREATE TABLE sync_state (
        table_name TEXT PRIMARY KEY,
        last_sync_at TEXT
      );

      CREATE TABLE profiles (
        id TEXT PRIMARY KEY,
        display_name TEXT,
        base_currency TEXT NOT NULL DEFAULT 'LAK',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        sync_version INTEGER NOT NULL DEFAULT 1
      );
    `);
  },
};
```

- [ ] **Step 4: Test migration runner with in-memory db**

`__tests__/db/migrations.test.ts`:

```ts
import * as SQLite from 'expo-sqlite';
import { runMigrations } from '@/db/migrations';
import { m001_init } from '@/db/migrations/001_init';

jest.mock('expo-sqlite', () => {
  const sqlite = require('better-sqlite3');
  const dbs = new Map<string, any>();
  return {
    openDatabaseAsync: jest.fn(async (name: string) => {
      const db = sqlite(':memory:');
      dbs.set(name, db);
      return {
        execAsync: async (sql: string) => db.exec(sql),
        runAsync: async (sql: string, params: unknown[] = []) => db.prepare(sql).run(...params),
        getAllAsync: async <T>(sql: string, params: unknown[] = []) =>
          db.prepare(sql).all(...params) as T[],
        withTransactionAsync: async (fn: () => Promise<void>) => {
          db.exec('BEGIN');
          try { await fn(); db.exec('COMMIT'); }
          catch (e) { db.exec('ROLLBACK'); throw e; }
        },
        closeAsync: async () => { db.close(); dbs.delete(name); },
      };
    }),
  };
});

describe('migrations', () => {
  it('applies once and is idempotent', async () => {
    const db = await SQLite.openDatabaseAsync('test.db');
    await runMigrations(db as any, [m001_init]);
    await runMigrations(db as any, [m001_init]); // idempotent
    const rows = await (db as any).getAllAsync('SELECT version FROM _migrations');
    expect(rows.map((r: any) => r.version)).toEqual([1]);
  });
});
```

```bash
npm install --save-dev better-sqlite3 @types/better-sqlite3
```

- [ ] **Step 5: Run + commit**

```bash
npm test -- migrations.test
git add -A
git commit -m "feat(db): sqlite open with encryption + migration runner"
```

---

### Task 2.3: Repository base + accounts repo

**Files:**
- Create: `src/db/repos/base.ts`, `src/db/repos/accounts.ts`, `__tests__/db/accounts.repo.test.ts`

- [ ] **Step 1: Generic helpers**

`src/db/repos/base.ts`:

```ts
import type { SQLiteDatabase } from 'expo-sqlite';

export function nowIso(): string {
  return new Date().toISOString();
}

export function notDeleted(): string {
  return 'deleted_at IS NULL';
}

export async function enqueueOutbox(
  db: SQLiteDatabase,
  op: 'insert' | 'update' | 'delete',
  table_name: string,
  row_id: string,
  payload: unknown,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO outbox (op, table_name, row_id, payload, enqueued_at)
     VALUES (?, ?, ?, ?, ?)`,
    [op, table_name, row_id, JSON.stringify(payload), nowIso()],
  );
}
```

- [ ] **Step 2: Accounts repository**

`src/db/repos/accounts.ts`:

```ts
import type { SQLiteDatabase } from 'expo-sqlite';
import type { Account, AccountType, Currency } from '@/domain/types';
import { enqueueOutbox, nowIso } from './base';
import * as Crypto from 'expo-crypto';

export interface CreateAccountInput {
  user_id: string;
  name: string;
  type: AccountType;
  currency: Currency;
  opening_balance_micro?: number;
}

export async function createAccount(
  db: SQLiteDatabase,
  input: CreateAccountInput,
): Promise<Account> {
  const id = Crypto.randomUUID();
  const now = nowIso();
  const row: Account = {
    id,
    user_id: input.user_id,
    name: input.name,
    type: input.type,
    currency: input.currency,
    opening_balance_micro: input.opening_balance_micro ?? 0,
    archived: false,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    sync_version: 1,
  };
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO accounts (id, user_id, name, type, currency,
         opening_balance_micro, archived, created_at, updated_at, sync_version)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, 1)`,
      [id, row.user_id, row.name, row.type, row.currency,
        row.opening_balance_micro, now, now],
    );
    await enqueueOutbox(db, 'insert', 'accounts', id, row);
  });
  return row;
}

export async function listAccounts(db: SQLiteDatabase, user_id: string): Promise<Account[]> {
  return db.getAllAsync<Account>(
    `SELECT *, archived AS archived FROM accounts
     WHERE user_id = ? AND deleted_at IS NULL
     ORDER BY archived ASC, name ASC`,
    [user_id],
  ).then((rows) => rows.map((r) => ({ ...r, archived: !!(r as unknown as { archived: number }).archived })));
}

export async function updateAccount(
  db: SQLiteDatabase,
  id: string,
  patch: Partial<Pick<Account, 'name' | 'archived' | 'opening_balance_micro'>>,
): Promise<void> {
  const now = nowIso();
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (patch.name !== undefined) { sets.push('name = ?'); vals.push(patch.name); }
  if (patch.archived !== undefined) { sets.push('archived = ?'); vals.push(patch.archived ? 1 : 0); }
  if (patch.opening_balance_micro !== undefined) {
    sets.push('opening_balance_micro = ?'); vals.push(patch.opening_balance_micro);
  }
  if (sets.length === 0) return;
  sets.push('updated_at = ?', 'sync_version = sync_version + 1');
  vals.push(now);
  vals.push(id);
  await db.withTransactionAsync(async () => {
    await db.runAsync(`UPDATE accounts SET ${sets.join(', ')} WHERE id = ?`, vals);
    const after = await db.getAllAsync<Account>(`SELECT * FROM accounts WHERE id = ?`, [id]);
    if (after[0]) await enqueueOutbox(db, 'update', 'accounts', id, after[0]);
  });
}

export async function deleteAccount(db: SQLiteDatabase, id: string): Promise<void> {
  const now = nowIso();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE accounts SET deleted_at = ?, updated_at = ?, sync_version = sync_version + 1 WHERE id = ?`,
      [now, now, id],
    );
    await enqueueOutbox(db, 'delete', 'accounts', id, { id, deleted_at: now });
  });
}
```

- [ ] **Step 3: Tests**

`__tests__/db/accounts.repo.test.ts`:

```ts
import * as SQLite from 'expo-sqlite';
import { runMigrations } from '@/db/migrations';
import { m001_init } from '@/db/migrations/001_init';
import { createAccount, listAccounts, updateAccount, deleteAccount } from '@/db/repos/accounts';

const UID = 'u1';

async function freshDb() {
  const db = await SQLite.openDatabaseAsync(`acc-${Math.random()}.db`);
  await runMigrations(db as any, [m001_init]);
  return db;
}

describe('accounts repo', () => {
  it('creates and lists', async () => {
    const db = await freshDb();
    const a = await createAccount(db as any, {
      user_id: UID, name: 'Cash', type: 'cash', currency: 'LAK',
    });
    const list = await listAccounts(db as any, UID);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(a.id);
  });

  it('enqueues outbox on create', async () => {
    const db = await freshDb();
    await createAccount(db as any, { user_id: UID, name: 'Cash', type: 'cash', currency: 'LAK' });
    const ob = await (db as any).getAllAsync('SELECT * FROM outbox');
    expect(ob).toHaveLength(1);
    expect(ob[0].op).toBe('insert');
    expect(ob[0].table_name).toBe('accounts');
  });

  it('updates and bumps sync_version', async () => {
    const db = await freshDb();
    const a = await createAccount(db as any, { user_id: UID, name: 'X', type: 'cash', currency: 'LAK' });
    await updateAccount(db as any, a.id, { name: 'Y' });
    const list = await listAccounts(db as any, UID);
    expect(list[0].name).toBe('Y');
    expect(list[0].sync_version).toBe(2);
  });

  it('soft-deletes', async () => {
    const db = await freshDb();
    const a = await createAccount(db as any, { user_id: UID, name: 'X', type: 'cash', currency: 'LAK' });
    await deleteAccount(db as any, a.id);
    const list = await listAccounts(db as any, UID);
    expect(list).toHaveLength(0);
  });
});
```

- [ ] **Step 4: Run + commit**

```bash
npm test -- accounts.repo
git add -A
git commit -m "feat(db): accounts repository with outbox enqueue"
```

---

### Task 2.4: Repos for categories, transactions, transfers, budgets, fx_rates

Each follows the exact same pattern as accounts: pure functions over SQLite, every write also enqueues outbox in the same transaction. Step 1 lists the files; Steps 2–6 give the full code per file. Tests follow the accounts test shape.

**Files:**
- Create: `src/db/repos/categories.ts`, `src/db/repos/transactions.ts`, `src/db/repos/transfers.ts`, `src/db/repos/budgets.ts`, `src/db/repos/fx_rates.ts`, `src/db/repos/profiles.ts`
- Test: `__tests__/db/categories.repo.test.ts`, `__tests__/db/transactions.repo.test.ts`, `__tests__/db/transfers.repo.test.ts`, `__tests__/db/budgets.repo.test.ts`, `__tests__/db/fx_rates.repo.test.ts`

- [ ] **Step 1: categories.ts** — same shape as accounts. Inputs: `name, icon?, color?, kind`. Update fields: `name, icon, color, archived`. List filters by `kind` optionally.
- [ ] **Step 2: transactions.ts** — Inputs include `account_id, category_id, kind, amount_micro, currency, fx_rate_to_base, occurred_at, merchant?, note?, source, source_ref?`. `amount_base_micro = applyRate(amount_micro, fx_rate_to_base)`. List supports `{ from?, to?, account_id?, category_id?, kind?, source?, search? }` filters.
- [ ] **Step 3: transfers.ts** — Create takes `from_txn_id, to_txn_id, fx_rate?`. No partial update; only delete (which cascade-deletes the paired transactions in the same tx).
- [ ] **Step 4: budgets.ts** — Unique on `(user_id, category_id, month)`. `upsertBudget` inserts or updates limit fields.
- [ ] **Step 5: fx_rates.ts** — Local cache only; `getRate(date, from, to)` returns rate; falls back to most recent stored row.
- [ ] **Step 6: profiles.ts** — `getProfile`, `setBaseCurrency`. Updates enqueue outbox.

For each file, write tests covering: create, list, update, delete (where applicable), outbox enqueue. Test file template mirrors `accounts.repo.test.ts` with the table-specific input shape.

> **Engineer note:** because every repo is structurally identical to `accounts`, write `categories` first by copying `accounts.ts` and find-replacing column names; verify tests; commit; repeat for the others. Do not extract a generic CRUD until the third repository — wait until duplication actually hurts (per spec §10 "Repository layer").

- [ ] **Step 7: Commit each repo+test pair separately**

```bash
git add src/db/repos/categories.ts __tests__/db/categories.repo.test.ts
git commit -m "feat(db): categories repository"
# repeat for transactions, transfers, budgets, fx_rates, profiles
```

---

## Phase 3 — Sync engine

### Task 3.1: Supabase client

**Files:**
- Create: `src/lib/supabase.ts`, `__tests__/lib/supabase.test.ts`

- [ ] **Step 1: Client factory**

`src/lib/supabase.ts`:

```ts
import 'react-native-url-polyfill/auto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { env } from './env';

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}

export function resetSupabaseClientForTests(): void {
  client = null;
}
```

```bash
npm install react-native-url-polyfill
```

- [ ] **Step 2: Smoke test**

`__tests__/lib/supabase.test.ts`:

```ts
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://x.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'k';

import { getSupabase, resetSupabaseClientForTests } from '@/lib/supabase';

describe('supabase client', () => {
  afterEach(() => resetSupabaseClientForTests());

  it('returns a singleton', () => {
    const a = getSupabase();
    const b = getSupabase();
    expect(a).toBe(b);
  });
});
```

- [ ] **Step 3: Run + commit**

```bash
npm test -- supabase.test
git add -A
git commit -m "feat(lib): supabase client singleton"
```

---

### Task 3.2: Network detector

**Files:**
- Create: `src/sync/network.ts`, `__tests__/sync/network.test.ts`

- [ ] **Step 1: Wrapper**

`src/sync/network.ts`:

```ts
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

export type NetworkListener = (online: boolean) => void;

let lastOnline = false;
const listeners = new Set<NetworkListener>();
let unsub: (() => void) | null = null;

function update(state: NetInfoState) {
  const online = !!(state.isConnected && state.isInternetReachable !== false);
  if (online !== lastOnline) {
    lastOnline = online;
    for (const l of listeners) l(online);
  }
}

export function startNetworkWatcher(): void {
  if (unsub) return;
  NetInfo.fetch().then(update);
  unsub = NetInfo.addEventListener(update);
}

export function stopNetworkWatcher(): void {
  if (unsub) { unsub(); unsub = null; }
}

export function isOnline(): boolean {
  return lastOnline;
}

export function onNetworkChange(l: NetworkListener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}
```

- [ ] **Step 2: Test the listener notification**

`__tests__/sync/network.test.ts`:

```ts
jest.mock('@react-native-community/netinfo', () => {
  let cb: ((s: any) => void) | null = null;
  return {
    fetch: jest.fn(() => Promise.resolve({ isConnected: false })),
    addEventListener: jest.fn((handler: any) => {
      cb = handler;
      return () => { cb = null; };
    }),
    __setState: (s: any) => cb && cb(s),
  };
});

import * as NetInfo from '@react-native-community/netinfo';
import { startNetworkWatcher, onNetworkChange, stopNetworkWatcher } from '@/sync/network';

describe('network', () => {
  it('fires when transitioning offline → online', async () => {
    const seen: boolean[] = [];
    const off = onNetworkChange((o) => seen.push(o));
    startNetworkWatcher();
    await Promise.resolve();
    (NetInfo as any).__setState({ isConnected: true, isInternetReachable: true });
    expect(seen).toContain(true);
    off();
    stopNetworkWatcher();
  });
});
```

- [ ] **Step 3: Run + commit**

```bash
npm test -- network.test
git add -A
git commit -m "feat(sync): network watcher"
```

---

### Task 3.3: Outbox flush worker

**Files:**
- Create: `src/sync/outbox.ts`, `__tests__/sync/outbox.test.ts`

- [ ] **Step 1: Implementation**

`src/sync/outbox.ts`:

```ts
import type { SQLiteDatabase } from 'expo-sqlite';
import type { SupabaseClient, PostgrestError } from '@supabase/supabase-js';

export interface OutboxRow {
  id: number;
  op: 'insert' | 'update' | 'delete';
  table_name: string;
  row_id: string;
  payload: string;
  enqueued_at: string;
  attempts: number;
  last_error: string | null;
}

const MAX_BACKOFF_MS = 60_000;
function backoff(attempts: number): number {
  return Math.min(MAX_BACKOFF_MS, 500 * 2 ** attempts);
}

function classify(err: PostgrestError | null): 'retry' | 'drop' | 'stale' {
  if (!err) return 'drop';
  if (err.code === 'PT401') return 'stale';
  if (err.code && err.code.startsWith('4')) return 'drop'; // 4xx → don't loop
  return 'retry';
}

export async function flushOutbox(
  db: SQLiteDatabase,
  sb: SupabaseClient,
  opts: { now?: () => number } = {},
): Promise<{ flushed: number; deferred: number; dropped: number }> {
  const now = opts.now ?? Date.now;
  let flushed = 0, deferred = 0, dropped = 0;

  while (true) {
    const rows = await db.getAllAsync<OutboxRow>(
      `SELECT * FROM outbox ORDER BY id ASC LIMIT 1`,
    );
    const row = rows[0];
    if (!row) break;

    const payload = JSON.parse(row.payload);

    let err: PostgrestError | null = null;
    if (row.op === 'insert' || row.op === 'update') {
      const r = await sb.from(row.table_name).upsert(payload, { onConflict: 'id' });
      err = r.error;
    } else {
      // soft delete: send updated row with deleted_at set
      const r = await sb.from(row.table_name).upsert(payload, { onConflict: 'id' });
      err = r.error;
    }

    if (!err) {
      await db.runAsync(`DELETE FROM outbox WHERE id = ?`, [row.id]);
      flushed++;
      continue;
    }

    const verdict = classify(err);
    if (verdict === 'drop') {
      await db.runAsync(
        `UPDATE outbox SET attempts = attempts + 1, last_error = ? WHERE id = ?`,
        [err.message, row.id],
      );
      // 4xx loops indefinitely — promote to dead-letter by deleting after 5 tries.
      if (row.attempts >= 4) {
        await db.runAsync(`DELETE FROM outbox WHERE id = ?`, [row.id]);
        dropped++;
        continue;
      }
      deferred++;
      break;
    } else if (verdict === 'stale') {
      // Caller's responsibility to re-pull and retry. Mark and break.
      await db.runAsync(
        `UPDATE outbox SET attempts = attempts + 1, last_error = ? WHERE id = ?`,
        [err.message, row.id],
      );
      deferred++;
      break;
    } else {
      // network/5xx: backoff and stop the cycle
      const wait = backoff(row.attempts);
      await db.runAsync(
        `UPDATE outbox SET attempts = attempts + 1, last_error = ? WHERE id = ?`,
        [err.message, row.id],
      );
      // signal caller to schedule retry after `wait`
      deferred++;
      void wait; // wait used by orchestrator
      break;
    }
  }

  return { flushed, deferred, dropped };
}
```

- [ ] **Step 2: Test happy path + 4xx drop**

`__tests__/sync/outbox.test.ts`:

```ts
import * as SQLite from 'expo-sqlite';
import { runMigrations } from '@/db/migrations';
import { m001_init } from '@/db/migrations/001_init';
import { flushOutbox } from '@/sync/outbox';

function fakeSupabase(behavior: 'ok' | 'pt401' | 'net5xx' | 'rls403') {
  return {
    from: () => ({
      upsert: async () => {
        switch (behavior) {
          case 'ok': return { error: null };
          case 'pt401': return { error: { code: 'PT401', message: 'stale' } };
          case 'net5xx': return { error: { code: '50000', message: 'boom' } };
          case 'rls403': return { error: { code: '42501', message: 'rls' } };
        }
      },
    }),
  } as any;
}

describe('outbox flush', () => {
  async function db() {
    const x = await SQLite.openDatabaseAsync(`ob-${Math.random()}.db`);
    await runMigrations(x as any, [m001_init]);
    await (x as any).runAsync(
      `INSERT INTO outbox (op, table_name, row_id, payload, enqueued_at)
       VALUES ('insert','accounts','a1','{"id":"a1"}', ?)`, [new Date().toISOString()]);
    return x as any;
  }

  it('drains on success', async () => {
    const x = await db();
    const r = await flushOutbox(x, fakeSupabase('ok'));
    expect(r.flushed).toBe(1);
    const left = await x.getAllAsync('SELECT * FROM outbox');
    expect(left).toHaveLength(0);
  });

  it('defers on PT401', async () => {
    const x = await db();
    const r = await flushOutbox(x, fakeSupabase('pt401'));
    expect(r.deferred).toBe(1);
    const left = await x.getAllAsync('SELECT * FROM outbox');
    expect(left).toHaveLength(1);
  });

  it('drops after retries on persistent 4xx', async () => {
    const x = await db();
    for (let i = 0; i < 6; i++) await flushOutbox(x, fakeSupabase('rls403'));
    const left = await x.getAllAsync('SELECT * FROM outbox');
    expect(left).toHaveLength(0);
  });
});
```

- [ ] **Step 3: Run + commit**

```bash
npm test -- outbox.test
git add -A
git commit -m "feat(sync): outbox flush worker with retry classification"
```

---

### Task 3.4: Pull worker (delta fetch)

**Files:**
- Create: `src/sync/pull.ts`, `__tests__/sync/pull.test.ts`

- [ ] **Step 1: Implementation**

`src/sync/pull.ts`:

```ts
import type { SQLiteDatabase } from 'expo-sqlite';
import type { SupabaseClient } from '@supabase/supabase-js';

export const SYNCED_TABLES = [
  'profiles',
  'accounts',
  'categories',
  'transactions',
  'transfers',
  'budgets',
  'merchant_rules',
  'notif_parse_rules',
  'recurring_rules',
  'fx_rates',
  'push_tokens',
] as const;
export type SyncedTable = typeof SYNCED_TABLES[number];

const PAGE = 500;

export async function pullTable(
  db: SQLiteDatabase,
  sb: SupabaseClient,
  table: SyncedTable,
): Promise<number> {
  const cursor = await readCursor(db, table);
  let total = 0;
  let nextCursor = cursor;
  while (true) {
    const q = sb.from(table).select('*').gt('updated_at', nextCursor).order('updated_at', { ascending: true }).limit(PAGE);
    const { data, error } = await q;
    if (error) throw error;
    if (!data || data.length === 0) break;
    await mergeRows(db, table, data);
    nextCursor = data[data.length - 1].updated_at;
    total += data.length;
    if (data.length < PAGE) break;
  }
  if (nextCursor !== cursor) await writeCursor(db, table, nextCursor);
  return total;
}

export async function pullAll(db: SQLiteDatabase, sb: SupabaseClient): Promise<number> {
  let n = 0;
  for (const t of SYNCED_TABLES) n += await pullTable(db, sb, t);
  return n;
}

async function readCursor(db: SQLiteDatabase, table: string): Promise<string> {
  const rows = await db.getAllAsync<{ last_sync_at: string }>(
    `SELECT last_sync_at FROM sync_state WHERE table_name = ?`, [table]);
  return rows[0]?.last_sync_at ?? '1970-01-01T00:00:00Z';
}

async function writeCursor(db: SQLiteDatabase, table: string, ts: string): Promise<void> {
  await db.runAsync(
    `INSERT INTO sync_state (table_name, last_sync_at) VALUES (?, ?)
     ON CONFLICT(table_name) DO UPDATE SET last_sync_at = excluded.last_sync_at`,
    [table, ts]);
}

async function mergeRows(db: SQLiteDatabase, table: string, rows: any[]): Promise<void> {
  if (rows.length === 0) return;
  const keys = Object.keys(rows[0]);
  const placeholders = '(' + keys.map(() => '?').join(',') + ')';
  const sql = `INSERT OR REPLACE INTO ${table} (${keys.join(',')}) VALUES ${placeholders}`;
  await db.withTransactionAsync(async () => {
    for (const r of rows) {
      const local = await db.getAllAsync<{ sync_version: number }>(
        `SELECT sync_version FROM ${table} WHERE id = ?`, [r.id]);
      const localV = local[0]?.sync_version ?? 0;
      if ((r.sync_version ?? 0) >= localV) {
        await db.runAsync(sql, keys.map((k) => normalize(r[k])));
      }
    }
  });
}

function normalize(v: unknown): unknown {
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v && typeof v === 'object') return JSON.stringify(v);
  return v as never;
}
```

- [ ] **Step 2: Test merge respects sync_version**

`__tests__/sync/pull.test.ts`:

```ts
import * as SQLite from 'expo-sqlite';
import { runMigrations } from '@/db/migrations';
import { m001_init } from '@/db/migrations/001_init';
import { pullTable } from '@/sync/pull';

function fakeSupabase(rows: any[]) {
  return {
    from: () => ({
      select: () => ({
        gt: () => ({
          order: () => ({
            limit: async () => ({ data: rows, error: null }),
          }),
        }),
      }),
    }),
  } as any;
}

describe('pull', () => {
  it('inserts new rows and advances cursor', async () => {
    const x = await SQLite.openDatabaseAsync(`p-${Math.random()}.db`);
    await runMigrations(x as any, [m001_init]);
    const sb = fakeSupabase([
      {
        id: 'a1', user_id: 'u1', name: 'A', type: 'cash', currency: 'LAK',
        opening_balance_micro: 0, archived: false,
        created_at: '2026-05-07T00:00:00Z', updated_at: '2026-05-07T01:00:00Z',
        deleted_at: null, sync_version: 1,
      },
    ]);
    const n = await pullTable(x as any, sb, 'accounts');
    expect(n).toBe(1);
    const cur = await (x as any).getAllAsync(`SELECT last_sync_at FROM sync_state WHERE table_name = 'accounts'`);
    expect(cur[0].last_sync_at).toBe('2026-05-07T01:00:00Z');
  });

  it('does not overwrite a higher local sync_version', async () => {
    const x = await SQLite.openDatabaseAsync(`p2-${Math.random()}.db`);
    await runMigrations(x as any, [m001_init]);
    await (x as any).runAsync(
      `INSERT INTO accounts (id,user_id,name,type,currency,opening_balance_micro,archived,
        created_at,updated_at,sync_version) VALUES ('a1','u1','LOCAL','cash','LAK',0,0,?,?,5)`,
      ['2026-05-07T00:00:00Z', '2026-05-07T00:00:00Z']);
    const sb = fakeSupabase([
      { id:'a1', user_id:'u1', name:'REMOTE', type:'cash', currency:'LAK',
        opening_balance_micro:0, archived:false,
        created_at:'2026-05-07T00:00:00Z', updated_at:'2026-05-07T01:00:00Z',
        deleted_at:null, sync_version:3 },
    ]);
    await pullTable(x as any, sb, 'accounts');
    const r = await (x as any).getAllAsync(`SELECT name FROM accounts WHERE id='a1'`);
    expect(r[0].name).toBe('LOCAL');
  });
});
```

- [ ] **Step 3: Run + commit**

```bash
npm test -- pull.test
git add -A
git commit -m "feat(sync): delta pull with sync_version conflict resolution"
```

---

### Task 3.5: Realtime subscription

**Files:**
- Create: `src/sync/realtime.ts`

- [ ] **Step 1: Implementation**

`src/sync/realtime.ts`:

```ts
import type { SQLiteDatabase } from 'expo-sqlite';
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { SYNCED_TABLES, pullTable, type SyncedTable } from './pull';

let channel: RealtimeChannel | null = null;

export function startRealtime(db: SQLiteDatabase, sb: SupabaseClient, userId: string): void {
  if (channel) return;
  channel = sb.channel(`u:${userId}`);
  for (const t of SYNCED_TABLES) {
    channel.on('postgres_changes',
      { event: '*', schema: 'public', table: t, filter: `user_id=eq.${userId}` },
      () => { void pullTable(db, sb, t as SyncedTable); });
  }
  channel.subscribe();
}

export function stopRealtime(sb: SupabaseClient): void {
  if (channel) {
    sb.removeChannel(channel);
    channel = null;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/sync/realtime.ts
git commit -m "feat(sync): realtime subscriptions trigger delta pulls"
```

(Realtime is exercised via E2E in Phase 16; no unit test here because the `RealtimeChannel` mock surface adds noise without value.)

---

### Task 3.6: Sync orchestrator

**Files:**
- Create: `src/sync/index.ts`, `__tests__/sync/orchestrator.test.ts`

- [ ] **Step 1: Implementation**

`src/sync/index.ts`:

```ts
import type { SQLiteDatabase } from 'expo-sqlite';
import type { SupabaseClient } from '@supabase/supabase-js';
import { flushOutbox } from './outbox';
import { pullAll, pullTable, SYNCED_TABLES } from './pull';
import { startRealtime, stopRealtime } from './realtime';
import { isOnline, onNetworkChange, startNetworkWatcher } from './network';

let cycling = false;

export interface SyncDeps {
  db: SQLiteDatabase;
  sb: SupabaseClient;
  userId: string;
}

export async function startSync(deps: SyncDeps): Promise<void> {
  startNetworkWatcher();
  onNetworkChange((online) => { if (online) void cycle(deps); });
  startRealtime(deps.db, deps.sb, deps.userId);
  await cycle(deps);
}

export async function cycle(deps: SyncDeps): Promise<void> {
  if (cycling || !isOnline()) return;
  cycling = true;
  try {
    const flush = await flushOutbox(deps.db, deps.sb);
    if (flush.deferred > 0) {
      // possible PT401 — re-pull affected table(s) and try once more
      await pullAll(deps.db, deps.sb);
      await flushOutbox(deps.db, deps.sb);
    }
    await pullAll(deps.db, deps.sb);
  } finally {
    cycling = false;
  }
}

export function stopSync(deps: { sb: SupabaseClient }): void {
  stopRealtime(deps.sb);
}

export { pullTable, SYNCED_TABLES };
```

- [ ] **Step 2: Test orchestration order**

`__tests__/sync/orchestrator.test.ts`:

```ts
jest.mock('@/sync/network', () => ({
  startNetworkWatcher: jest.fn(),
  onNetworkChange: jest.fn(),
  isOnline: () => true,
}));
jest.mock('@/sync/realtime', () => ({
  startRealtime: jest.fn(),
  stopRealtime: jest.fn(),
}));

const flushSpy = jest.fn().mockResolvedValue({ flushed: 0, deferred: 0, dropped: 0 });
const pullAllSpy = jest.fn().mockResolvedValue(0);

jest.mock('@/sync/outbox', () => ({ flushOutbox: (...a: any[]) => flushSpy(...a) }));
jest.mock('@/sync/pull', () => ({
  pullAll: (...a: any[]) => pullAllSpy(...a),
  SYNCED_TABLES: [],
  pullTable: jest.fn(),
}));

import { cycle } from '@/sync/index';

describe('sync orchestrator', () => {
  it('flushes then pulls', async () => {
    const deps = { db: {} as any, sb: {} as any, userId: 'u1' };
    await cycle(deps);
    expect(flushSpy).toHaveBeenCalledTimes(1);
    expect(pullAllSpy).toHaveBeenCalledTimes(1);
  });

  it('pulls + reflushes on deferred', async () => {
    flushSpy.mockClear(); pullAllSpy.mockClear();
    flushSpy
      .mockResolvedValueOnce({ flushed: 0, deferred: 1, dropped: 0 })
      .mockResolvedValueOnce({ flushed: 1, deferred: 0, dropped: 0 });
    const deps = { db: {} as any, sb: {} as any, userId: 'u1' };
    await cycle(deps);
    expect(flushSpy).toHaveBeenCalledTimes(2);
    expect(pullAllSpy).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 3: Run + commit**

```bash
npm test -- orchestrator.test
git add -A
git commit -m "feat(sync): orchestrator wires flush, pull, realtime, network"
```

---

## Phase 4 — Auth + onboarding

### Task 4.1: Auth store

**Files:**
- Create: `src/store/auth.ts`, `__tests__/store/auth.test.ts`

- [ ] **Step 1: Zustand auth store**

`src/store/auth.ts`:

```ts
import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase';

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  init: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  session: null,
  user: null,
  loading: true,
  async init() {
    const sb = getSupabase();
    const { data } = await sb.auth.getSession();
    set({ session: data.session, user: data.session?.user ?? null, loading: false });
    sb.auth.onAuthStateChange((_evt, session) => {
      set({ session, user: session?.user ?? null });
    });
  },
  async signOut() {
    await getSupabase().auth.signOut();
  },
}));
```

- [ ] **Step 2: Smoke test (mocked)**

`__tests__/store/auth.test.ts`:

```ts
const fakeAuth = {
  getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
  onAuthStateChange: jest.fn(),
  signOut: jest.fn().mockResolvedValue({ error: null }),
};
jest.mock('@/lib/supabase', () => ({ getSupabase: () => ({ auth: fakeAuth }) }));

import { useAuth } from '@/store/auth';

describe('auth store', () => {
  it('initialises with no session', async () => {
    await useAuth.getState().init();
    expect(useAuth.getState().user).toBeNull();
    expect(useAuth.getState().loading).toBe(false);
  });
});
```

- [ ] **Step 3: Run + commit**

```bash
npm test -- store/auth
git add -A
git commit -m "feat(store): auth state with Supabase session"
```

---

### Task 4.2: Sign-in / sign-up screens

**Files:**
- Create: `app/(auth)/_layout.tsx`, `app/(auth)/sign-in.tsx`, `app/(auth)/sign-up.tsx`, `app/(auth)/forgot-password.tsx`, `src/ui/Button.tsx`, `src/ui/Field.tsx`

- [ ] **Step 1: Shared Button + Field**

`src/ui/Button.tsx`:

```tsx
import { Pressable, Text, type ViewStyle, type TextStyle, ActivityIndicator } from 'react-native';

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
};

const base: ViewStyle = { paddingVertical: 14, paddingHorizontal: 18, borderRadius: 12, alignItems: 'center' };
const variants: Record<NonNullable<Props['variant']>, ViewStyle> = {
  primary: { backgroundColor: '#111827' },
  secondary: { backgroundColor: '#E5E7EB' },
  ghost: { backgroundColor: 'transparent' },
};
const text: Record<NonNullable<Props['variant']>, TextStyle> = {
  primary: { color: 'white', fontWeight: '600' },
  secondary: { color: '#111827', fontWeight: '600' },
  ghost: { color: '#3B82F6', fontWeight: '600' },
};

export function Button({ title, onPress, loading, disabled, variant = 'primary' }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading || disabled}
      style={[base, variants[variant], (loading || disabled) && { opacity: 0.6 }]}
    >
      {loading ? <ActivityIndicator color={variant === 'primary' ? 'white' : '#111827'} /> : <Text style={text[variant]}>{title}</Text>}
    </Pressable>
  );
}
```

`src/ui/Field.tsx`:

```tsx
import { TextInput, View, Text, type TextInputProps } from 'react-native';

type Props = TextInputProps & { label: string; error?: string };

export function Field({ label, error, ...rest }: Props) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 13, color: '#374151', marginBottom: 6 }}>{label}</Text>
      <TextInput
        {...rest}
        style={{
          borderWidth: 1, borderColor: error ? '#EF4444' : '#D1D5DB',
          borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16,
        }}
        placeholderTextColor="#9CA3AF"
        autoCapitalize="none"
      />
      {error ? <Text style={{ color: '#EF4444', marginTop: 4, fontSize: 12 }}>{error}</Text> : null}
    </View>
  );
}
```

- [ ] **Step 2: Auth layout (no-header)**

`app/(auth)/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Step 3: Sign-in**

`app/(auth)/sign-in.tsx`:

```tsx
import { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Link, router } from 'expo-router';
import { Button } from '@/ui/Button';
import { Field } from '@/ui/Field';
import { getSupabase } from '@/lib/supabase';
import { signInWithGoogle } from '@/lib/google';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onEmail() {
    setErr(null); setLoading(true);
    const { error } = await getSupabase().auth.signInWithPassword({ email, password: pw });
    setLoading(false);
    if (error) setErr(error.message);
    else router.replace('/');
  }

  async function onGoogle() {
    setErr(null);
    try { await signInWithGoogle(); router.replace('/'); }
    catch (e) { setErr((e as Error).message); }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 80 }}>
      <Text style={{ fontSize: 28, fontWeight: '700', marginBottom: 24 }}>Sign in</Text>
      <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" />
      <Field label="Password" value={pw} onChangeText={setPw} secureTextEntry autoComplete="password" />
      {err ? <Text style={{ color: '#EF4444', marginBottom: 12 }}>{err}</Text> : null}
      <Button title="Sign in" onPress={onEmail} loading={loading} />
      <View style={{ height: 12 }} />
      <Button title="Continue with Google" variant="secondary" onPress={onGoogle} />
      <View style={{ height: 24 }} />
      <Link href="/(auth)/forgot-password"><Text style={{ color: '#3B82F6' }}>Forgot password?</Text></Link>
      <Link href="/(auth)/sign-up" style={{ marginTop: 12 }}><Text style={{ color: '#3B82F6' }}>Create account</Text></Link>
    </ScrollView>
  );
}
```

- [ ] **Step 4: Sign-up + Forgot password**

`app/(auth)/sign-up.tsx`:

```tsx
import { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Button } from '@/ui/Button';
import { Field } from '@/ui/Field';
import { getSupabase } from '@/lib/supabase';
import { router } from 'expo-router';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setErr(null); setLoading(true);
    const { error } = await getSupabase().auth.signUp({ email, password: pw });
    setLoading(false);
    if (error) setErr(error.message);
    else router.replace('/(onboarding)/welcome');
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 80 }}>
      <Text style={{ fontSize: 28, fontWeight: '700', marginBottom: 24 }}>Create account</Text>
      <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
      <Field label="Password" value={pw} onChangeText={setPw} secureTextEntry />
      {err ? <Text style={{ color: '#EF4444', marginBottom: 12 }}>{err}</Text> : null}
      <Button title="Create account" onPress={submit} loading={loading} />
    </ScrollView>
  );
}
```

`app/(auth)/forgot-password.tsx`:

```tsx
import { useState } from 'react';
import { Text, ScrollView } from 'react-native';
import { Button } from '@/ui/Button';
import { Field } from '@/ui/Field';
import { getSupabase } from '@/lib/supabase';

export default function Forgot() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  async function submit() {
    setMsg(null);
    const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
      redirectTo: 'personalexpenses://reset',
    });
    setMsg(error ? error.message : 'Reset email sent.');
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 80 }}>
      <Text style={{ fontSize: 28, fontWeight: '700', marginBottom: 24 }}>Forgot password</Text>
      <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
      <Button title="Send reset link" onPress={submit} />
      {msg ? <Text style={{ marginTop: 12 }}>{msg}</Text> : null}
    </ScrollView>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(auth): sign-in, sign-up, forgot-password screens"
```

---

### Task 4.3: Google sign-in (expo-auth-session)

**Files:**
- Create: `src/lib/google.ts`, `docs/operations/google-oauth-setup.md`

- [ ] **Step 1: Setup doc (manual GCP step)**

`docs/operations/google-oauth-setup.md`:

```md
# Google OAuth setup

## Google Cloud Console
1. Create OAuth client IDs:
   - iOS — bundle id `la.personalexpenses.app`
   - Android — package `la.personalexpenses.app`, SHA-1 from `eas credentials`
   - Web — used by Supabase auth
2. In Supabase → Authentication → Providers → Google: enable, paste Web client id + secret.
3. Add Web client id to `.env` as `EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID_WEB`.
4. Add iOS / Android client ids to `.env`.

## Redirect URIs
- iOS: `personalexpenses://`
- Android: `personalexpenses://`
- Supabase callback: `https://<ref>.supabase.co/auth/v1/callback`
```

- [ ] **Step 2: Implementation**

`src/lib/google.ts`:

```ts
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { getSupabase } from './supabase';
import { env } from './env';

WebBrowser.maybeCompleteAuthSession();

const REDIRECT = AuthSession.makeRedirectUri({ scheme: 'personalexpenses' });

export async function signInWithGoogle(): Promise<void> {
  const sb = getSupabase();
  const { data, error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: REDIRECT, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data.url) throw new Error('no oauth url');

  const result = await WebBrowser.openAuthSessionAsync(data.url, REDIRECT);
  if (result.type !== 'success' || !result.url) throw new Error('cancelled');

  const url = new URL(result.url);
  const params = new URLSearchParams(url.hash.slice(1) || url.search.slice(1));
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (!access_token || !refresh_token) throw new Error('no tokens in callback');
  const { error: setErr } = await sb.auth.setSession({ access_token, refresh_token });
  if (setErr) throw setErr;
  void env; // silence unused if not needed
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(auth): Google OAuth via expo-auth-session"
```

---

### Task 4.4: Auth gate in root layout

**Files:**
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Update root layout**

`app/_layout.tsx`:

```tsx
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/store/auth';

export default function RootLayout() {
  const { session, loading, init } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => { void init(); }, [init]);

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === '(auth)';
    if (!session && !inAuth) router.replace('/(auth)/sign-in');
    if (session && inAuth) router.replace('/');
  }, [loading, session, segments, router]);

  if (loading) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator />
    </View>;
  }

  return <>
    <StatusBar style="auto" />
    <Stack screenOptions={{ headerShown: false }} />
  </>;
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(app): auth gate redirects unauthenticated users"
```

---

### Task 4.5: Onboarding flow

**Files:**
- Create: `app/(onboarding)/_layout.tsx`, `app/(onboarding)/welcome.tsx`, `app/(onboarding)/pick-base-currency.tsx`, `app/(onboarding)/create-first-account.tsx`, `app/(onboarding)/android-notif-permission.tsx`, `app/(onboarding)/android-battery-opt.tsx`, `src/store/onboarding.ts`

- [ ] **Step 1: Onboarding store**

`src/store/onboarding.ts`:

```ts
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'onboarding_v1';

interface State {
  completed: boolean;
  load: () => Promise<void>;
  finish: () => Promise<void>;
}

export const useOnboarding = create<State>((set) => ({
  completed: false,
  async load() {
    const v = await AsyncStorage.getItem(KEY);
    set({ completed: v === '1' });
  },
  async finish() {
    await AsyncStorage.setItem(KEY, '1');
    set({ completed: true });
  },
}));
```

- [ ] **Step 2: Welcome**

`app/(onboarding)/welcome.tsx`:

```tsx
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/ui/Button';

export default function Welcome() {
  return (
    <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
      <Text style={{ fontSize: 28, fontWeight: '700', marginBottom: 8 }}>Welcome</Text>
      <Text style={{ marginBottom: 24, color: '#4B5563' }}>
        Track your expenses across BCEL, cash, and other accounts. Multi-currency. Offline-first.
      </Text>
      <Button title="Get started" onPress={() => router.push('/(onboarding)/pick-base-currency')} />
    </View>
  );
}
```

- [ ] **Step 3: Base currency**

`app/(onboarding)/pick-base-currency.tsx`:

```tsx
import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/ui/Button';
import { setBaseCurrency } from '@/db/repos/profiles';
import { openDb } from '@/db/sqlite';
import { useAuth } from '@/store/auth';
import type { Currency } from '@/domain/types';

const OPTIONS: Currency[] = ['LAK', 'THB', 'USD'];

export default function PickBase() {
  const [v, setV] = useState<Currency>('LAK');
  const userId = useAuth((s) => s.user?.id);

  async function next() {
    if (!userId) return;
    const db = await openDb();
    await setBaseCurrency(db, userId, v);
    router.push('/(onboarding)/create-first-account');
  }

  return (
    <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
      <Text style={{ fontSize: 22, fontWeight: '700', marginBottom: 16 }}>Reporting currency</Text>
      <Text style={{ color: '#4B5563', marginBottom: 16 }}>
        Reports show totals in this currency. You can still log transactions in any currency.
      </Text>
      {OPTIONS.map((c) => (
        <Pressable
          key={c}
          onPress={() => setV(c)}
          style={{
            padding: 14, borderRadius: 10, marginBottom: 8,
            borderWidth: 1, borderColor: v === c ? '#111827' : '#E5E7EB',
            backgroundColor: v === c ? '#F3F4F6' : 'white',
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: '600' }}>{c}</Text>
        </Pressable>
      ))}
      <View style={{ height: 16 }} />
      <Button title="Continue" onPress={next} />
    </View>
  );
}
```

- [ ] **Step 4: First account**

`app/(onboarding)/create-first-account.tsx`:

```tsx
import { useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/ui/Button';
import { Field } from '@/ui/Field';
import { createAccount } from '@/db/repos/accounts';
import { openDb } from '@/db/sqlite';
import { useAuth } from '@/store/auth';

export default function FirstAccount() {
  const userId = useAuth((s) => s.user?.id);
  const [name, setName] = useState('BCEL Savings');
  const [loading, setLoading] = useState(false);

  async function next() {
    if (!userId) return;
    setLoading(true);
    const db = await openDb();
    await createAccount(db, { user_id: userId, name, type: 'bank', currency: 'LAK' });
    setLoading(false);
    router.push(Platform.OS === 'android' ? '/(onboarding)/android-notif-permission' : '/');
  }

  return (
    <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
      <Text style={{ fontSize: 22, fontWeight: '700', marginBottom: 16 }}>Your main account</Text>
      <Text style={{ color: '#4B5563', marginBottom: 16 }}>
        We'll use this as the default for BCEL notifications. You can add more later.
      </Text>
      <Field label="Account name" value={name} onChangeText={setName} />
      <Button title="Create account" onPress={next} loading={loading} />
    </View>
  );
}
```

- [ ] **Step 5: Android perms screens (skeleton)**

`app/(onboarding)/android-notif-permission.tsx`:

```tsx
import { Text, View, Linking, Platform } from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/ui/Button';

export default function AndroidNotifPerm() {
  function open() {
    if (Platform.OS === 'android') {
      Linking.sendIntent('android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS');
    }
  }
  return (
    <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
      <Text style={{ fontSize: 22, fontWeight: '700', marginBottom: 16 }}>BCEL auto-capture</Text>
      <Text style={{ color: '#4B5563', marginBottom: 16 }}>
        We need access to notifications to read BCELOne alerts and turn them into transactions.
        Toggle the app on in the next screen.
      </Text>
      <Button title="Open notification access settings" onPress={open} />
      <View style={{ height: 12 }} />
      <Button title="Next" variant="secondary" onPress={() => router.push('/(onboarding)/android-battery-opt')} />
    </View>
  );
}
```

`app/(onboarding)/android-battery-opt.tsx`:

```tsx
import { Text, View, Linking } from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/ui/Button';
import { useOnboarding } from '@/store/onboarding';

export default function BatteryOpt() {
  const finish = useOnboarding((s) => s.finish);
  function open() {
    Linking.sendIntent('android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS');
  }
  async function done() {
    await finish();
    router.replace('/');
  }
  return (
    <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
      <Text style={{ fontSize: 22, fontWeight: '700', marginBottom: 16 }}>Keep notifications working</Text>
      <Text style={{ color: '#4B5563', marginBottom: 16 }}>
        Some Android phones aggressively kill background services. Disable battery optimisation
        for this app to make sure BCEL alerts get captured.
      </Text>
      <Button title="Open battery settings" onPress={open} />
      <View style={{ height: 12 }} />
      <Button title="Done" onPress={done} />
    </View>
  );
}
```

- [ ] **Step 6: Onboarding gate in root layout**

Update `app/_layout.tsx`'s redirect block:

```tsx
const onboardingDone = useOnboarding((s) => s.completed);
useEffect(() => { void useOnboarding.getState().load(); }, []);

useEffect(() => {
  if (loading) return;
  const inAuth = segments[0] === '(auth)';
  const inOnboarding = segments[0] === '(onboarding)';
  if (!session && !inAuth) router.replace('/(auth)/sign-in');
  else if (session && !onboardingDone && !inOnboarding) router.replace('/(onboarding)/welcome');
  else if (session && onboardingDone && (inAuth || inOnboarding)) router.replace('/');
}, [loading, session, segments, router, onboardingDone]);
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(onboarding): currency, first account, Android perms"
```

---

### Task 4.6: Sync bootstrap on sign-in

**Files:**
- Modify: `app/_layout.tsx`
- Create: `src/sync/bootstrap.ts`

- [ ] **Step 1: Bootstrap helper**

`src/sync/bootstrap.ts`:

```ts
import { openDb } from '@/db/sqlite';
import { runMigrations } from '@/db/migrations';
import { m001_init } from '@/db/migrations/001_init';
import { getSupabase } from '@/lib/supabase';
import { startSync, stopSync } from '@/sync';

let started = false;
let bootDeps: { sb: ReturnType<typeof getSupabase> } | null = null;

export async function bootSyncForUser(userId: string): Promise<void> {
  if (started) return;
  started = true;
  const db = await openDb();
  await runMigrations(db, [m001_init]);
  const sb = getSupabase();
  bootDeps = { sb };
  // Seed default categories on the server (idempotent).
  void sb.rpc('seed_default_categories');
  await startSync({ db, sb, userId });
}

export function stopSyncForUser(): void {
  if (!started) return;
  if (bootDeps) stopSync(bootDeps);
  started = false;
  bootDeps = null;
}
```

- [ ] **Step 2: Wire into root layout**

In `app/_layout.tsx` add:

```tsx
useEffect(() => {
  if (session?.user?.id) void bootSyncForUser(session.user.id);
  else stopSyncForUser();
}, [session?.user?.id]);
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(sync): boot sync engine on sign-in"
```

---

## Phase 5 — Manual entry MVP

### Task 5.1: Tabs scaffolding

**Files:**
- Create: `app/(tabs)/_layout.tsx`, `app/(tabs)/index.tsx`, `app/(tabs)/transactions.tsx`, `app/(tabs)/add.tsx`, `app/(tabs)/budgets.tsx`, `app/(tabs)/more.tsx`

- [ ] **Step 1: Tabs layout**

`app/(tabs)/_layout.tsx`:

```tsx
import { Tabs } from 'expo-router';
import { Text } from 'react-native';

function Icon({ label }: { label: string }) {
  return <Text style={{ fontSize: 18 }}>{label}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: () => <Icon label="🏠" /> }} />
      <Tabs.Screen name="transactions" options={{ title: 'Transactions', tabBarIcon: () => <Icon label="📒" /> }} />
      <Tabs.Screen name="add" options={{ title: 'Add', tabBarIcon: () => <Icon label="➕" /> }} />
      <Tabs.Screen name="budgets" options={{ title: 'Budgets', tabBarIcon: () => <Icon label="🎯" /> }} />
      <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: () => <Icon label="⋯" /> }} />
    </Tabs>
  );
}
```

- [ ] **Step 2: Stub each tab**

`app/(tabs)/index.tsx`, `transactions.tsx`, `budgets.tsx`, `more.tsx` — each a placeholder:

```tsx
import { Text, View } from 'react-native';
export default function Screen() {
  return <View style={{ flex: 1, padding: 20 }}><Text>Stub</Text></View>;
}
```

`app/(tabs)/add.tsx` opens the quick-add modal (filled in next task):

```tsx
import { useEffect } from 'react';
import { router } from 'expo-router';
export default function AddTab() {
  useEffect(() => { router.replace('/txn/new'); }, []);
  return null;
}
```

- [ ] **Step 3: Move root index out of the way**

Replace `app/index.tsx` with a redirect to the tabs:

```tsx
import { Redirect } from 'expo-router';
export default function Index() {
  return <Redirect href="/(tabs)" />;
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(app): tabs scaffolding"
```

---

### Task 5.2: Quick-add modal + full add form

**Files:**
- Create: `app/txn/new.tsx`, `app/txn/[id].tsx`, `src/ui/Sheet.tsx`, `src/ui/Chip.tsx`, `src/store/recents.ts`

- [ ] **Step 1: Sheet + Chip**

`src/ui/Sheet.tsx`:

```tsx
import type { ReactNode } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';

export function Sheet({ title, children }: { title: string; children: ReactNode }) {
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        <Text style={{ fontSize: 22, fontWeight: '700', marginBottom: 16 }}>{title}</Text>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
```

`src/ui/Chip.tsx`:

```tsx
import { Pressable, Text } from 'react-native';

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
        borderWidth: 1, borderColor: selected ? '#111827' : '#D1D5DB',
        backgroundColor: selected ? '#111827' : 'white',
        marginRight: 8, marginBottom: 8,
      }}>
      <Text style={{ color: selected ? 'white' : '#111827', fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}
```

- [ ] **Step 2: Recents store (last-used currency / account / category)**

`src/store/recents.ts`:

```ts
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Currency } from '@/domain/types';

const KEY = 'recents_v1';

interface Recents {
  currency: Currency;
  accountId: string | null;
  categoryId: string | null;
  load: () => Promise<void>;
  set: (patch: Partial<Pick<Recents, 'currency' | 'accountId' | 'categoryId'>>) => Promise<void>;
}

export const useRecents = create<Recents>((set, get) => ({
  currency: 'LAK',
  accountId: null,
  categoryId: null,
  async load() {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return;
    set(JSON.parse(raw));
  },
  async set(patch) {
    set(patch);
    const next = get();
    await AsyncStorage.setItem(KEY, JSON.stringify({
      currency: next.currency, accountId: next.accountId, categoryId: next.categoryId,
    }));
  },
}));
```

- [ ] **Step 3: New transaction form**

`app/txn/new.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { router } from 'expo-router';
import { Sheet } from '@/ui/Sheet';
import { Field } from '@/ui/Field';
import { Chip } from '@/ui/Chip';
import { Button } from '@/ui/Button';
import { useAuth } from '@/store/auth';
import { useRecents } from '@/store/recents';
import { openDb } from '@/db/sqlite';
import { listAccounts } from '@/db/repos/accounts';
import { listCategories } from '@/db/repos/categories';
import { getRate } from '@/db/repos/fx_rates';
import { createTransaction } from '@/db/repos/transactions';
import { getProfile } from '@/db/repos/profiles';
import { toMicro } from '@/domain/money';
import type { Account, Category, Currency, TxnKind } from '@/domain/types';

export default function NewTxn() {
  const userId = useAuth((s) => s.user?.id)!;
  const recents = useRecents();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [base, setBase] = useState<Currency>('LAK');

  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>(recents.currency);
  const [accountId, setAccountId] = useState<string | null>(recents.accountId);
  const [categoryId, setCategoryId] = useState<string | null>(recents.categoryId);
  const [note, setNote] = useState('');
  const [merchant, setMerchant] = useState('');
  const [kind, setKind] = useState<TxnKind>('expense');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void recents.load();
    (async () => {
      const db = await openDb();
      const [a, c, p] = await Promise.all([
        listAccounts(db, userId), listCategories(db, userId), getProfile(db, userId),
      ]);
      setAccounts(a); setCategories(c);
      if (p) setBase(p.base_currency as Currency);
      if (!accountId && a[0]) setAccountId(a[0].id);
    })();
  }, [userId]);

  async function save() {
    if (!accountId) return;
    setSaving(true);
    const db = await openDb();
    const rate = await getRate(db, currency, base);
    const amt = toMicro(parseFloat(amount.replace(/,/g, '')) || 0);
    await createTransaction(db, {
      user_id: userId,
      account_id: accountId,
      category_id: kind === 'transfer' ? null : categoryId,
      kind,
      amount_micro: amt,
      currency,
      fx_rate_to_base: rate,
      occurred_at: new Date().toISOString(),
      merchant: merchant || null,
      note: note || null,
      source: 'manual',
    });
    await recents.set({ currency, accountId, categoryId });
    setSaving(false);
    router.back();
  }

  return (
    <Sheet title="Add transaction">
      <Text style={{ fontWeight: '600', marginBottom: 8 }}>Kind</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {(['expense','income'] as const).map((k) =>
          <Chip key={k} label={k} selected={kind === k} onPress={() => setKind(k)} />)}
      </View>

      <Field label="Amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />

      <Text style={{ fontWeight: '600', marginBottom: 8 }}>Currency</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {(['LAK','THB','USD'] as Currency[]).map((c) =>
          <Chip key={c} label={c} selected={currency === c} onPress={() => setCurrency(c)} />)}
      </View>

      <Text style={{ fontWeight: '600', marginBottom: 8 }}>Account</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {accounts.map((a) =>
          <Chip key={a.id} label={a.name} selected={accountId === a.id} onPress={() => setAccountId(a.id)} />)}
      </View>

      {kind !== 'transfer' && (
        <>
          <Text style={{ fontWeight: '600', marginBottom: 8 }}>Category</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {categories.filter((c) => c.kind === kind).map((c) =>
              <Chip key={c.id} label={c.name} selected={categoryId === c.id} onPress={() => setCategoryId(c.id)} />)}
          </View>
        </>
      )}

      <Field label="Merchant (optional)" value={merchant} onChangeText={setMerchant} />
      <Field label="Note (optional)" value={note} onChangeText={setNote} />

      <Button title="Save" onPress={save} loading={saving} />
    </Sheet>
  );
}
```

- [ ] **Step 4: Detail / edit screen**

`app/txn/[id].tsx`:

```tsx
import { useEffect, useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Sheet } from '@/ui/Sheet';
import { Button } from '@/ui/Button';
import { openDb } from '@/db/sqlite';
import { getTransaction, deleteTransaction } from '@/db/repos/transactions';
import { format } from '@/domain/money';
import type { Transaction } from '@/domain/types';

export default function TxnDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [txn, setTxn] = useState<Transaction | null>(null);

  useEffect(() => {
    (async () => {
      const db = await openDb();
      setTxn(await getTransaction(db, id!));
    })();
  }, [id]);

  async function remove() {
    Alert.alert('Delete?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          const db = await openDb();
          await deleteTransaction(db, id!);
          router.back();
        } },
    ]);
  }

  if (!txn) return null;
  return (
    <Sheet title="Transaction">
      <Text style={{ fontSize: 32, fontWeight: '700', marginBottom: 8 }}>
        {format(txn.amount_micro, txn.currency)}
      </Text>
      <Text style={{ color: '#6B7280', marginBottom: 16 }}>{new Date(txn.occurred_at).toLocaleString()}</Text>
      {txn.merchant && <Text>Merchant: {txn.merchant}</Text>}
      {txn.note && <Text>Note: {txn.note}</Text>}
      <View style={{ height: 24 }} />
      <Button title="Delete" variant="secondary" onPress={remove} />
    </Sheet>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(txn): quick-add and detail screens"
```

---

### Task 5.3: Transactions list

**Files:**
- Modify: `app/(tabs)/transactions.tsx`
- Create: `src/ui/TxnRow.tsx`

- [ ] **Step 1: TxnRow**

`src/ui/TxnRow.tsx`:

```tsx
import { Pressable, View, Text } from 'react-native';
import { router } from 'expo-router';
import { format } from '@/domain/money';
import type { Transaction } from '@/domain/types';

export function TxnRow({ txn, categoryName, accountName }: {
  txn: Transaction; categoryName?: string; accountName?: string;
}) {
  const sign = txn.kind === 'income' ? '+' : '-';
  const color = txn.kind === 'income' ? '#10B981' : '#111827';
  return (
    <Pressable
      onPress={() => router.push(`/txn/${txn.id}`)}
      style={{ paddingVertical: 14, borderBottomColor: '#F3F4F6', borderBottomWidth: 1, paddingHorizontal: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontWeight: '600' }}>{txn.merchant ?? categoryName ?? '—'}</Text>
        <Text style={{ color, fontWeight: '700' }}>{sign}{format(txn.amount_micro, txn.currency)}</Text>
      </View>
      <Text style={{ color: '#6B7280', fontSize: 12, marginTop: 4 }}>
        {accountName ?? ''} · {new Date(txn.occurred_at).toLocaleDateString()}
        {txn.source !== 'manual' && ` · ${txn.source}`}
      </Text>
    </Pressable>
  );
}
```

- [ ] **Step 2: Transactions screen**

`app/(tabs)/transactions.tsx`:

```tsx
import { useCallback, useEffect, useState } from 'react';
import { FlatList, View, Text, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { TxnRow } from '@/ui/TxnRow';
import { openDb } from '@/db/sqlite';
import { listTransactions } from '@/db/repos/transactions';
import { listAccounts } from '@/db/repos/accounts';
import { listCategories } from '@/db/repos/categories';
import { useAuth } from '@/store/auth';
import type { Account, Category, Transaction } from '@/domain/types';

export default function TransactionsTab() {
  const userId = useAuth((s) => s.user?.id)!;
  const [rows, setRows] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Map<string, Account>>(new Map());
  const [cats, setCats] = useState<Map<string, Category>>(new Map());
  const [refreshing, setRefreshing] = useState(false);

  const reload = useCallback(async () => {
    setRefreshing(true);
    const db = await openDb();
    const [t, a, c] = await Promise.all([
      listTransactions(db, { user_id: userId, limit: 200 }),
      listAccounts(db, userId),
      listCategories(db, userId),
    ]);
    setRows(t);
    setAccounts(new Map(a.map((x) => [x.id, x])));
    setCats(new Map(c.map((x) => [x.id, x])));
    setRefreshing(false);
  }, [userId]);

  useFocusEffect(useCallback(() => { void reload(); }, [reload]));
  useEffect(() => { void reload(); }, [reload]);

  return (
    <View style={{ flex: 1, paddingTop: 60 }}>
      <Text style={{ fontSize: 24, fontWeight: '700', paddingHorizontal: 16, marginBottom: 12 }}>Transactions</Text>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} />}
        renderItem={({ item }) =>
          <TxnRow
            txn={item}
            accountName={accounts.get(item.account_id)?.name}
            categoryName={item.category_id ? cats.get(item.category_id)?.name : undefined} />}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', color: '#9CA3AF', marginTop: 60 }}>No transactions yet</Text>}
      />
    </View>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(txn): transactions list"
```

---

### Task 5.4: Home dashboard skeleton

**Files:**
- Modify: `app/(tabs)/index.tsx`
- Create: `src/domain/reports.ts`, `__tests__/domain/reports.test.ts`

- [ ] **Step 1: Reports helper for "this month total"**

`src/domain/reports.ts`:

```ts
import type { SQLiteDatabase } from 'expo-sqlite';

export async function monthSpendBase(
  db: SQLiteDatabase, user_id: string, monthStart: Date,
): Promise<number> {
  const start = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1).toISOString();
  const end = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1).toISOString();
  const rows = await db.getAllAsync<{ s: number }>(
    `SELECT COALESCE(SUM(amount_base_micro), 0) AS s FROM transactions
     WHERE user_id = ? AND kind = 'expense'
       AND deleted_at IS NULL
       AND occurred_at >= ? AND occurred_at < ?`,
    [user_id, start, end],
  );
  return rows[0]?.s ?? 0;
}

export async function monthIncomeBase(
  db: SQLiteDatabase, user_id: string, monthStart: Date,
): Promise<number> {
  const start = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1).toISOString();
  const end = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1).toISOString();
  const rows = await db.getAllAsync<{ s: number }>(
    `SELECT COALESCE(SUM(amount_base_micro), 0) AS s FROM transactions
     WHERE user_id = ? AND kind = 'income'
       AND deleted_at IS NULL
       AND occurred_at >= ? AND occurred_at < ?`,
    [user_id, start, end],
  );
  return rows[0]?.s ?? 0;
}
```

- [ ] **Step 2: Test the totals**

`__tests__/domain/reports.test.ts`:

```ts
import * as SQLite from 'expo-sqlite';
import { runMigrations } from '@/db/migrations';
import { m001_init } from '@/db/migrations/001_init';
import { monthSpendBase } from '@/domain/reports';

async function freshDb() {
  const x = await SQLite.openDatabaseAsync(`r-${Math.random()}.db`);
  await runMigrations(x as any, [m001_init]);
  return x as any;
}

async function insertTxn(db: any, when: string, amount_base_micro: number) {
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO transactions (id, user_id, account_id, kind, amount_micro, currency,
       fx_rate_to_base, amount_base_micro, occurred_at, source, created_at, updated_at, sync_version)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1)`,
    [crypto.randomUUID(), 'u1', 'a1', 'expense', amount_base_micro, 'LAK',
     1, amount_base_micro, when, 'manual', now, now]);
}

describe('monthSpendBase', () => {
  it('sums only expenses in the month', async () => {
    const db = await freshDb();
    await insertTxn(db, '2026-05-03T00:00:00Z', 100_0000);
    await insertTxn(db, '2026-05-25T00:00:00Z', 50_0000);
    await insertTxn(db, '2026-04-30T00:00:00Z', 999_0000);
    const total = await monthSpendBase(db, 'u1', new Date('2026-05-01T00:00:00Z'));
    expect(total).toBe(150_0000);
  });
});
```

- [ ] **Step 3: Home dashboard**

`app/(tabs)/index.tsx`:

```tsx
import { useCallback, useState } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { openDb } from '@/db/sqlite';
import { monthIncomeBase, monthSpendBase } from '@/domain/reports';
import { listTransactions } from '@/db/repos/transactions';
import { getProfile } from '@/db/repos/profiles';
import { TxnRow } from '@/ui/TxnRow';
import { useAuth } from '@/store/auth';
import { format } from '@/domain/money';
import type { Currency, Transaction } from '@/domain/types';

export default function Home() {
  const userId = useAuth((s) => s.user?.id)!;
  const [base, setBase] = useState<Currency>('LAK');
  const [spend, setSpend] = useState(0);
  const [income, setIncome] = useState(0);
  const [recent, setRecent] = useState<Transaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const reload = useCallback(async () => {
    setRefreshing(true);
    const db = await openDb();
    const profile = await getProfile(db, userId);
    if (profile) setBase(profile.base_currency as Currency);
    const start = new Date();
    setSpend(await monthSpendBase(db, userId, start));
    setIncome(await monthIncomeBase(db, userId, start));
    setRecent(await listTransactions(db, { user_id: userId, limit: 5 }));
    setRefreshing(false);
  }, [userId]);

  useFocusEffect(useCallback(() => { void reload(); }, [reload]));

  return (
    <ScrollView
      contentContainerStyle={{ paddingTop: 60, paddingBottom: 60 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} />}
    >
      <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
        <Text style={{ fontSize: 14, color: '#6B7280' }}>This month</Text>
        <Text style={{ fontSize: 36, fontWeight: '700', marginTop: 4 }}>{format(spend, base)}</Text>
        <Text style={{ color: '#10B981', marginTop: 4 }}>+{format(income, base)} income</Text>
      </View>
      <Text style={{ paddingHorizontal: 16, fontWeight: '700', marginBottom: 8 }}>Recent</Text>
      {recent.map((t) => <TxnRow key={t.id} txn={t} />)}
    </ScrollView>
  );
}
```

- [ ] **Step 4: Run + commit**

```bash
npm test -- reports.test
git add -A
git commit -m "feat(home): dashboard with this-month spend, income, recents"
```

---

### Task 5.5: End-to-end verification (manual)

- [ ] **Step 1: Run on a real device**

```bash
npx expo prebuild --clean
npx expo run:android   # or run:ios
```

- [ ] **Step 2: Walkthrough**

1. Sign up with email; expect onboarding to start.
2. Pick LAK base, create "BCEL Savings" bank account.
3. Tap "+" to log a 50,000 LAK Food expense.
4. Open Transactions tab; row visible.
5. Pull-to-refresh on Home; this-month total updates.
6. Kill app, reopen; data persists.
7. Toggle airplane mode, log 10,000 LAK; row appears immediately.
8. Restore network; outbox drains (verify by inspecting Supabase dashboard table `transactions`).

- [ ] **Step 3: Tag MVP**

```bash
git tag mvp-manual
```

---

## Phase 6 — Multi-currency + FX

### Task 6.1: Edge Function — fx-rates-cron

**Files:**
- Create: `supabase/functions/fx-rates-cron/index.ts`, `supabase/functions/fx-rates-cron/deno.json`

- [ ] **Step 1: Function code**

`supabase/functions/fx-rates-cron/index.ts`:

```ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PAIRS = ['USD', 'LAK', 'THB'] as const;
type Curr = typeof PAIRS[number];

interface RatesResponse {
  rates: Record<string, number>;
  date: string;
}

async function fetchRates(): Promise<Map<string, number>> {
  const url = `https://api.exchangerate.host/latest?base=USD&symbols=LAK,THB,USD`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`fx api ${r.status}`);
  const j = (await r.json()) as RatesResponse;
  const m = new Map<string, number>();
  for (const c of PAIRS) m.set(c, j.rates[c] ?? (c === 'USD' ? 1 : 0));
  return m;
}

function crossRate(usdRates: Map<string, number>, from: Curr, to: Curr): number {
  if (from === to) return 1;
  const fu = usdRates.get(from) ?? 0;
  const tu = usdRates.get(to) ?? 0;
  if (!fu || !tu) return 0;
  return tu / fu;
}

Deno.serve(async () => {
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const sb = createClient(url, key);

  let usd: Map<string, number>;
  try { usd = await fetchRates(); }
  catch (e) {
    // Fallback: copy yesterday's rows.
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const { data } = await sb.from('fx_rates').select('*').eq('date', yesterday);
    if (!data || data.length === 0) return new Response(`fx unavailable: ${(e as Error).message}`, { status: 503 });
    const today = new Date().toISOString().slice(0, 10);
    const rows = data.map((r) => ({ ...r, date: today }));
    const { error } = await sb.from('fx_rates').upsert(rows, { onConflict: 'date,from_curr,to_curr' });
    if (error) return new Response(error.message, { status: 500 });
    return new Response('ok-fallback');
  }

  const today = new Date().toISOString().slice(0, 10);
  const rows: { date: string; from_curr: Curr; to_curr: Curr; rate: number }[] = [];
  for (const f of PAIRS) for (const t of PAIRS) {
    rows.push({ date: today, from_curr: f, to_curr: t, rate: crossRate(usd, f, t) });
  }
  const { error } = await sb.from('fx_rates').upsert(rows, { onConflict: 'date,from_curr,to_curr' });
  if (error) return new Response(error.message, { status: 500 });
  return new Response('ok');
});
```

`supabase/functions/fx-rates-cron/deno.json`:

```json
{ "imports": {} }
```

- [ ] **Step 2: Deploy**

```bash
npx supabase functions deploy fx-rates-cron --no-verify-jwt
```

- [ ] **Step 3: Schedule (pg_cron)**

Create `supabase/migrations/0015_cron_fx.sql`:

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule(
  'fx-rates-daily',
  '10 0 * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.settings.fx_fn_url'),
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'))
    );
  $$);
```

Engineer note: set `app.settings.fx_fn_url` and `app.settings.service_role_key` via the Supabase dashboard (Database → Settings → Custom config) so they aren't in source.

- [ ] **Step 4: Smoke-test the deployed function**

```bash
curl -X POST -H "Authorization: Bearer $SUPABASE_ANON" \
  https://<ref>.functions.supabase.co/fx-rates-cron
# expected: "ok"
```

Then in SQL editor:

```sql
SELECT * FROM fx_rates ORDER BY date DESC LIMIT 5;
```

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/fx-rates-cron supabase/migrations/0015_cron_fx.sql
git commit -m "feat(fx): edge function and pg_cron schedule for daily rates"
```

---

### Task 6.2: Settings → FX manual override

**Files:**
- Create: `app/settings/_layout.tsx`, `app/settings/fx.tsx`, `src/db/repos/fx_rates.ts` (extend with `setOverride`)

- [ ] **Step 1: Repo extension — `setOverride`**

Add to `src/db/repos/fx_rates.ts`:

```ts
export async function setOverride(
  db: SQLiteDatabase, date: string, from: Currency, to: Currency, rate: number,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO fx_rates (date, from_curr, to_curr, rate) VALUES (?,?,?,?)
     ON CONFLICT(date, from_curr, to_curr) DO UPDATE SET rate = excluded.rate`,
    [date, from, to, rate]);
}
```

Note: this overrides the local cache only; the next pull from the server will replace it. The intent is per-txn override — record `fx_rate_to_base` directly on the transaction in the add form (already supported by the schema).

- [ ] **Step 2: FX settings UI**

`app/settings/fx.tsx` — follows the same Sheet + Field pattern as Task 5.2. Lets the user view today's rates and manually override one. Use `getRate` + `setOverride`. Show a clear note: "Per-transaction overrides are set on the new-transaction screen; this page lets you override the day's cached rates locally."

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(settings): manual FX rate override UI"
```

---

## Phase 7 — Accounts + transfers

### Task 7.1: Account list with computed balances

**Files:**
- Create: `app/accounts/index.tsx`, `app/accounts/[id].tsx`, `app/accounts/new.tsx`, `src/domain/balances.ts`, `__tests__/domain/balances.test.ts`

- [ ] **Step 1: Balance helper**

`src/domain/balances.ts`:

```ts
import type { SQLiteDatabase } from 'expo-sqlite';

export interface AccountBalance {
  account_id: string;
  balance_micro: number;       // in account.currency
}

// Sums opening balance + income - expense + transfer-in - transfer-out per account.
// Transfers are represented as a pair of regular transactions (kind='transfer'),
// the source one negative on the from_account, destination positive on the to_account.
// We model that by storing transfer rows: from_txn has kind='transfer' & negative effect,
// to_txn has kind='transfer' & positive effect, distinguished by sign of amount_micro.
// The simpler model: from_txn has positive amount with kind='transfer' on the FROM account
// (treat as outflow), to_txn has positive amount with kind='transfer' on the TO account
// (treat as inflow). The transfers table tells us which is which.
export async function computeBalances(
  db: SQLiteDatabase, user_id: string,
): Promise<AccountBalance[]> {
  const rows = await db.getAllAsync<{
    id: string;
    opening_balance_micro: number;
    income: number;
    expense: number;
    transfer_in: number;
    transfer_out: number;
  }>(
    `SELECT
       a.id,
       a.opening_balance_micro,
       COALESCE(SUM(CASE WHEN t.kind = 'income' THEN t.amount_micro END), 0) AS income,
       COALESCE(SUM(CASE WHEN t.kind = 'expense' THEN t.amount_micro END), 0) AS expense,
       COALESCE(SUM(CASE WHEN t.kind = 'transfer'
                          AND t.id IN (SELECT to_txn_id FROM transfers
                                       WHERE user_id = ? AND deleted_at IS NULL)
                         THEN t.amount_micro END), 0) AS transfer_in,
       COALESCE(SUM(CASE WHEN t.kind = 'transfer'
                          AND t.id IN (SELECT from_txn_id FROM transfers
                                       WHERE user_id = ? AND deleted_at IS NULL)
                         THEN t.amount_micro END), 0) AS transfer_out
     FROM accounts a
     LEFT JOIN transactions t
       ON t.account_id = a.id AND t.user_id = a.user_id AND t.deleted_at IS NULL
     WHERE a.user_id = ? AND a.deleted_at IS NULL
     GROUP BY a.id, a.opening_balance_micro`,
    [user_id, user_id, user_id]);

  return rows.map((r) => ({
    account_id: r.id,
    balance_micro: r.opening_balance_micro + r.income - r.expense + r.transfer_in - r.transfer_out,
  }));
}
```

- [ ] **Step 2: Test balances with a transfer**

`__tests__/domain/balances.test.ts`:

```ts
import * as SQLite from 'expo-sqlite';
import { runMigrations } from '@/db/migrations';
import { m001_init } from '@/db/migrations/001_init';
import { computeBalances } from '@/domain/balances';

async function freshDb() {
  const x = await SQLite.openDatabaseAsync(`b-${Math.random()}.db`);
  await runMigrations(x as any, [m001_init]);
  return x as any;
}

async function insertAccount(db: any, id: string, opening = 0) {
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO accounts (id,user_id,name,type,currency,opening_balance_micro,archived,created_at,updated_at,sync_version)
     VALUES (?,'u1',?, 'cash','LAK',?,0,?,?,1)`,
    [id, id, opening, now, now]);
}

async function insertTxn(db: any, id: string, account_id: string, kind: string, amount_micro: number) {
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO transactions (id,user_id,account_id,kind,amount_micro,currency,
       fx_rate_to_base,amount_base_micro,occurred_at,source,created_at,updated_at,sync_version)
     VALUES (?,'u1',?,?,?,'LAK',1,?,?, 'manual',?,?,1)`,
    [id, account_id, kind, amount_micro, amount_micro, now, now, now]);
}

describe('computeBalances', () => {
  it('handles opening, income, expense, transfer', async () => {
    const db = await freshDb();
    await insertAccount(db, 'A', 100);
    await insertAccount(db, 'B', 0);
    await insertTxn(db, 't1', 'A', 'income', 50);
    await insertTxn(db, 't2', 'A', 'expense', 30);
    await insertTxn(db, 't3', 'A', 'transfer', 20); // out
    await insertTxn(db, 't4', 'B', 'transfer', 20); // in
    await db.runAsync(
      `INSERT INTO transfers (id,user_id,from_txn_id,to_txn_id,created_at,updated_at,sync_version)
       VALUES ('x','u1','t3','t4',?,?,1)`,
      [new Date().toISOString(), new Date().toISOString()]);
    const balances = await computeBalances(db, 'u1');
    const map = Object.fromEntries(balances.map((b) => [b.account_id, b.balance_micro]));
    expect(map['A']).toBe(100 + 50 - 30 - 20);
    expect(map['B']).toBe(20);
  });
});
```

- [ ] **Step 3: Account list / detail / new screens**

Use the established Sheet + Field + Button + Chip pattern from Phase 5. Keys:

- `accounts/index.tsx` lists accounts via `listAccounts`, joins with `computeBalances` to render each row's current balance using `format(balance, account.currency)`, shows totals strip on top.
- `accounts/new.tsx` is a form with Field for name, Chip group for `type` (cash/bank/credit_card/other), Chip group for `currency`, Field for opening balance.
- `accounts/[id].tsx` shows balance, recent transactions filtered by `account_id`, and Edit / Archive actions.

- [ ] **Step 4: Run + commit**

```bash
npm test -- balances.test
git add -A
git commit -m "feat(accounts): list, detail, new with computed balances"
```

---

### Task 7.2: Transfers (cross-account, cross-currency)

**Files:**
- Create: `app/transfer/new.tsx`, `src/domain/transfer.ts`, `__tests__/domain/transfer.test.ts`

- [ ] **Step 1: Transfer creator**

`src/domain/transfer.ts`:

```ts
import type { SQLiteDatabase } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { enqueueOutbox, nowIso } from '@/db/repos/base';
import { applyRate } from './money';
import type { Account, Currency } from './types';
import { getRate } from '@/db/repos/fx_rates';

export interface CreateTransferInput {
  user_id: string;
  from_account: Account;
  to_account: Account;
  from_amount_micro: number;
  fx_rate?: number;            // override; otherwise computed
  occurred_at: string;
  base_currency: Currency;
  note?: string;
}

export async function createTransfer(db: SQLiteDatabase, input: CreateTransferInput) {
  const transferId = Crypto.randomUUID();
  const fromTxnId = Crypto.randomUUID();
  const toTxnId = Crypto.randomUUID();
  const now = nowIso();

  let xrate = input.fx_rate;
  if (input.from_account.currency !== input.to_account.currency) {
    if (!xrate) xrate = await getRate(db, input.from_account.currency, input.to_account.currency);
  } else {
    xrate = 1;
  }
  const toAmount = applyRate(input.from_amount_micro, xrate);
  const fromBaseRate = await getRate(db, input.from_account.currency, input.base_currency);
  const toBaseRate = await getRate(db, input.to_account.currency, input.base_currency);

  await db.withTransactionAsync(async () => {
    const fromRow = {
      id: fromTxnId, user_id: input.user_id, account_id: input.from_account.id,
      category_id: null, kind: 'transfer',
      amount_micro: input.from_amount_micro, currency: input.from_account.currency,
      fx_rate_to_base: fromBaseRate, amount_base_micro: applyRate(input.from_amount_micro, fromBaseRate),
      occurred_at: input.occurred_at, merchant: null, note: input.note ?? null, receipt_url: null,
      source: 'manual', source_ref: null,
      created_at: now, updated_at: now, deleted_at: null, sync_version: 1,
    };
    const toRow = { ...fromRow,
      id: toTxnId, account_id: input.to_account.id,
      amount_micro: toAmount, currency: input.to_account.currency,
      fx_rate_to_base: toBaseRate, amount_base_micro: applyRate(toAmount, toBaseRate),
    };
    for (const r of [fromRow, toRow]) {
      await db.runAsync(
        `INSERT INTO transactions (id,user_id,account_id,category_id,kind,amount_micro,currency,
           fx_rate_to_base,amount_base_micro,occurred_at,merchant,note,receipt_url,source,source_ref,
           created_at,updated_at,sync_version)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`,
        [r.id, r.user_id, r.account_id, r.category_id, r.kind, r.amount_micro, r.currency,
          r.fx_rate_to_base, r.amount_base_micro, r.occurred_at, r.merchant, r.note, r.receipt_url,
          r.source, r.source_ref, r.created_at, r.updated_at]);
      await enqueueOutbox(db, 'insert', 'transactions', r.id, r);
    }
    const transferRow = {
      id: transferId, user_id: input.user_id,
      from_txn_id: fromTxnId, to_txn_id: toTxnId,
      fx_rate: xrate ?? null,
      created_at: now, updated_at: now, deleted_at: null, sync_version: 1,
    };
    await db.runAsync(
      `INSERT INTO transfers (id,user_id,from_txn_id,to_txn_id,fx_rate,created_at,updated_at,sync_version)
       VALUES (?,?,?,?,?,?,?,1)`,
      [transferRow.id, transferRow.user_id, transferRow.from_txn_id, transferRow.to_txn_id,
       transferRow.fx_rate, transferRow.created_at, transferRow.updated_at]);
    await enqueueOutbox(db, 'insert', 'transfers', transferId, transferRow);
  });

  return { transferId, fromTxnId, toTxnId, toAmount };
}
```

- [ ] **Step 2: Test cross-currency math**

`__tests__/domain/transfer.test.ts`:

```ts
import * as SQLite from 'expo-sqlite';
import { runMigrations } from '@/db/migrations';
import { m001_init } from '@/db/migrations/001_init';
import { createTransfer } from '@/domain/transfer';
import { toMicro } from '@/domain/money';

async function freshDb() {
  const x = await SQLite.openDatabaseAsync(`tr-${Math.random()}.db`);
  await runMigrations(x as any, [m001_init]);
  // seed two accounts
  const now = new Date().toISOString();
  await (x as any).runAsync(`INSERT INTO accounts (id,user_id,name,type,currency,opening_balance_micro,archived,created_at,updated_at,sync_version) VALUES ('A','u','A','cash','USD',0,0,?,?,1)`, [now, now]);
  await (x as any).runAsync(`INSERT INTO accounts (id,user_id,name,type,currency,opening_balance_micro,archived,created_at,updated_at,sync_version) VALUES ('B','u','B','cash','LAK',0,0,?,?,1)`, [now, now]);
  // seed today's USD->LAK rate
  await (x as any).runAsync(`INSERT INTO fx_rates (date, from_curr, to_curr, rate) VALUES (?, 'USD','LAK', 21000)`, [new Date().toISOString().slice(0,10)]);
  await (x as any).runAsync(`INSERT INTO fx_rates (date, from_curr, to_curr, rate) VALUES (?, 'USD','USD', 1)`, [new Date().toISOString().slice(0,10)]);
  await (x as any).runAsync(`INSERT INTO fx_rates (date, from_curr, to_curr, rate) VALUES (?, 'LAK','LAK', 1)`, [new Date().toISOString().slice(0,10)]);
  return x as any;
}

describe('createTransfer', () => {
  it('converts USD to LAK using stored rate', async () => {
    const db = await freshDb();
    const accs = await db.getAllAsync('SELECT * FROM accounts ORDER BY name');
    const r = await createTransfer(db, {
      user_id: 'u',
      from_account: accs[0],
      to_account: accs[1],
      from_amount_micro: toMicro(1),
      occurred_at: new Date().toISOString(),
      base_currency: 'LAK',
    });
    expect(r.toAmount).toBe(toMicro(21000));
  });
});
```

- [ ] **Step 3: Transfer screen**

`app/transfer/new.tsx` — form with two account chip groups (from/to), amount Field (in `from_account.currency`), preview of converted amount + rate, optional rate override Field, Save calls `createTransfer`.

- [ ] **Step 4: Run + commit**

```bash
npm test -- transfer.test
git add -A
git commit -m "feat(transfer): cross-currency transfers with paired transactions"
```

---

## Phase 8 — Categories + merchant rules

### Task 8.1: Category CRUD UI

**Files:**
- Create: `app/categories/index.tsx`, `app/categories/[id].tsx`, `app/categories/new.tsx`

- [ ] **Step 1: List view**

`app/categories/index.tsx` lists categories from `listCategories(db, userId)`, separated into "Expense" and "Income" sections by `kind`. Each row is a Pressable that routes to `/categories/[id]`. Floating "+" routes to `/categories/new`.

- [ ] **Step 2: New / edit forms**

`app/categories/new.tsx` and `app/categories/[id].tsx` use the same Sheet + Field + Chip pattern from Phase 5:

- Field: `name`
- Field: `icon` (free text — picker added later)
- Chip group: `kind` (`expense` | `income`)
- Field: `color` (hex, with a 12-swatch quick picker `['#F59E0B', '#3B82F6', ...]`)
- Edit screen: extra "Archive" button calling `updateCategory(db, id, { archived: true })`.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(categories): CRUD UI"
```

---

### Task 8.2: Merchant rules CRUD UI + auto-categorize hook

**Files:**
- Create: `app/settings/merchant-rules.tsx`, `app/settings/merchant-rules/[id].tsx`, `app/settings/merchant-rules/new.tsx`, `src/domain/auto_categorize.ts`, `__tests__/domain/auto_categorize.test.ts`

- [ ] **Step 1: Resolver**

`src/domain/auto_categorize.ts`:

```ts
import type { SQLiteDatabase } from 'expo-sqlite';

export interface AutoCatResult {
  category_id: string | null;
  account_id: string | null;
  rule_id: string | null;
  source: 'rule' | 'last_used' | 'none';
}

export async function resolveAutoCategory(
  db: SQLiteDatabase, user_id: string, merchant: string,
): Promise<AutoCatResult> {
  if (!merchant) return { category_id: null, account_id: null, rule_id: null, source: 'none' };

  const rules = await db.getAllAsync<{
    id: string; pattern: string; is_regex: number; category_id: string; account_id: string | null;
  }>(
    `SELECT id, pattern, is_regex, category_id, account_id FROM merchant_rules
     WHERE user_id = ? AND deleted_at IS NULL
     ORDER BY hit_count DESC, last_used_at DESC NULLS LAST`,
    [user_id]);
  for (const r of rules) {
    const hit = r.is_regex ? new RegExp(r.pattern, 'i').test(merchant)
                           : merchant.toLowerCase().includes(r.pattern.toLowerCase());
    if (hit) return { category_id: r.category_id, account_id: r.account_id, rule_id: r.id, source: 'rule' };
  }

  const last = await db.getAllAsync<{ category_id: string | null; account_id: string }>(
    `SELECT category_id, account_id FROM transactions
     WHERE user_id = ? AND deleted_at IS NULL AND merchant = ?
     ORDER BY occurred_at DESC LIMIT 1`,
    [user_id, merchant]);
  if (last[0]?.category_id) {
    return { category_id: last[0].category_id, account_id: last[0].account_id, rule_id: null, source: 'last_used' };
  }
  return { category_id: null, account_id: null, rule_id: null, source: 'none' };
}

export async function bumpRuleHit(db: SQLiteDatabase, rule_id: string): Promise<void> {
  await db.runAsync(
    `UPDATE merchant_rules
     SET hit_count = hit_count + 1, last_used_at = ?, updated_at = ?, sync_version = sync_version + 1
     WHERE id = ?`,
    [new Date().toISOString(), new Date().toISOString(), rule_id]);
}
```

- [ ] **Step 2: Tests**

`__tests__/domain/auto_categorize.test.ts` covers: regex match wins, substring fallback, last-used fallback, none.

- [ ] **Step 3: Settings → merchant rules screens**

Same Sheet/Field/Chip pattern. Form fields: `pattern`, `is_regex` (Chip toggle), `category_id` (Chip group from categories), `account_id` (optional Chip group).

- [ ] **Step 4: Commit**

```bash
npm test -- auto_categorize.test
git add -A
git commit -m "feat(merchant_rules): resolver and CRUD UI"
```

---

## Phase 9 — Reports + search/filter + export

### Task 9.1: Reports computations

**Files:**
- Create: `src/domain/reports/spend_by_category.ts`, `src/domain/reports/trend.ts`, `src/domain/reports/savings_rate.ts`, plus tests for each

- [ ] **Step 1: Spend-by-category**

`src/domain/reports/spend_by_category.ts`:

```ts
import type { SQLiteDatabase } from 'expo-sqlite';

export interface CategorySlice {
  category_id: string | null;
  category_name: string | null;
  amount_base_micro: number;
}

export async function spendByCategory(
  db: SQLiteDatabase, user_id: string, from: string, to: string,
): Promise<CategorySlice[]> {
  return db.getAllAsync<CategorySlice>(
    `SELECT c.id AS category_id, c.name AS category_name,
            COALESCE(SUM(t.amount_base_micro), 0) AS amount_base_micro
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.user_id = ? AND t.kind = 'expense' AND t.deleted_at IS NULL
       AND t.occurred_at >= ? AND t.occurred_at < ?
     GROUP BY c.id, c.name
     HAVING amount_base_micro > 0
     ORDER BY amount_base_micro DESC`,
    [user_id, from, to]);
}
```

- [ ] **Step 2: Monthly trend**

`src/domain/reports/trend.ts`:

```ts
import type { SQLiteDatabase } from 'expo-sqlite';

export interface MonthlyPoint {
  month: string;            // 'YYYY-MM'
  expense_base_micro: number;
  income_base_micro: number;
}

export async function monthlyTrend(
  db: SQLiteDatabase, user_id: string, monthsBack: number,
): Promise<MonthlyPoint[]> {
  return db.getAllAsync<MonthlyPoint>(
    `WITH RECURSIVE months(m) AS (
       SELECT strftime('%Y-%m', date('now', 'start of month'))
       UNION ALL
       SELECT strftime('%Y-%m', date(m || '-01', '-1 month'))
       FROM months
       WHERE m > strftime('%Y-%m', date('now', 'start of month', '-' || ? || ' months'))
     )
     SELECT
       m AS month,
       COALESCE(SUM(CASE WHEN kind = 'expense' THEN amount_base_micro END), 0) AS expense_base_micro,
       COALESCE(SUM(CASE WHEN kind = 'income' THEN amount_base_micro END), 0) AS income_base_micro
     FROM months
     LEFT JOIN transactions t
       ON strftime('%Y-%m', t.occurred_at) = m
       AND t.user_id = ? AND t.deleted_at IS NULL
     GROUP BY m
     ORDER BY m`,
    [monthsBack, user_id]);
}
```

- [ ] **Step 3: Savings rate**

`src/domain/reports/savings_rate.ts`:

```ts
import type { SQLiteDatabase } from 'expo-sqlite';

export async function savingsRate(
  db: SQLiteDatabase, user_id: string, from: string, to: string,
): Promise<{ income: number; expense: number; rate: number }> {
  const rows = await db.getAllAsync<{ income: number; expense: number }>(
    `SELECT
       COALESCE(SUM(CASE WHEN kind='income'  THEN amount_base_micro END), 0) AS income,
       COALESCE(SUM(CASE WHEN kind='expense' THEN amount_base_micro END), 0) AS expense
     FROM transactions
     WHERE user_id = ? AND deleted_at IS NULL
       AND occurred_at >= ? AND occurred_at < ?`,
    [user_id, from, to]);
  const r = rows[0] ?? { income: 0, expense: 0 };
  const rate = r.income === 0 ? 0 : (r.income - r.expense) / r.income;
  return { income: r.income, expense: r.expense, rate };
}
```

- [ ] **Step 4: Tests**

For each, follow the `monthSpendBase` test shape: insert fixture transactions across categories/months, assert returned aggregates.

- [ ] **Step 5: Commit**

```bash
npm test -- reports
git add -A
git commit -m "feat(reports): spend by category, monthly trend, savings rate"
```

---

### Task 9.2: Reports screens

**Files:**
- Create: `app/reports/index.tsx`, `app/reports/by-category.tsx`, `app/reports/trends.tsx`, `app/reports/savings-rate.tsx`, `src/ui/charts/Pie.tsx`, `src/ui/charts/Bars.tsx`

- [ ] **Step 1: Pie chart wrapper**

`src/ui/charts/Pie.tsx`:

```tsx
import { VictoryPie } from 'victory-native';
import { View } from 'react-native';

export function Pie({ data, height = 280 }: {
  data: { x: string; y: number; color?: string }[]; height?: number;
}) {
  return (
    <View style={{ height }}>
      <VictoryPie
        data={data}
        innerRadius={60}
        labelRadius={120}
        colorScale={data.map((d) => d.color ?? '#3B82F6')}
        style={{ labels: { fontSize: 11 } }} />
    </View>
  );
}
```

- [ ] **Step 2: Bars chart wrapper**

`src/ui/charts/Bars.tsx` — wraps `VictoryChart` + `VictoryBar` with sensible defaults; takes `data: { x: string; y: number }[]`.

- [ ] **Step 3: Reports index**

`app/reports/index.tsx` — dashboard with cards linking to each subreport, plus a hero showing this-month spend, savings rate %, and 3 most-recent monthly trend points as a sparkline.

- [ ] **Step 4: by-category, trends, savings-rate screens**

Each calls the matching domain function, renders Pie or Bars. Includes a "Period" Chip group: This month / Last month / Last 3 months / Last 6 months / Last 12 months / Custom (opens a date range picker — use a minimal Field-based picker for now; refine later).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(reports): dashboard, pie, trend, savings rate screens"
```

---

### Task 9.3: Search + filter

**Files:**
- Modify: `app/(tabs)/transactions.tsx`
- Create: `src/store/filters.ts`

- [ ] **Step 1: Filters store**

`src/store/filters.ts`:

```ts
import { create } from 'zustand';
import type { Currency, TxnKind, TxnSource } from '@/domain/types';

export interface TxnFilters {
  from?: string;
  to?: string;
  account_ids?: string[];
  category_ids?: string[];
  kind?: TxnKind;
  sources?: TxnSource[];
  currency?: Currency;
  amount_min_micro?: number;
  amount_max_micro?: number;
  search?: string;
}

interface State {
  filters: TxnFilters;
  set: (f: TxnFilters) => void;
  clear: () => void;
}

export const useFilters = create<State>((set) => ({
  filters: {},
  set: (filters) => set({ filters }),
  clear: () => set({ filters: {} }),
}));
```

- [ ] **Step 2: Extend `listTransactions`**

If not already there, ensure the transactions repo's `listTransactions` accepts the full `TxnFilters` shape and applies them via parameterised SQL (`occurred_at` range, `account_id IN (...)`, `category_id IN (...)`, `kind = ?`, `source IN (...)`, `currency = ?`, `amount_micro BETWEEN ? AND ?`, `(merchant LIKE ? OR note LIKE ?)`).

- [ ] **Step 3: Filter UI**

Add a "Filter" Pressable on the transactions tab header. Tapping opens a Sheet with Chip groups for accounts, categories, kind, sources, plus Fields for amount range and date range, plus a Search Field. "Apply" sets the store; "Clear" resets.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(transactions): full search and filter"
```

---

### Task 9.4: CSV export + JSON backup/restore

**Files:**
- Create: `src/domain/export.ts`, `__tests__/domain/export.test.ts`, `app/settings/data.tsx`

- [ ] **Step 1: CSV builder**

`src/domain/export.ts`:

```ts
import type { SQLiteDatabase } from 'expo-sqlite';
import type { TxnFilters } from '@/store/filters';
import { listTransactions } from '@/db/repos/transactions';
import { fromMicro } from './money';

function csvEscape(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function exportTransactionsCsv(
  db: SQLiteDatabase, user_id: string, filters: TxnFilters,
): Promise<string> {
  const rows = await listTransactions(db, { user_id, ...filters, limit: 100_000 });
  const header = ['id','occurred_at','kind','account_id','category_id','amount','currency','amount_base','merchant','note','source'];
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push([
      r.id, r.occurred_at, r.kind, r.account_id, r.category_id ?? '',
      String(fromMicro(r.amount_micro)), r.currency,
      String(fromMicro(r.amount_base_micro)),
      csvEscape(r.merchant ?? ''), csvEscape(r.note ?? ''), r.source,
    ].join(','));
  }
  return lines.join('\n');
}

export async function exportAllJson(db: SQLiteDatabase, user_id: string): Promise<string> {
  const tables = ['profiles','accounts','categories','transactions','transfers',
    'budgets','merchant_rules','notif_parse_rules','recurring_rules','push_tokens'];
  const out: Record<string, unknown[]> = {};
  for (const t of tables) {
    out[t] = await db.getAllAsync(`SELECT * FROM ${t} WHERE user_id = ?`, [user_id]);
  }
  return JSON.stringify({ version: 1, exported_at: new Date().toISOString(), data: out }, null, 2);
}

export async function restoreJson(db: SQLiteDatabase, user_id: string, json: string): Promise<void> {
  const parsed = JSON.parse(json) as { version: number; data: Record<string, any[]> };
  if (parsed.version !== 1) throw new Error('unsupported backup version');
  await db.withTransactionAsync(async () => {
    for (const [t, rows] of Object.entries(parsed.data)) {
      await db.runAsync(`DELETE FROM ${t} WHERE user_id = ?`, [user_id]);
      for (const r of rows) {
        const keys = Object.keys(r);
        const placeholders = keys.map(() => '?').join(',');
        await db.runAsync(
          `INSERT INTO ${t} (${keys.join(',')}) VALUES (${placeholders})`,
          keys.map((k) => normalize(r[k])));
        // Outbox enqueue so server gets the restored data.
        await db.runAsync(
          `INSERT INTO outbox (op,table_name,row_id,payload,enqueued_at) VALUES ('insert',?,?,?,?)`,
          [t, r.id ?? '', JSON.stringify(r), new Date().toISOString()]);
      }
    }
  });
}

function normalize(v: unknown): unknown {
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v && typeof v === 'object') return JSON.stringify(v);
  return v as never;
}
```

- [ ] **Step 2: Test CSV escaping and JSON round-trip**

`__tests__/domain/export.test.ts` should cover: a transaction with quotes in note → properly escaped; a JSON round-trip restore that re-inserts and re-enqueues outbox.

- [ ] **Step 3: Settings → Data screen**

`app/settings/data.tsx`:

```tsx
import { useState } from 'react';
import { Text, View, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Sheet } from '@/ui/Sheet';
import { Button } from '@/ui/Button';
import { openDb } from '@/db/sqlite';
import { useAuth } from '@/store/auth';
import { useFilters } from '@/store/filters';
import { exportTransactionsCsv, exportAllJson, restoreJson } from '@/domain/export';

export default function Data() {
  const userId = useAuth((s) => s.user?.id)!;
  const filters = useFilters((s) => s.filters);
  const [busy, setBusy] = useState(false);

  async function exportCsv() {
    setBusy(true);
    const db = await openDb();
    const csv = await exportTransactionsCsv(db, userId, filters);
    const path = FileSystem.cacheDirectory + 'transactions.csv';
    await FileSystem.writeAsStringAsync(path, csv);
    await Sharing.shareAsync(path);
    setBusy(false);
  }

  async function exportJson() {
    setBusy(true);
    const db = await openDb();
    const json = await exportAllJson(db, userId);
    const path = FileSystem.cacheDirectory + 'backup.json';
    await FileSystem.writeAsStringAsync(path, json);
    await Sharing.shareAsync(path);
    setBusy(false);
  }

  async function restore() {
    const pick = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
    if (pick.canceled) return;
    Alert.alert('Restore?', 'This wipes local data and replaces it from the file. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Restore', style: 'destructive', onPress: async () => {
          setBusy(true);
          const json = await FileSystem.readAsStringAsync(pick.assets[0].uri);
          const db = await openDb();
          await restoreJson(db, userId, json);
          setBusy(false);
          Alert.alert('Done', 'Restore complete.');
        } },
    ]);
  }

  return (
    <Sheet title="Data">
      <Text style={{ marginBottom: 16, color: '#4B5563' }}>
        CSV uses your current filters. JSON backup includes everything for this account.
      </Text>
      <Button title="Export filtered CSV" onPress={exportCsv} loading={busy} />
      <View style={{ height: 12 }} />
      <Button title="JSON backup" variant="secondary" onPress={exportJson} loading={busy} />
      <View style={{ height: 12 }} />
      <Button title="Restore from JSON" variant="secondary" onPress={restore} loading={busy} />
    </Sheet>
  );
}
```

- [ ] **Step 4: Run + commit**

```bash
npm test -- export.test
git add -A
git commit -m "feat(data): CSV export, JSON backup, restore"
```

---

## Phase 10 — Budgets

### Task 10.1: Budgets list + edit + threshold rendering

**Files:**
- Create: `app/(tabs)/budgets.tsx` (replace stub), `app/budgets/[id].tsx`, `app/budgets/new.tsx`, `src/domain/budgets.ts`, `__tests__/domain/budgets.test.ts`

- [ ] **Step 1: Budget computation**

`src/domain/budgets.ts`:

```ts
import type { SQLiteDatabase } from 'expo-sqlite';
import { spendByCategory } from './reports/spend_by_category';

export interface BudgetStatus {
  budget_id: string;
  category_id: string;
  category_name: string;
  limit_micro: number;
  spend_micro: number;
  pct: number;        // 0..1+
  threshold: 0 | 80 | 100;
}

export async function monthBudgetStatuses(
  db: SQLiteDatabase, user_id: string, monthStart: Date,
): Promise<BudgetStatus[]> {
  const monthKey = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1)
    .toISOString().slice(0, 10);
  const from = monthKey;
  const to = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1)
    .toISOString().slice(0, 10);

  const budgets = await db.getAllAsync<{
    id: string; category_id: string; limit_amount_micro: number;
  }>(
    `SELECT id, category_id, limit_amount_micro FROM budgets
     WHERE user_id = ? AND month = ? AND deleted_at IS NULL`,
    [user_id, monthKey]);

  const slices = await spendByCategory(db, user_id, from, to);
  const sliceByCat = new Map(slices.map((s) => [s.category_id, s.amount_base_micro]));

  const cats = await db.getAllAsync<{ id: string; name: string }>(
    `SELECT id, name FROM categories WHERE user_id = ? AND deleted_at IS NULL`, [user_id]);
  const nameByCat = new Map(cats.map((c) => [c.id, c.name]));

  return budgets.map((b) => {
    const spend = sliceByCat.get(b.category_id) ?? 0;
    const pct = spend / b.limit_amount_micro;
    const threshold = pct >= 1 ? 100 : pct >= 0.8 ? 80 : 0;
    return {
      budget_id: b.id,
      category_id: b.category_id,
      category_name: nameByCat.get(b.category_id) ?? '?',
      limit_micro: b.limit_amount_micro,
      spend_micro: spend,
      pct,
      threshold: threshold as 0 | 80 | 100,
    };
  });
}
```

- [ ] **Step 2: Tests**

Insert categories, budgets, transactions, assert thresholds at 0/80/100% boundaries.

- [ ] **Step 3: Budgets tab**

`app/(tabs)/budgets.tsx`: lists `monthBudgetStatuses` for the current month, each row a colored bar:

- 0–79%: green
- 80–99%: amber
- ≥100%: red

Plus a "+" floating button → `/budgets/new`.

`app/budgets/new.tsx` and `app/budgets/[id].tsx`: form with category Chip, currency Chip, amount Field. Saves via `upsertBudget`.

- [ ] **Step 4: Commit**

```bash
npm test -- budgets.test
git add -A
git commit -m "feat(budgets): list, edit, status with thresholds"
```

---

## Phase 11 — Recurring

### Task 11.1: Cadence calculator

**Files:**
- Create: `src/domain/cadence.ts`, `__tests__/domain/cadence.test.ts`

- [ ] **Step 1: Implementation**

`src/domain/cadence.ts`:

```ts
export type Cadence = string;
// Supported forms:
//   'monthly_day_<1..31>'   — same day of month, clamped to last day if needed
//   'weekly_dow_<0..6>'     — 0=Sun ... 6=Sat
//   'every_n_days_<1..366>' — fixed interval
//   'cron:<expr>'           — escape hatch (5-field cron)

export function nextRunAfter(cadence: Cadence, after: Date): Date {
  if (cadence.startsWith('monthly_day_')) {
    const day = clampDay(parseInt(cadence.slice('monthly_day_'.length), 10), after);
    let d = new Date(after.getFullYear(), after.getMonth(), day, after.getHours(), after.getMinutes());
    if (d <= after) d = new Date(after.getFullYear(), after.getMonth() + 1, day);
    // re-clamp for shorter next month
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(parseInt(cadence.slice('monthly_day_'.length), 10), lastDay));
    return d;
  }
  if (cadence.startsWith('weekly_dow_')) {
    const dow = parseInt(cadence.slice('weekly_dow_'.length), 10);
    const d = new Date(after);
    do { d.setDate(d.getDate() + 1); } while (d.getDay() !== dow);
    return d;
  }
  if (cadence.startsWith('every_n_days_')) {
    const n = parseInt(cadence.slice('every_n_days_'.length), 10);
    const d = new Date(after);
    d.setDate(d.getDate() + n);
    return d;
  }
  if (cadence.startsWith('cron:')) {
    throw new Error('cron parsing not implemented client-side; use a runner');
  }
  throw new Error(`unknown cadence: ${cadence}`);
}

function clampDay(day: number, ref: Date): number {
  const lastDay = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();
  return Math.min(day, lastDay);
}
```

- [ ] **Step 2: Tests**

`__tests__/domain/cadence.test.ts`:

```ts
import { nextRunAfter } from '@/domain/cadence';

describe('cadence', () => {
  it('monthly clamps to last day in February', () => {
    const after = new Date('2026-01-31T00:00:00Z');
    const next = nextRunAfter('monthly_day_31', after);
    expect(next.getMonth()).toBe(1);                  // February (0-indexed)
    expect(next.getDate()).toBe(28);                  // 2026 is not leap
  });
  it('weekly hops to the next matching DOW', () => {
    const after = new Date('2026-05-07T00:00:00Z');   // Thursday=4
    const next = nextRunAfter('weekly_dow_1', after); // Monday
    expect(next.getDay()).toBe(1);
    expect(next.getTime()).toBeGreaterThan(after.getTime());
  });
  it('every_n_days adds n', () => {
    const after = new Date('2026-05-07T00:00:00Z');
    const next = nextRunAfter('every_n_days_3', after);
    expect(next.getDate()).toBe(10);
  });
});
```

- [ ] **Step 3: Run + commit**

```bash
npm test -- cadence.test
git add -A
git commit -m "feat(domain): cadence calculator"
```

---

### Task 11.2: Edge Function — recurring-engine-cron

**Files:**
- Create: `supabase/functions/recurring-engine-cron/index.ts`, `supabase/migrations/0016_cron_recurring.sql`

- [ ] **Step 1: Function**

`supabase/functions/recurring-engine-cron/index.ts`:

```ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function nextRunAfter(cadence: string, after: Date): Date {
  // Mirror of client cadence.ts. Keep logic in sync; tests on client side.
  if (cadence.startsWith('monthly_day_')) {
    const day = parseInt(cadence.slice('monthly_day_'.length), 10);
    let d = new Date(after.getUTCFullYear(), after.getUTCMonth(), day);
    if (d <= after) d = new Date(after.getUTCFullYear(), after.getUTCMonth() + 1, day);
    const last = new Date(d.getUTCFullYear(), d.getUTCMonth() + 1, 0).getUTCDate();
    d.setUTCDate(Math.min(day, last));
    return d;
  }
  if (cadence.startsWith('weekly_dow_')) {
    const dow = parseInt(cadence.slice('weekly_dow_'.length), 10);
    const d = new Date(after);
    do { d.setUTCDate(d.getUTCDate() + 1); } while (d.getUTCDay() !== dow);
    return d;
  }
  if (cadence.startsWith('every_n_days_')) {
    const n = parseInt(cadence.slice('every_n_days_'.length), 10);
    const d = new Date(after);
    d.setUTCDate(d.getUTCDate() + n);
    return d;
  }
  throw new Error(`unsupported cadence: ${cadence}`);
}

Deno.serve(async () => {
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const now = new Date();
  const nowIso = now.toISOString();

  const { data: rules, error } = await sb.from('recurring_rules')
    .select('*')
    .eq('enabled', true)
    .lte('next_run_at', nowIso)
    .is('deleted_at', null);
  if (error) return new Response(error.message, { status: 500 });

  let processed = 0;
  for (const r of rules ?? []) {
    if (r.end_date && new Date(r.end_date) < now) continue;
    const tpl = r.template_txn as Record<string, unknown>;

    if (r.mode === 'auto') {
      // Snapshot today's FX rate.
      const today = nowIso.slice(0, 10);
      const fromCurr = String(tpl.currency);
      // Fetch profile base currency
      const { data: profile } = await sb.from('profiles').select('base_currency').eq('id', r.user_id).single();
      const baseCurr = profile?.base_currency ?? 'LAK';
      const { data: rateRow } = await sb.from('fx_rates').select('rate')
        .eq('date', today).eq('from_curr', fromCurr).eq('to_curr', baseCurr).maybeSingle();
      const rate = rateRow?.rate ?? 1;
      const amount = Number(tpl.amount);
      const txn = {
        user_id: r.user_id,
        account_id: tpl.account_id,
        category_id: tpl.category_id ?? null,
        kind: tpl.kind,
        amount,
        currency: tpl.currency,
        fx_rate_to_base: rate,
        amount_base: amount * rate,
        occurred_at: nowIso,
        merchant: tpl.merchant ?? null,
        note: tpl.note ?? null,
        source: 'recurring',
        source_ref: `recurring:${r.id}:${nowIso}`,
        sync_version: 1,
      };
      const ins = await sb.from('transactions').insert(txn);
      if (ins.error) continue;
    } else {
      // confirm mode: enqueue push, advance next_run_at only after a separate confirm RPC
      const lastNotified = r.last_notified_at ? new Date(r.last_notified_at) : null;
      const cooldown = lastNotified && (now.getTime() - lastNotified.getTime()) < 12 * 3600 * 1000;
      if (!cooldown) {
        await sb.from('push_queue').insert({
          user_id: r.user_id,
          type: 'recurring_confirm',
          payload: { recurring_rule_id: r.id, name: r.name },
        });
        await sb.from('recurring_rules').update({
          last_notified_at: nowIso,
          sync_version: r.sync_version + 1,
        }).eq('id', r.id);
      }
      continue;
    }

    const nextRun = nextRunAfter(r.cadence, now);
    await sb.from('recurring_rules').update({
      next_run_at: nextRun.toISOString(),
      sync_version: r.sync_version + 1,
    }).eq('id', r.id);
    processed++;
  }
  return new Response(JSON.stringify({ processed }), { headers: { 'content-type': 'application/json' } });
});
```

- [ ] **Step 2: Confirm RPC**

`supabase/migrations/0016_cron_recurring.sql`:

```sql
CREATE OR REPLACE FUNCTION confirm_recurring(rule_id uuid) RETURNS uuid AS $$
DECLARE
  r recurring_rules%ROWTYPE;
  txn_id uuid := gen_random_uuid();
  tpl jsonb;
  base text;
  rate numeric;
BEGIN
  SELECT * INTO r FROM recurring_rules WHERE id = rule_id AND user_id = auth.uid();
  IF NOT FOUND OR r.mode <> 'confirm' THEN RAISE EXCEPTION 'not_found_or_wrong_mode'; END IF;
  tpl := r.template_txn;
  SELECT base_currency INTO base FROM profiles WHERE id = auth.uid();
  SELECT fx.rate INTO rate FROM fx_rates fx
    WHERE fx.date = current_date
      AND fx.from_curr = tpl->>'currency'
      AND fx.to_curr = base
    LIMIT 1;
  rate := COALESCE(rate, 1);
  INSERT INTO transactions (id, user_id, account_id, category_id, kind, amount, currency,
    fx_rate_to_base, amount_base, occurred_at, merchant, note, source, source_ref)
  VALUES (
    txn_id, auth.uid(),
    (tpl->>'account_id')::uuid,
    NULLIF(tpl->>'category_id','')::uuid,
    tpl->>'kind',
    (tpl->>'amount')::numeric,
    tpl->>'currency',
    rate,
    (tpl->>'amount')::numeric * rate,
    now(),
    NULLIF(tpl->>'merchant',''),
    NULLIF(tpl->>'note',''),
    'recurring',
    'recurring:' || r.id::text || ':' || to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SSZ')
  );
  -- Advance next_run_at: client passes back the new value via update; or we do here by adding 1 month default.
  -- A simpler: advance by 31 days; client's editor lets the user fix cadence if needed.
  UPDATE recurring_rules SET next_run_at = next_run_at + interval '31 days',
    sync_version = sync_version + 1 WHERE id = rule_id;
  RETURN txn_id;
END $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Schedule the recurring engine hourly.
SELECT cron.schedule(
  'recurring-engine-hourly',
  '5 * * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.settings.recurring_fn_url'),
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'Authorization','Bearer ' || current_setting('app.settings.service_role_key')));
  $$);
```

> Engineer note: the `confirm_recurring` RPC's "advance by 31 days" is a deliberate simplification because cron parsing in Postgres is heavy. For `monthly_day_N` rules this is fine; for weekly/every_n_days the client-side editor in Task 11.3 lets the user explicitly set the next run.

- [ ] **Step 3: Deploy + commit**

```bash
npx supabase functions deploy recurring-engine-cron --no-verify-jwt
npx supabase db reset
git add -A
git commit -m "feat(recurring): edge function and confirm RPC"
```

---

### Task 11.3: Recurring rules UI + confirm flow

**Files:**
- Create: `app/recurring/index.tsx`, `app/recurring/[id].tsx`, `app/recurring/new.tsx`, `src/ui/RecurringConfirmCard.tsx`

- [ ] **Step 1: List + new + edit**

Standard Sheet/Field/Chip pattern. Form fields:

- Field: `name`
- Chip group: `kind` (expense/income)
- Chip group: `account`, `category`, `currency`
- Field: `amount`
- Chip group: `cadence` quick options (Monthly day 1, Monthly day 15, Weekly Mon, Weekly Sun, Every 7 days, Every 30 days) — store as the `cadence` string. Advanced: free Field for power users.
- Chip group: `mode` (auto / confirm)
- Date picker: `next_run_at` (defaults to next occurrence per cadence)

- [ ] **Step 2: Pending confirm cards on home**

`src/ui/RecurringConfirmCard.tsx` — one card per rule that has `last_notified_at > now - 24h` and no `transaction.source_ref = 'recurring:<id>:<this-window>'` yet. Render: "Confirm: Gym membership, 30 USD" + Confirm/Skip buttons. Confirm calls `sb.rpc('confirm_recurring', { rule_id })`.

Add a section in `app/(tabs)/index.tsx` that lists pending confirm cards above "Recent".

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(recurring): UI and confirm flow"
```

---

## Phase 12 — Notifications

### Task 12.1: Local notifications

**Files:**
- Create: `src/lib/local_notifs.ts`, `__tests__/lib/local_notifs.test.ts`

- [ ] **Step 1: Helper**

`src/lib/local_notifs.ts`:

```ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, shouldPlaySound: false, shouldSetBadge: false,
    shouldShowBanner: true, shouldShowList: true,
  }),
});

export async function ensureNotifPermission(): Promise<boolean> {
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return !!req.granted;
}

export async function scheduleDailyNudge(hour = 20, minute = 0): Promise<string> {
  const ok = await ensureNotifPermission();
  if (!ok) throw new Error('notification permission denied');
  await Notifications.cancelScheduledNotificationAsync('daily-nudge').catch(() => {});
  const id = await Notifications.scheduleNotificationAsync({
    identifier: 'daily-nudge',
    content: { title: 'Log today\'s spend', body: 'Tap to add a transaction' },
    trigger: { hour, minute, repeats: true, channelId: Platform.OS === 'android' ? 'reminders' : undefined },
  });
  return id;
}

export async function cancelDailyNudge(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync('daily-nudge').catch(() => {});
}

export async function fireBudgetAlert(args: {
  category_name: string; threshold: 80 | 100; spend: string; limit: string;
}): Promise<void> {
  const ok = await ensureNotifPermission();
  if (!ok) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: args.threshold === 100 ? `${args.category_name} budget exceeded` : `${args.category_name} 80%`,
      body: `${args.spend} of ${args.limit}`,
    },
    trigger: null,
  });
}
```

- [ ] **Step 2: Tests**

`__tests__/lib/local_notifs.test.ts` — mock `expo-notifications` and assert `scheduleDailyNudge` calls `scheduleNotificationAsync` with the expected `trigger`.

- [ ] **Step 3: Wire into Settings**

Add a Settings → Notifications screen with a Switch for the daily nudge that calls `scheduleDailyNudge` / `cancelDailyNudge`. Persist preference in AsyncStorage.

- [ ] **Step 4: Trigger on local threshold crossing**

In `src/sync/index.ts`'s `cycle`, after `pullAll` returns, recompute current-month budget statuses; for any budget where `last_alert_threshold` increased compared to what we last saw locally, call `fireBudgetAlert`.

```ts
import { monthBudgetStatuses } from '@/domain/budgets';
import { fireBudgetAlert } from '@/lib/local_notifs';
import { format } from '@/domain/money';

let lastSeenAlerts = new Map<string, number>();

async function checkBudgetCrossings(deps: SyncDeps) {
  const statuses = await monthBudgetStatuses(deps.db, deps.userId, new Date());
  for (const s of statuses) {
    const prev = lastSeenAlerts.get(s.budget_id) ?? 0;
    if (s.threshold > prev && s.threshold > 0) {
      await fireBudgetAlert({
        category_name: s.category_name,
        threshold: s.threshold as 80 | 100,
        spend: format(s.spend_micro, 'LAK'),
        limit: format(s.limit_micro, 'LAK'),
      });
    }
    lastSeenAlerts.set(s.budget_id, s.threshold);
  }
}
```

Call `checkBudgetCrossings(deps)` at the end of `cycle`.

- [ ] **Step 5: Commit**

```bash
npm test -- local_notifs.test
git add -A
git commit -m "feat(notifs): local daily nudge and budget threshold alerts"
```

---

### Task 12.2: Push token registration

**Files:**
- Create: `src/lib/push_token.ts`

- [ ] **Step 1: Implementation**

`src/lib/push_token.ts`:

```ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { getSupabase } from './supabase';

export async function registerPushToken(userId: string): Promise<void> {
  if (!Device.isDevice) return;          // simulator skip
  const cur = await Notifications.getPermissionsAsync();
  let granted = cur.granted;
  if (!granted) granted = (await Notifications.requestPermissionsAsync()).granted;
  if (!granted) return;
  const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID; // populated by EAS build
  const tok = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  await getSupabase().from('push_tokens').upsert({
    user_id: userId,
    expo_token: tok.data,
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    last_seen_at: new Date().toISOString(),
    sync_version: 1,
  }, { onConflict: 'user_id,expo_token' });
}
```

```bash
npm install expo-device
```

- [ ] **Step 2: Wire into bootSyncForUser**

After `await startSync(...)` in `src/sync/bootstrap.ts`:

```ts
import { registerPushToken } from '@/lib/push_token';
void registerPushToken(userId);
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(push): register Expo push token on sign-in"
```

---

### Task 12.3: Edge Function — push-notif-fanout

**Files:**
- Create: `supabase/functions/push-notif-fanout/index.ts`, `supabase/migrations/0017_cron_push.sql`

- [ ] **Step 1: Function**

`supabase/functions/push-notif-fanout/index.ts`:

```ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface QueueRow {
  id: number;
  user_id: string;
  type: string;
  payload: Record<string, unknown>;
}

function buildMessage(row: QueueRow): { title: string; body: string } {
  switch (row.type) {
    case 'budget_threshold': {
      const t = (row.payload.threshold as number) ?? 0;
      const spend = row.payload.spend_base; const limit = row.payload.limit_base;
      return { title: t === 100 ? 'Budget exceeded' : 'Budget 80%', body: `${spend} of ${limit}` };
    }
    case 'recurring_confirm':
      return { title: 'Confirm recurring', body: String(row.payload.name ?? '') };
    default:
      return { title: 'Update', body: '' };
  }
}

Deno.serve(async () => {
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: pending } = await sb.from('push_queue').select('*')
    .is('sent_at', null).lt('attempts', 5).order('created_at').limit(100);

  let sent = 0;
  for (const row of (pending ?? []) as QueueRow[]) {
    const { data: tokens } = await sb.from('push_tokens').select('expo_token')
      .eq('user_id', row.user_id).is('deleted_at', null);
    const msg = buildMessage(row);
    const messages = (tokens ?? []).map((t) => ({
      to: t.expo_token, sound: 'default', title: msg.title, body: msg.body,
      data: { type: row.type, ...row.payload },
    }));
    if (messages.length === 0) {
      await sb.from('push_queue').update({ sent_at: new Date().toISOString() }).eq('id', row.id);
      continue;
    }
    const r = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(messages),
    });
    if (r.ok) {
      await sb.from('push_queue').update({ sent_at: new Date().toISOString() }).eq('id', row.id);
      sent++;
    } else {
      const err = await r.text();
      await sb.from('push_queue').update({
        attempts: (row as any).attempts + 1, last_error: err.slice(0, 500),
      }).eq('id', row.id);
    }
  }
  return new Response(JSON.stringify({ sent }), { headers: { 'content-type': 'application/json' } });
});
```

- [ ] **Step 2: Schedule**

`supabase/migrations/0017_cron_push.sql`:

```sql
SELECT cron.schedule(
  'push-fanout-1m',
  '* * * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.settings.push_fn_url'),
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'Authorization','Bearer ' || current_setting('app.settings.service_role_key')));
  $$);
```

- [ ] **Step 3: Deploy + commit**

```bash
npx supabase functions deploy push-notif-fanout --no-verify-jwt
npx supabase db reset
git add -A
git commit -m "feat(push): edge function fanout with 1-minute pg_cron"
```

---

## Phase 13 — Receipts

### Task 13.1: Photo capture + compression + upload

**Files:**
- Create: `src/lib/receipts.ts`, `__tests__/lib/receipts.test.ts`, `app/txn/[id]/attach-receipt.tsx`

- [ ] **Step 1: Receipts helper**

`src/lib/receipts.ts`:

```ts
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { getSupabase } from './supabase';

const TARGET_WIDTH = 1280;
const TARGET_QUALITY = 0.6;
const MAX_BYTES = 200 * 1024;

export interface PickedReceipt {
  localUri: string;
  bytes: number;
}

export async function pickAndCompress(): Promise<PickedReceipt | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  const camPerm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted && !camPerm.granted) return null;
  const r = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 1,
    exif: false,
  });
  if (r.canceled || !r.assets[0]) return null;
  return compress(r.assets[0].uri);
}

export async function takePhotoAndCompress(): Promise<PickedReceipt | null> {
  const camPerm = await ImagePicker.requestCameraPermissionsAsync();
  if (!camPerm.granted) return null;
  const r = await ImagePicker.launchCameraAsync({ quality: 1, exif: false });
  if (r.canceled || !r.assets[0]) return null;
  return compress(r.assets[0].uri);
}

async function compress(uri: string): Promise<PickedReceipt> {
  let quality = TARGET_QUALITY;
  let result = await ImageManipulator.manipulateAsync(
    uri, [{ resize: { width: TARGET_WIDTH } }],
    { compress: quality, format: ImageManipulator.SaveFormat.JPEG });
  let info = await FileSystem.getInfoAsync(result.uri);
  while ((info.exists && (info as any).size > MAX_BYTES) && quality > 0.2) {
    quality -= 0.1;
    result = await ImageManipulator.manipulateAsync(
      uri, [{ resize: { width: TARGET_WIDTH } }],
      { compress: quality, format: ImageManipulator.SaveFormat.JPEG });
    info = await FileSystem.getInfoAsync(result.uri);
  }
  return { localUri: result.uri, bytes: info.exists ? (info as any).size ?? 0 : 0 };
}

export async function uploadReceipt(args: {
  user_id: string; txn_id: string; localUri: string;
}): Promise<string> {
  const path = `${args.user_id}/${args.txn_id}/${Date.now()}.jpg`;
  const data = await FileSystem.readAsStringAsync(args.localUri, { encoding: FileSystem.EncodingType.Base64 });
  const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
  const sb = getSupabase();
  const { error } = await sb.storage.from('receipts').upload(path, bytes, {
    contentType: 'image/jpeg', upsert: false,
  });
  if (error) throw error;
  return path;       // store as receipt_url; resolve via signed URL when displaying
}

export async function signedReceiptUrl(path: string, ttlSeconds = 600): Promise<string | null> {
  const sb = getSupabase();
  const { data, error } = await sb.storage.from('receipts').createSignedUrl(path, ttlSeconds);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
```

- [ ] **Step 2: Tests**

`__tests__/lib/receipts.test.ts` mocks `expo-image-manipulator` + `expo-file-system` to verify the resize-then-recompress loop hits the size budget.

- [ ] **Step 3: Attach screen**

`app/txn/[id]/attach-receipt.tsx` — Sheet with two buttons: "Take photo" / "Pick from library". On result, call `uploadReceipt`, then update the transaction:

```ts
import { updateTransaction } from '@/db/repos/transactions';
await updateTransaction(db, txn.id, { receipt_url: path });
```

- [ ] **Step 4: Detail viewer**

Update `app/txn/[id].tsx` to call `signedReceiptUrl(txn.receipt_url)` when present and render via `<Image source={{ uri }} />` inside a Pressable that opens fullscreen.

- [ ] **Step 5: Commit**

```bash
npm test -- receipts.test
git add -A
git commit -m "feat(receipts): pick, compress, upload, view"
```

---

## Phase 14 — BCELOne notif capture (Android)

### Task 14.1: Expo Module skeleton

**Files:**
- Create: `modules/notif-listener/expo-module.config.json`, `modules/notif-listener/android/build.gradle`, `modules/notif-listener/android/src/main/AndroidManifest.xml`, `modules/notif-listener/android/src/main/java/expo/modules/notiflistener/NotifListenerModule.kt`, `modules/notif-listener/android/src/main/java/expo/modules/notiflistener/AppNotificationListenerService.kt`, `modules/notif-listener/index.ts`, `modules/notif-listener/package.json`

- [ ] **Step 1: Generate scaffolding**

```bash
npx create-expo-module@latest --local notif-listener
```

When prompted: name `notif-listener`, slug `notif-listener`, description "BCELOne notification capture", platforms: Android only.

- [ ] **Step 2: AndroidManifest**

`modules/notif-listener/android/src/main/AndroidManifest.xml`:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
  <application>
    <service
      android:name=".AppNotificationListenerService"
      android:label="Personal Expenses notif listener"
      android:permission="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE"
      android:exported="true">
      <intent-filter>
        <action android:name="android.service.notification.NotificationListenerService" />
      </intent-filter>
    </service>
  </application>
</manifest>
```

- [ ] **Step 3: Listener service**

`modules/notif-listener/android/src/main/java/expo/modules/notiflistener/AppNotificationListenerService.kt`:

```kotlin
package expo.modules.notiflistener

import android.app.Notification
import android.content.Intent
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import org.json.JSONObject

class AppNotificationListenerService : NotificationListenerService() {

  override fun onNotificationPosted(sbn: StatusBarNotification) {
    try {
      val pkg = sbn.packageName ?: return
      val extras = sbn.notification.extras
      val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString().orEmpty()
      val text = (extras.getCharSequence(Notification.EXTRA_BIG_TEXT)
        ?: extras.getCharSequence(Notification.EXTRA_TEXT))?.toString().orEmpty()
      val payload = JSONObject().apply {
        put("package", pkg)
        put("title", title)
        put("text", text)
        put("postedAt", sbn.postTime)
        put("key", sbn.key)
      }
      val i = Intent("expo.modules.notiflistener.NOTIFICATION").apply {
        setPackage(applicationContext.packageName)
        putExtra("payload", payload.toString())
      }
      sendBroadcast(i)
    } catch (_: Throwable) { /* swallow; never crash the listener */ }
  }

  override fun onListenerConnected() { sendActiveBroadcast(true) }
  override fun onListenerDisconnected() { sendActiveBroadcast(false) }

  private fun sendActiveBroadcast(active: Boolean) {
    val i = Intent("expo.modules.notiflistener.STATE").apply {
      setPackage(applicationContext.packageName)
      putExtra("active", active)
    }
    sendBroadcast(i)
  }
}
```

- [ ] **Step 4: JS bridge module**

`modules/notif-listener/android/src/main/java/expo/modules/notiflistener/NotifListenerModule.kt`:

```kotlin
package expo.modules.notiflistener

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class NotifListenerModule : Module() {

  private var receiver: BroadcastReceiver? = null

  override fun definition() = ModuleDefinition {
    Name("NotifListener")
    Events("onNotification", "onState")

    Function("isPermissionGranted") {
      val ctx = appContext.reactContext ?: return@Function false
      val flat = Settings.Secure.getString(ctx.contentResolver, "enabled_notification_listeners")
      flat?.contains(ctx.packageName) == true
    }

    Function("openSettings") {
      val ctx = appContext.reactContext ?: return@Function
      val i = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
      i.flags = Intent.FLAG_ACTIVITY_NEW_TASK
      ctx.startActivity(i)
    }

    OnStartObserving {
      val ctx = appContext.reactContext ?: return@OnStartObserving
      val r = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
          when (intent.action) {
            "expo.modules.notiflistener.NOTIFICATION" ->
              sendEvent("onNotification", mapOf("payload" to (intent.getStringExtra("payload") ?: "")))
            "expo.modules.notiflistener.STATE" ->
              sendEvent("onState", mapOf("active" to intent.getBooleanExtra("active", false)))
          }
        }
      }
      val f = IntentFilter().apply {
        addAction("expo.modules.notiflistener.NOTIFICATION")
        addAction("expo.modules.notiflistener.STATE")
      }
      ctx.registerReceiver(r, f, Context.RECEIVER_NOT_EXPORTED)
      receiver = r
    }

    OnStopObserving {
      val ctx = appContext.reactContext ?: return@OnStopObserving
      receiver?.let { ctx.unregisterReceiver(it) }
      receiver = null
    }
  }
}
```

- [ ] **Step 5: TS surface**

`modules/notif-listener/index.ts`:

```ts
import { EventEmitter, requireNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

interface NotifPayload {
  package: string;
  title: string;
  text: string;
  postedAt: number;
  key: string;
}

const native = Platform.OS === 'android' ? requireNativeModule('NotifListener') : null;
const emitter = native ? new EventEmitter(native as any) : null;

export function isPermissionGranted(): boolean {
  return Platform.OS === 'android' ? !!native?.isPermissionGranted() : false;
}

export function openSettings(): void {
  if (Platform.OS === 'android') native?.openSettings();
}

export function addNotifListener(fn: (p: NotifPayload) => void): () => void {
  if (!emitter) return () => {};
  const sub = emitter.addListener('onNotification', (e: { payload: string }) => {
    try { fn(JSON.parse(e.payload) as NotifPayload); } catch { /* ignore malformed */ }
  });
  return () => sub.remove();
}

export function addStateListener(fn: (active: boolean) => void): () => void {
  if (!emitter) return () => {};
  const sub = emitter.addListener('onState', (e: { active: boolean }) => fn(e.active));
  return () => sub.remove();
}
```

- [ ] **Step 6: Wire module into the host app**

Add `notif-listener` to `app.config.ts` `expo.plugins` or use auto-linking via `npx expo prebuild`. Verify with:

```bash
npx expo prebuild --clean
npx expo run:android
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(native): notif-listener Expo Module skeleton (Android)"
```

---

### Task 14.2: Notif parser + auto-categorize integration

**Files:**
- Create: `src/domain/notif_parser.ts`, `__tests__/domain/notif_parser.test.ts`, `src/domain/notif_pipeline.ts`

- [ ] **Step 1: Parser**

`src/domain/notif_parser.ts`:

```ts
import type { Currency } from './types';

export interface ParseRule {
  id: string;
  app_package: string;
  regex: string;
  field_map: Record<string, string>;     // {amount:'$1', currency:'$2', merchant:'$3'}
  priority: number;
  default_account_id: string | null;
}

export interface ParseInput {
  package: string;
  title: string;
  text: string;
}

export interface ParseResult {
  rule_id: string;
  amount_micro: number;
  currency: Currency;
  merchant: string | null;
}

import { toMicro } from './money';

export function parseNotif(input: ParseInput, rules: ParseRule[]): ParseResult | null {
  const candidates = rules
    .filter((r) => r.app_package === input.package)
    .sort((a, b) => b.priority - a.priority);
  for (const r of candidates) {
    const m = new RegExp(r.regex, 'i').exec(`${input.title}\n${input.text}`);
    if (!m) continue;
    const amountStr = expand(r.field_map.amount, m);
    const currencyStr = expand(r.field_map.currency, m).toUpperCase();
    const merchantStr = expand(r.field_map.merchant ?? '', m).trim();
    if (!amountStr) continue;
    const amount = parseFloat(amountStr.replace(/,/g, ''));
    if (!isFinite(amount)) continue;
    const currency = (['LAK','THB','USD'].includes(currencyStr) ? currencyStr : 'LAK') as Currency;
    return {
      rule_id: r.id,
      amount_micro: toMicro(amount),
      currency,
      merchant: merchantStr || null,
    };
  }
  return null;
}

function expand(template: string, m: RegExpExecArray): string {
  return template.replace(/\$(\d+)/g, (_, idx) => m[Number(idx)] ?? '');
}
```

- [ ] **Step 2: Tests**

`__tests__/domain/notif_parser.test.ts`:

```ts
import { parseNotif, type ParseRule } from '@/domain/notif_parser';
import { fromMicro } from '@/domain/money';

const rule: ParseRule = {
  id: 'r1',
  app_package: 'la.bcel.bcelone',
  regex: 'Debit\\s+([\\d,\\.]+)\\s+(LAK|THB|USD)\\s+at\\s+(.+)',
  field_map: { amount: '$1', currency: '$2', merchant: '$3' },
  priority: 100,
  default_account_id: null,
};

describe('parseNotif', () => {
  it('matches a BCEL-style debit', () => {
    const r = parseNotif({
      package: 'la.bcel.bcelone',
      title: 'BCELOne',
      text: 'Debit 150,000 LAK at Joma Bakery',
    }, [rule]);
    expect(r).toBeTruthy();
    expect(fromMicro(r!.amount_micro)).toBe(150000);
    expect(r!.currency).toBe('LAK');
    expect(r!.merchant).toBe('Joma Bakery');
  });

  it('returns null when no rule matches', () => {
    const r = parseNotif({ package: 'x', title: '', text: '' }, [rule]);
    expect(r).toBeNull();
  });
});
```

- [ ] **Step 3: Pipeline**

`src/domain/notif_pipeline.ts`:

```ts
import type { SQLiteDatabase } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { parseNotif, type ParseRule } from './notif_parser';
import { resolveAutoCategory, bumpRuleHit } from './auto_categorize';
import { createTransaction } from '@/db/repos/transactions';
import { getRate } from '@/db/repos/fx_rates';
import { getProfile } from '@/db/repos/profiles';
import { nowIso } from '@/db/repos/base';
import type { NotifPayload } from '@/native/types';

export async function processNotif(
  db: SQLiteDatabase, user_id: string, payload: NotifPayload,
): Promise<{ created: boolean; txn_id?: string; reason?: string }> {
  // dedup
  const dup = await db.getAllAsync<{ key: string }>(
    `SELECT key FROM raw_notifs WHERE key = ?`, [payload.key]);
  if (dup.length) return { created: false, reason: 'dup' };

  await db.runAsync(
    `INSERT INTO raw_notifs (package, title, text, posted_at, key, processed)
     VALUES (?, ?, ?, ?, ?, 0)`,
    [payload.package, payload.title, payload.text,
     new Date(payload.postedAt).toISOString(), payload.key]);

  const ruleRows = await db.getAllAsync<ParseRule & { enabled: number }>(
    `SELECT id, app_package, regex, field_map, priority, default_account_id
     FROM notif_parse_rules
     WHERE user_id = ? AND enabled = 1 AND deleted_at IS NULL AND app_package = ?
     ORDER BY priority DESC`,
    [user_id, payload.package]);

  const rules = ruleRows.map((r) => ({
    ...r,
    field_map: typeof r.field_map === 'string' ? JSON.parse(r.field_map as unknown as string) : r.field_map,
  }));

  const parsed = parseNotif(payload, rules);
  const profile = await getProfile(db, user_id);
  const baseCurr = profile?.base_currency ?? 'LAK';

  if (!parsed) {
    return { created: false, reason: 'no_rule_match' };
  }

  // Resolve account
  const matchedRule = rules.find((r) => r.id === parsed.rule_id);
  let account_id = matchedRule?.default_account_id ?? null;
  if (!account_id) {
    const accs = await db.getAllAsync<{ id: string }>(
      `SELECT id FROM accounts WHERE user_id = ? AND archived = 0 AND deleted_at IS NULL ORDER BY created_at LIMIT 1`,
      [user_id]);
    account_id = accs[0]?.id ?? null;
  }
  if (!account_id) return { created: false, reason: 'no_account' };

  // Auto categorize
  const auto = parsed.merchant
    ? await resolveAutoCategory(db, user_id, parsed.merchant)
    : { category_id: null, account_id: null, rule_id: null, source: 'none' as const };

  // Dedup against manual entry near the same time / amount
  const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString();
  const fiveMinAhead = new Date(Date.now() + 5 * 60_000).toISOString();
  const collisions = await db.getAllAsync<{ id: string }>(
    `SELECT id FROM transactions
     WHERE user_id = ? AND account_id = ? AND amount_micro = ?
       AND occurred_at BETWEEN ? AND ? AND deleted_at IS NULL
     LIMIT 1`,
    [user_id, account_id, parsed.amount_micro, fiveMinAgo, fiveMinAhead]);
  if (collisions[0]) {
    await db.runAsync(
      `UPDATE raw_notifs SET processed = 1, parsed_txn_id = ? WHERE key = ?`,
      [collisions[0].id, payload.key]);
    return { created: false, reason: 'collision_with_manual' };
  }

  const rate = await getRate(db, parsed.currency, baseCurr);
  const txn = await createTransaction(db, {
    user_id,
    account_id,
    category_id: auto.category_id,
    kind: 'expense',
    amount_micro: parsed.amount_micro,
    currency: parsed.currency,
    fx_rate_to_base: rate,
    occurred_at: new Date(payload.postedAt).toISOString(),
    merchant: parsed.merchant,
    source: 'notif',
    source_ref: payload.key,
  });
  if (auto.rule_id) await bumpRuleHit(db, auto.rule_id);
  await db.runAsync(
    `UPDATE raw_notifs SET processed = 1, parsed_txn_id = ? WHERE key = ?`,
    [txn.id, payload.key]);
  void nowIso;
  return { created: true, txn_id: txn.id };
}
```

`src/native/types.ts`:

```ts
export interface NotifPayload {
  package: string;
  title: string;
  text: string;
  postedAt: number;
  key: string;
}
```

- [ ] **Step 4: Tests**

Pipeline test: insert a parse rule + an account; call `processNotif`; assert a transaction was created and `raw_notifs.processed = 1`. Also assert dedup against an existing manual transaction within 5 minutes returns `reason: 'collision_with_manual'`.

- [ ] **Step 5: Commit**

```bash
npm test -- notif_parser.test
git add -A
git commit -m "feat(notif): parser, dedup, pipeline"
```

---

### Task 14.3: Wire native listener to pipeline + undo

**Files:**
- Modify: `src/sync/bootstrap.ts`
- Create: `src/native/notif_bridge.ts`, `src/ui/UndoToast.tsx`

- [ ] **Step 1: Bridge**

`src/native/notif_bridge.ts`:

```ts
import { addNotifListener } from '../../modules/notif-listener';
import { openDb } from '@/db/sqlite';
import { processNotif } from '@/domain/notif_pipeline';
import { showUndoToast } from '@/ui/UndoToast';
import { deleteTransaction, getTransaction } from '@/db/repos/transactions';
import { format } from '@/domain/money';

let off: (() => void) | null = null;

export function startNotifBridge(userId: string): void {
  if (off) return;
  off = addNotifListener(async (payload) => {
    const db = await openDb();
    const r = await processNotif(db, userId, payload);
    if (r.created && r.txn_id) {
      const txn = await getTransaction(db, r.txn_id);
      if (txn) {
        showUndoToast({
          title: `Logged ${format(txn.amount_micro, txn.currency)}${txn.merchant ? ' at ' + txn.merchant : ''}`,
          actionLabel: 'Undo',
          ttlMs: 5000,
          onAction: async () => { await deleteTransaction(db, r.txn_id!); },
        });
      }
    } else if (r.reason === 'no_rule_match') {
      showUndoToast({
        title: 'New BCEL alert — tap to log',
        actionLabel: 'Open',
        ttlMs: 8000,
        onAction: () => { /* router.push('/txn/new') */ },
      });
    }
  });
}

export function stopNotifBridge(): void {
  if (off) { off(); off = null; }
}
```

- [ ] **Step 2: Undo toast**

`src/ui/UndoToast.tsx` — a simple imperative toast component mounted from a global ToastHost in `_layout.tsx`. Implementation: a zustand store of pending toasts, each with `ttlMs`, action button. `showUndoToast(opts)` pushes one; the host renders the latest. Use `Reanimated` for slide-in from bottom.

- [ ] **Step 3: Boot the bridge**

In `src/sync/bootstrap.ts`, after `void registerPushToken(userId)`:

```ts
import { startNotifBridge, stopNotifBridge } from '@/native/notif_bridge';
startNotifBridge(userId);
```

And in `stopSyncForUser`:

```ts
stopNotifBridge();
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(notif): bridge native events to pipeline with undo toast"
```

---

### Task 14.4: Notif rule editor + tester

**Files:**
- Create: `app/settings/notif-rules.tsx`, `app/settings/notif-rules/[id].tsx`, `app/settings/notif-rules/new.tsx`, `app/settings/notif-rules/test.tsx`

- [ ] **Step 1: List + new + edit**

Standard pattern. Form fields:

- Field: `app_package` (default `la.bcel.bcelone`)
- Field: `regex` (multiline)
- Three Fields for `field_map.amount`, `.currency`, `.merchant` (e.g. `$1`, `$2`, `$3`)
- Field: `priority` (numeric)
- Chip: `enabled`
- Chip group: `default_account_id`

- [ ] **Step 2: Tester**

`app/settings/notif-rules/test.tsx`:

- A multi-line Field for raw notif text.
- A button "Use most recent raw notif" that loads from `raw_notifs` (ring-buffered).
- Shows live extraction preview by running `parseNotif` against the current draft rule (or the saved rules list).
- Renders matched groups, computed amount, currency, merchant.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(settings): notif rule editor with live tester"
```

---

## Phase 15 — iOS share extension

### Task 15.1: Add share extension target

**Files:**
- Create: `ios/PersonalExpensesShare/Info.plist`, `ios/PersonalExpensesShare/ShareViewController.swift`, `ios/PersonalExpensesShare/MainInterface.storyboard`, `app.config.ts` (modify), `plugins/with-share-extension.js`

- [ ] **Step 1: Expo config plugin**

Direct Xcode-target wiring through an Expo plugin survives `prebuild --clean`.

`plugins/with-share-extension.js`:

```js
const { withXcodeProject, withInfoPlist } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const TARGET = 'PersonalExpensesShare';
const BUNDLE = 'la.personalexpenses.app.share';

module.exports = function withShareExtension(config) {
  config = withInfoPlist(config, (cfg) => {
    cfg.modResults.NSExtensionActivationRule = { NSExtensionActivationSupportsText: true };
    return cfg;
  });

  config = withXcodeProject(config, async (cfg) => {
    const project = cfg.modResults;
    const targetPath = path.join(cfg.modRequest.platformProjectRoot, TARGET);
    if (!fs.existsSync(targetPath)) fs.mkdirSync(targetPath, { recursive: true });

    // Copy template files (Info.plist, ShareViewController.swift, MainInterface.storyboard)
    // from `plugins/share-extension-template/` into `targetPath` (engineer note: keep templates in repo).
    const tpl = path.join(__dirname, 'share-extension-template');
    for (const f of ['Info.plist', 'ShareViewController.swift', 'MainInterface.storyboard']) {
      fs.copyFileSync(path.join(tpl, f), path.join(targetPath, f));
    }

    // Add target if missing.
    const existing = project.pbxTargetByName(TARGET);
    if (!existing) {
      project.addTarget(TARGET, 'app_extension', TARGET, BUNDLE);
      project.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources', project.findTargetKey(TARGET));
      project.addBuildPhase(['ShareViewController.swift'], 'PBXSourcesBuildPhase', 'Sources', project.findTargetKey(TARGET));
      project.addPbxGroup(['Info.plist', 'ShareViewController.swift', 'MainInterface.storyboard'], TARGET, TARGET);
    }
    return cfg;
  });

  return config;
};
```

Add to `app.config.ts`:

```ts
import withShareExtension from './plugins/with-share-extension';
export default {
  expo: {
    // ...existing
    plugins: [
      'expo-router', 'expo-sqlite', 'expo-notifications', 'expo-secure-store',
      withShareExtension,
    ],
  },
};
```

- [ ] **Step 2: ShareViewController.swift**

`plugins/share-extension-template/ShareViewController.swift`:

```swift
import UIKit
import Social
import MobileCoreServices

class ShareViewController: SLComposeServiceViewController {

  override func isContentValid() -> Bool { return true }

  override func didSelectPost() {
    guard let item = extensionContext?.inputItems.first as? NSExtensionItem,
          let attachment = item.attachments?.first else {
      complete()
      return
    }
    let typeText = "public.plain-text" as String

    if attachment.hasItemConformingToTypeIdentifier(typeText) {
      attachment.loadItem(forTypeIdentifier: typeText, options: nil) { [weak self] (data, _) in
        let text = (data as? String) ?? ""
        self?.openHostApp(text: text)
      }
    } else {
      complete()
    }
  }

  override func configurationItems() -> [Any]! { return [] }

  private func openHostApp(text: String) {
    let encoded = text.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
    let url = URL(string: "personalexpenses://share?text=\(encoded)")!
    var responder = self as UIResponder?
    while responder != nil {
      if let app = responder as? UIApplication {
        app.perform(NSSelectorFromString("openURL:"), with: url)
        break
      }
      responder = responder?.next
    }
    complete()
  }

  private func complete() {
    extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
  }
}
```

`plugins/share-extension-template/Info.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDisplayName</key><string>Personal Expenses</string>
  <key>CFBundleExecutable</key><string>$(EXECUTABLE_NAME)</string>
  <key>CFBundleIdentifier</key><string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
  <key>CFBundleName</key><string>$(PRODUCT_NAME)</string>
  <key>CFBundlePackageType</key><string>XPC!</string>
  <key>CFBundleShortVersionString</key><string>1.0</string>
  <key>CFBundleVersion</key><string>1</string>
  <key>NSExtension</key>
  <dict>
    <key>NSExtensionAttributes</key>
    <dict>
      <key>NSExtensionActivationRule</key>
      <dict>
        <key>NSExtensionActivationSupportsText</key><true/>
      </dict>
    </dict>
    <key>NSExtensionMainStoryboard</key><string>MainInterface</string>
    <key>NSExtensionPointIdentifier</key><string>com.apple.share-services</string>
  </dict>
</dict>
</plist>
```

`plugins/share-extension-template/MainInterface.storyboard` — generated by Xcode the first time; commit afterwards. Engineer note: open the iOS workspace once after `expo prebuild`, run the extension target to generate the storyboard, then commit.

- [ ] **Step 3: Handle the `personalexpenses://share` URL in the app**

`app/_layout.tsx` adds a `Linking` listener that, if the URL matches `personalexpenses://share?text=...`, calls `router.push({ pathname: '/txn/new', params: { prefill: text } })`.

`app/txn/new.tsx` reads `useLocalSearchParams<{ prefill?: string }>()` and pre-fills the `note` Field with `prefill`. Best-effort regex parse on `prefill` to extract amount + currency using the saved `notif_parse_rules` (call `parseNotif({ package: 'manual', title: '', text: prefill }, rules)` — the rule's `app_package` filter must allow this; for parser reuse, also configure a generic share-rule with `app_package = 'manual'`).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(ios): share extension routes text into prefilled add screen"
```

---

## Phase 16 — Polish, observability, ship

### Task 16.1: Sentry integration

**Files:**
- Modify: `app/_layout.tsx`, `app.config.ts`
- Create: `src/lib/observability.ts`

- [ ] **Step 1: Install + init**

```bash
npm install @sentry/react-native sentry-expo
```

`src/lib/observability.ts`:

```ts
import * as Sentry from '@sentry/react-native';
import { env } from './env';

let initialized = false;

export function initObservability(): void {
  if (initialized) return;
  if (!env.SENTRY_DSN) return;
  Sentry.init({
    dsn: env.SENTRY_DSN,
    enableAutoPerformanceTracing: true,
    sendDefaultPii: false,
    integrations: [Sentry.reactNativeTracingIntegration()],
  });
  initialized = true;
}

export const observability = { capture: Sentry.captureException, setUser: Sentry.setUser };
```

Call `initObservability()` from the top of `app/_layout.tsx`.

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "chore(observability): Sentry init"
```

---

### Task 16.2: Local log ring buffer

**Files:**
- Create: `src/lib/log.ts`, `app/settings/diagnostics.tsx`

- [ ] **Step 1: Ring buffer**

`src/lib/log.ts`:

```ts
const MAX = 1000;
const lines: string[] = [];

function fmt(level: string, args: unknown[]): string {
  return `[${new Date().toISOString()}] ${level} ${args.map(s).join(' ')}`;
}
function s(v: unknown): string {
  if (typeof v === 'string') return v;
  try { return JSON.stringify(v); } catch { return String(v); }
}

function push(level: 'info' | 'warn' | 'error', args: unknown[]) {
  lines.push(fmt(level, args));
  while (lines.length > MAX) lines.shift();
}

export const log = {
  info: (...a: unknown[]) => push('info', a),
  warn: (...a: unknown[]) => { push('warn', a); console.warn(...a); },
  error: (...a: unknown[]) => { push('error', a); console.error(...a); },
};

export function dumpLogs(): string {
  return lines.join('\n');
}
```

- [ ] **Step 2: Diagnostics screen**

`app/settings/diagnostics.tsx` — shows the last 100 lines, has buttons:

- "Copy logs" (clipboard)
- "Email logs" (uses `expo-mail-composer`)
- "Export logs to file" (FileSystem + Sharing)
- Stats: outbox count, last sync time per table.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(diagnostics): ring-buffered logs and diagnostics screen"
```

---

### Task 16.3: Settings hub + about

**Files:**
- Create: `app/(tabs)/more.tsx` (replace stub), `app/settings/index.tsx`, `app/settings/profile.tsx`, `app/settings/base-currency.tsx`, `app/settings/about.tsx`

- [ ] **Step 1: More tab**

`app/(tabs)/more.tsx` — a list linking to:

- Profile (`/settings/profile`)
- Base currency (`/settings/base-currency`)
- Categories (`/categories`)
- Accounts (`/accounts`)
- Recurring (`/recurring`)
- Merchant rules (`/settings/merchant-rules`)
- Notif rules (`/settings/notif-rules`)
- FX (`/settings/fx`)
- Data (`/settings/data`)
- Diagnostics (`/settings/diagnostics`)
- Notifications (`/settings/notifications`)
- About (`/settings/about`)
- Sign out

- [ ] **Step 2: Profile, base-currency, about**

Profile shows email + display name (Field, calls `updateProfile`). Base currency offers Chip group, persists via `setBaseCurrency`, prompts "this affects new transactions; existing rows keep their snapshot". About shows version, build, links to spec.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(settings): hub, profile, base currency, about"
```

---

### Task 16.4: E2E flows (Maestro)

**Files:**
- Create: `e2e/flows/01_signup_onboarding.yaml`, `e2e/flows/02_quick_add.yaml`, `e2e/flows/03_transfer.yaml`, `e2e/flows/04_offline_sync.yaml`, `e2e/flows/05_export_restore.yaml`, `e2e/run.sh`

- [ ] **Step 1: Install Maestro**

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
maestro --version
```

- [ ] **Step 2: First flow — signup + onboarding**

`e2e/flows/01_signup_onboarding.yaml`:

```yaml
appId: la.personalexpenses.app
---
- launchApp
- assertVisible: "Sign in"
- tapOn: "Create account"
- inputText: "e2e+${RANDOM}@example.com"
  # field by accessibilityLabel "Email"
  selector: "Email"
- tapOn: "Password"
- inputText: "Test1234!"
- tapOn: "Create account"
- assertVisible: "Welcome"
- tapOn: "Get started"
- tapOn: "LAK"
- tapOn: "Continue"
- assertVisible: "Your main account"
- tapOn: "Create account"
- assertVisible: "BCEL auto-capture"
```

- [ ] **Step 3: Quick add flow**

`e2e/flows/02_quick_add.yaml`:

```yaml
appId: la.personalexpenses.app
---
- launchApp
- tapOn: "Add"
- tapOn: "Amount"
- inputText: "50000"
- tapOn: "Save"
- assertVisible: "50,000 LAK"
```

- [ ] **Step 4: Other flows — sketch**

03_transfer: open Transfer → pick from/to → enter amount → save → assert balance change on both accounts.

04_offline_sync: toggle airplane mode (Maestro doesn't natively control radio; document the manual step in a comment), log a txn, restore network, assert presence in Supabase via a small CLI helper.

05_export_restore: open Settings → Data → Export JSON; restore; verify a known transaction count.

- [ ] **Step 5: Runner**

`e2e/run.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
for f in e2e/flows/*.yaml; do
  echo "==> $f"
  maestro test "$f"
done
```

```bash
chmod +x e2e/run.sh
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "test(e2e): Maestro flows for core paths"
```

---

### Task 16.5: App icons + splash + store prep

**Files:**
- Create: `assets/icon.png` (1024×1024), `assets/adaptive-icon.png` (1024×1024 foreground, 432×432 safe zone), `assets/splash.png`
- Modify: `app.config.ts`

- [ ] **Step 1: Drop in icon assets**

Engineer note: a designer or AI image generator produces these. Save under `assets/`. Update `app.config.ts`:

```ts
{
  expo: {
    icon: './assets/icon.png',
    splash: { image: './assets/splash.png', resizeMode: 'contain', backgroundColor: '#FFFFFF' },
    android: { adaptiveIcon: { foregroundImage: './assets/adaptive-icon.png', backgroundColor: '#FFFFFF' } },
  },
}
```

- [ ] **Step 2: Build with EAS**

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android --profile preview
eas build --platform ios --profile preview
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore(assets): icons, splash, EAS preview build configured"
```

---

### Task 16.6: Acceptance walkthrough against the spec

- [ ] **Step 1: Walk every acceptance criterion (spec §12)**

Use the spec's 15-item list. For each, run the matching scenario manually. Tick off in the spec PR description.

- [ ] **Step 2: Tag and ship**

```bash
git tag v1.0.0
git push --tags
```

- [ ] **Step 3: Cut release notes**

`docs/releases/v1.0.0.md` — one paragraph per phase with major user-visible features. Link to spec.

```bash
git add -A
git commit -m "docs: v1.0.0 release notes"
```

---

## Self-review

After writing this plan, the following spec items map to tasks:

- §2 Goals → Phases 4–14 (one phase per goal cluster).
- §3 Architecture → Phases 0–3 (bootstrap, schema, sync engine).
- §4 Stack → Phase 0.
- §5 Data model → Phase 1.
- §6 Sync engine → Phase 3.
- §7 BCELOne capture → Phase 14.
- §8 Screens → Phases 4–13 (each subtree built alongside the feature).
- §9 Edge Functions → Phases 6, 11, 12.
- §10 Cross-cutting → Phase 16 (Sentry, logs, security covered earlier in Phase 2).
- §11 Project layout → Phases 0, 14.
- §12 Acceptance → Phase 16 walkthrough.
- §13 Risks → mitigations folded into the relevant phases (battery opt onboarding, FX fallback in Edge Function, parser tester UI, image compression target).

**Known compressed sections:**
- Tasks 2.4 (extra repos), 5.1 stubs, 7.1 account screens, 8.1 category UI, 8.2 merchant rule UI, 9.2 reports screens UI, 10.1 budget edit UI, 11.3 recurring UI, 14.4 notif rule editor UI describe the screens by referring to established patterns from earlier tasks (Sheet, Field, Chip, Button, TxnRow, list-with-FAB) rather than re-inlining identical UI scaffolding. Each carries explicit field lists and behavioural deltas; the engineer cross-references the canonical task (5.2) for the UI shape.

**Placeholder scan:** No "TBD" or "TODO" left in the plan. Where the engineer must do something off-machine (Google Cloud OAuth client setup, Supabase pg_cron app.settings keys, Xcode storyboard generation, EAS build), the plan calls it out as an explicit engineer note.

**Type consistency:** repository function signatures (`createX`, `listX`, `updateX`, `deleteX`), domain types (`Currency`, `TxnKind`, `Account`, `Transaction`), and SQL columns are referenced consistently across phases.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-07-personal-expenses.md`. Two execution options:

1. **Subagent-Driven (recommended)** — fresh subagent per task, two-stage review between tasks, fast iteration.
2. **Inline Execution** — run tasks in this session via `superpowers:executing-plans`, batched with checkpoints.

Which approach?

