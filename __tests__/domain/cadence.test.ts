import { nextRunAfter } from '@/domain/cadence';

describe('nextRunAfter — monthly_day', () => {
  test('advances to same day next month when day is in the past', () => {
    // after = March 15; monthly_day_1 → April 1
    const after = new Date('2024-03-15T10:00:00.000Z');
    const result = nextRunAfter('monthly_day_1', after);
    expect(result.getFullYear()).toBe(2024);
    expect(result.getMonth()).toBe(3); // April
    expect(result.getDate()).toBe(1);
  });

  test('picks later in same month if still in future', () => {
    // after = March 1; monthly_day_15 → March 15
    const after = new Date('2024-03-01T00:00:00.000Z');
    const result = nextRunAfter('monthly_day_15', after);
    expect(result.getMonth()).toBe(2); // March
    expect(result.getDate()).toBe(15);
  });

  test('clamps Feb 31 → Feb 28 on a non-leap year', () => {
    // after = Jan 31, 2023; monthly_day_31 → Feb 28 (non-leap)
    const after = new Date('2023-01-31T00:00:00.000Z');
    const result = nextRunAfter('monthly_day_31', after);
    expect(result.getFullYear()).toBe(2023);
    expect(result.getMonth()).toBe(1); // February
    expect(result.getDate()).toBe(28);
  });

  test('clamps Feb 31 → Feb 29 on a leap year', () => {
    // after = Jan 31, 2024; monthly_day_31 → Feb 29 (leap)
    const after = new Date('2024-01-31T00:00:00.000Z');
    const result = nextRunAfter('monthly_day_31', after);
    expect(result.getFullYear()).toBe(2024);
    expect(result.getMonth()).toBe(1); // February
    expect(result.getDate()).toBe(29);
  });

  test('clamps day 30 in February to last day', () => {
    const after = new Date('2023-01-31T00:00:00.000Z');
    const result = nextRunAfter('monthly_day_30', after);
    expect(result.getMonth()).toBe(1); // February
    expect(result.getDate()).toBe(28);
  });

  test('wraps year correctly (December → January)', () => {
    const after = new Date('2023-12-15T00:00:00.000Z');
    const result = nextRunAfter('monthly_day_1', after);
    expect(result.getFullYear()).toBe(2024);
    expect(result.getMonth()).toBe(0); // January
    expect(result.getDate()).toBe(1);
  });
});

describe('nextRunAfter — weekly_dow', () => {
  test('finds next Sunday (DOW=0) from a Wednesday', () => {
    // Wednesday 2024-03-13 → next Sunday 2024-03-17
    const after = new Date('2024-03-13T00:00:00.000Z');
    const result = nextRunAfter('weekly_dow_0', after);
    expect(result.getDay()).toBe(0); // Sunday
    expect(result > after).toBe(true);
  });

  test('finds next Monday (DOW=1) from a Sunday', () => {
    // Sunday 2024-03-17 → Monday 2024-03-18
    const after = new Date('2024-03-17T00:00:00.000Z');
    const result = nextRunAfter('weekly_dow_1', after);
    expect(result.getDay()).toBe(1); // Monday
    expect(result > after).toBe(true);
  });

  test('does not return the same day as after even if DOW matches', () => {
    // after is a Monday (DOW=1); next Monday should be 7 days later
    const after = new Date('2024-03-18T00:00:00.000Z'); // This is a Monday
    const result = nextRunAfter('weekly_dow_1', after);
    expect(result.getDay()).toBe(1);
    // Must be strictly after
    expect(result > after).toBe(true);
    // Should be next Monday (7 days later)
    const expectedDate = 25; // March 25
    expect(result.getDate()).toBe(expectedDate);
  });

  test('finds Saturday (DOW=6)', () => {
    const after = new Date('2024-03-18T00:00:00.000Z'); // Monday
    const result = nextRunAfter('weekly_dow_6', after);
    expect(result.getDay()).toBe(6); // Saturday
  });
});

describe('nextRunAfter — every_n_days', () => {
  test('adds n days', () => {
    const after = new Date('2024-03-01T00:00:00.000Z');
    const result = nextRunAfter('every_n_days_7', after);
    expect(result.getDate()).toBe(8);
    expect(result.getMonth()).toBe(2); // March
  });

  test('adds 30 days crossing month boundary', () => {
    const after = new Date('2024-03-15T00:00:00.000Z');
    const result = nextRunAfter('every_n_days_30', after);
    // March 15 + 30 = April 14
    expect(result.getMonth()).toBe(3); // April
    expect(result.getDate()).toBe(14);
  });

  test('adds 1 day', () => {
    const after = new Date('2024-03-31T00:00:00.000Z');
    const result = nextRunAfter('every_n_days_1', after);
    expect(result.getMonth()).toBe(3); // April
    expect(result.getDate()).toBe(1);
  });
});

describe('nextRunAfter — cron', () => {
  test('throws "client-side cron unsupported"', () => {
    const after = new Date('2024-03-01T00:00:00.000Z');
    expect(() => nextRunAfter('cron:0 * * * *', after)).toThrow(
      'client-side cron unsupported',
    );
  });
});

describe('nextRunAfter — invalid cadence', () => {
  test('throws on unknown cadence format', () => {
    const after = new Date('2024-03-01T00:00:00.000Z');
    expect(() => nextRunAfter('quarterly', after)).toThrow('Unknown cadence format');
  });
});
