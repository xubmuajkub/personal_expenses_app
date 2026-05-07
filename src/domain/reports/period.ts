export type PeriodKey =
  | 'this_month'
  | 'last_month'
  | 'last_3'
  | 'last_6'
  | 'last_12'
  | 'custom';

export interface DateRange {
  from: string;
  to: string;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function periodToRange(period: PeriodKey, custom?: DateRange): DateRange {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  switch (period) {
    case 'this_month':
      return {
        from: isoDate(new Date(y, m, 1)),
        to: isoDate(new Date(y, m + 1, 0)),
      };
    case 'last_month':
      return {
        from: isoDate(new Date(y, m - 1, 1)),
        to: isoDate(new Date(y, m, 0)),
      };
    case 'last_3':
      return {
        from: isoDate(new Date(y, m - 2, 1)),
        to: isoDate(new Date(y, m + 1, 0)),
      };
    case 'last_6':
      return {
        from: isoDate(new Date(y, m - 5, 1)),
        to: isoDate(new Date(y, m + 1, 0)),
      };
    case 'last_12':
      return {
        from: isoDate(new Date(y, m - 11, 1)),
        to: isoDate(new Date(y, m + 1, 0)),
      };
    case 'custom':
      return custom ?? {
        from: isoDate(new Date(y, m, 1)),
        to: isoDate(new Date(y, m + 1, 0)),
      };
  }
}

export const PERIOD_LABELS: Record<PeriodKey, string> = {
  this_month: 'This month',
  last_month: 'Last month',
  last_3:     'Last 3 months',
  last_6:     'Last 6 months',
  last_12:    'Last 12 months',
  custom:     'Custom',
};
