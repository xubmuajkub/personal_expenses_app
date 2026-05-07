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
