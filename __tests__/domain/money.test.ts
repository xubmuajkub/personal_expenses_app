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
