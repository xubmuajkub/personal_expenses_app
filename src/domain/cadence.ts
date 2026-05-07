/**
 * Cadence calculator — pure, no side effects.
 *
 * Supported cadence strings:
 *   monthly_day_<1..31>  — same day-of-month each month, clamped to last day
 *   weekly_dow_<0..6>    — 0=Sun, 6=Sat; advances to next matching day
 *   every_n_days_<1..366>— fixed interval: adds n days
 *   cron:<expr>          — throws "client-side cron unsupported"
 */

/** Return the last day of the given month (1-based). */
function lastDayOfMonth(year: number, month: number): number {
  // month is 0-based in Date constructor
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Given a cadence string and a reference date, compute the next run date
 * strictly after `after`.
 *
 * @param cadence - one of the supported cadence strings
 * @param after   - the reference date (next run must be strictly after this)
 * @returns a new Date representing the next run time
 */
export function nextRunAfter(cadence: string, after: Date): Date {
  if (cadence.startsWith('cron:')) {
    throw new Error('client-side cron unsupported');
  }

  // monthly_day_<n>
  const monthlyMatch = cadence.match(/^monthly_day_(\d+)$/);
  if (monthlyMatch) {
    const targetDay = parseInt(monthlyMatch[1]!, 10);
    // Try same month first, then advance month-by-month until we find a date > after
    const base = new Date(after);
    // Start from same month
    let year = base.getFullYear();
    let month = base.getMonth(); // 0-based

    for (let attempt = 0; attempt < 13; attempt++) {
      const last = lastDayOfMonth(year, month);
      const day = Math.min(targetDay, last);
      const candidate = new Date(year, month, day);
      // Set to midnight of the computed day
      candidate.setHours(0, 0, 0, 0);
      if (candidate > after) {
        return candidate;
      }
      // Advance to next month
      month += 1;
      if (month > 11) {
        month = 0;
        year += 1;
      }
    }
    throw new Error(`Could not compute next monthly run for cadence ${cadence}`);
  }

  // weekly_dow_<n>
  const weeklyMatch = cadence.match(/^weekly_dow_([0-6])$/);
  if (weeklyMatch) {
    const targetDow = parseInt(weeklyMatch[1]!, 10); // 0=Sun, 6=Sat
    const base = new Date(after);
    // Start checking from the next day
    const candidate = new Date(base);
    candidate.setHours(0, 0, 0, 0);
    // Advance at least 1 day beyond 'after' — find next occurrence of targetDow
    for (let i = 1; i <= 7; i++) {
      candidate.setDate(candidate.getDate() + 1);
      if (candidate.getDay() === targetDow) {
        return new Date(candidate);
      }
    }
    throw new Error(`Could not compute next weekly run for cadence ${cadence}`);
  }

  // every_n_days_<n>
  const everyNMatch = cadence.match(/^every_n_days_(\d+)$/);
  if (everyNMatch) {
    const n = parseInt(everyNMatch[1]!, 10);
    const result = new Date(after);
    result.setDate(result.getDate() + n);
    return result;
  }

  throw new Error(`Unknown cadence format: ${cadence}`);
}
