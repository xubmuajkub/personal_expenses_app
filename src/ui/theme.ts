export const color = {
  bg:            '#0F0A20',
  bgRaised:      '#1A1530',
  bgHero:        '#2B1F66',

  fg:            '#FFFFFF',
  fgQuiet:       'rgba(255,255,255,0.72)',
  muted:         'rgba(255,255,255,0.52)',
  disabled:      'rgba(255,255,255,0.28)',
  hairline:      'rgba(255,255,255,0.10)',

  glassSoft:     'rgba(255,255,255,0.06)',
  glassMed:      'rgba(255,255,255,0.10)',
  glassStrong:   'rgba(255,255,255,0.16)',
  glassBorder:   'rgba(255,255,255,0.18)',

  pulsePink:     '#ED93B3',
  pulseLilac:    '#B0A0E4',
  pulseIndigo:   '#6F77E0',
  pulseDeep:     '#2B1F66',

  success:       '#5DE0A4',
  danger:        '#FF7A6B',
  warning:       '#FFD66B',

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
