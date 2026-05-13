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
