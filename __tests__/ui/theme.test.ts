import { typeStyles, color, aurora } from '@/ui/theme';

describe('theme', () => {
  it('uses Geist sans for hero numbers with tabular numerals', () => {
    expect(typeStyles.numHero.fontFamily).toBe('Geist');
    expect(typeStyles.numHero.fontVariant).toContain('tabular-nums');
  });
  it('does not use any serif family', () => {
    for (const [name, t] of Object.entries(typeStyles)) {
      if (name === 'mono') continue;
      expect(t.fontFamily).toBe('Geist');
    }
  });
  it('uses blush-cream background', () => {
    expect(color.bg.toUpperCase()).toBe('#FAF4F4');
  });
  it('aurora gradient runs pink -> lilac -> indigo -> deep', () => {
    expect(aurora.stops).toEqual(['#F4C7D6', '#D6CBF2', '#6F77E0', '#2B1F66']);
  });
});
