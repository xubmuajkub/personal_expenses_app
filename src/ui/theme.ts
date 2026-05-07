export const color = {
  bg:            '#FAF4F4',
  fg:            '#15131C',
  muted:         '#6B6478',
  hairline:      '#EEE6E8',
  pink300:       '#F4C7D6',
  pink500:       '#ED93B3',
  lilac300:      '#D6CBF2',
  lilac500:      '#B0A0E4',
  indigo500:     '#6F77E0',
  indigo700:     '#3A37A8',
  blobDeep:      '#2B1F66',
  success:       '#2F8F5C',
  danger:        '#C7402E',
  surface:       'rgba(255,255,255,0.70)',
  surfaceQuiet:  'rgba(255,255,255,0.50)',
  onDarkFg:      '#FFFFFF',
} as const;

export const radius = { sm: 8, md: 14, lg: 22, pill: 999 } as const;

export const space = (n: number): number => n * 4;

export const fonts = { sans: 'Geist' } as const;

export type TypeStyleName =
  | 'numHero' | 'display1' | 'display2' | 'display3'
  | 'bodyLg' | 'body' | 'caption' | 'mono';

export const typeStyles: Record<TypeStyleName, {
  fontFamily: string; fontSize: number; lineHeight: number; fontWeight: '400' | '500' | '600' | '700';
  letterSpacing?: number; fontVariant?: ('tabular-nums')[]; textTransform?: 'uppercase';
}> = {
  numHero:  { fontFamily: fonts.sans, fontSize: 56, lineHeight: 60, fontWeight: '700', fontVariant: ['tabular-nums'] },
  display1: { fontFamily: fonts.sans, fontSize: 44, lineHeight: 48, fontWeight: '700', fontVariant: ['tabular-nums'] },
  display2: { fontFamily: fonts.sans, fontSize: 32, lineHeight: 36, fontWeight: '700' },
  display3: { fontFamily: fonts.sans, fontSize: 22, lineHeight: 28, fontWeight: '600' },
  bodyLg:   { fontFamily: fonts.sans, fontSize: 17, lineHeight: 24, fontWeight: '500' },
  body:     { fontFamily: fonts.sans, fontSize: 15, lineHeight: 22, fontWeight: '400' },
  caption:  { fontFamily: fonts.sans, fontSize: 12, lineHeight: 16, fontWeight: '500', letterSpacing: 0.6 },
  mono:     { fontFamily: 'Menlo',    fontSize: 16, lineHeight: 22, fontWeight: '400', fontVariant: ['tabular-nums'] },
};

export const shadow = {
  s1:   { shadowColor: '#141014', shadowOpacity: 0.04, shadowRadius: 2,  shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  s2:   { shadowColor: '#141014', shadowOpacity: 0.08, shadowRadius: 32, shadowOffset: { width: 0, height: 12 }, elevation: 4 },
  glow: { shadowColor: '#6F77E0', shadowOpacity: 0.20, shadowRadius: 80, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
} as const;

export const aurora = {
  stops: [color.pink300, color.lilac300, color.indigo500, color.blobDeep] as const,
  locations: [0, 0.35, 0.7, 1] as const,
};
