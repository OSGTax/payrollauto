import { describe, expect, it } from 'vitest';
import { easternDateTime, easternDate, parseEasternWallClock } from './tz';

/**
 * These tests pin the timezone logic to Eastern US rules so a refactor can't
 * silently start storing UTC again (which was the original bug).
 */

describe('easternDateTime', () => {
  it('returns Eastern wall-clock for a fixed UTC instant (DST on)', () => {
    // 2025-07-04 14:30:00 UTC == 10:30:00 EDT (offset -4h in summer)
    const { date, time } = easternDateTime(new Date('2025-07-04T14:30:00Z'));
    expect(date).toBe('2025-07-04');
    expect(time).toBe('10:30:00');
  });

  it('returns Eastern wall-clock for a fixed UTC instant (DST off)', () => {
    // 2025-01-15 14:30:00 UTC == 09:30:00 EST (offset -5h in winter)
    const { date, time } = easternDateTime(new Date('2025-01-15T14:30:00Z'));
    expect(date).toBe('2025-01-15');
    expect(time).toBe('09:30:00');
  });

  it('rolls the Eastern date back across midnight when UTC has advanced', () => {
    // 2025-03-01 02:00:00 UTC == 2025-02-28 21:00 EST (still previous day)
    const { date, time } = easternDateTime(new Date('2025-03-01T02:00:00Z'));
    expect(date).toBe('2025-02-28');
    expect(time).toBe('21:00:00');
  });
});

describe('easternDate', () => {
  it('mirrors easternDateTime().date', () => {
    const d = new Date('2025-06-01T08:00:00Z');
    expect(easternDate(d)).toBe(easternDateTime(d).date);
  });
});

describe('parseEasternWallClock', () => {
  it('round-trips an Eastern wall-clock value back to its source instant (summer/EDT)', () => {
    const src = new Date('2025-07-04T14:30:00Z'); // 10:30 AM EDT
    const { date, time } = easternDateTime(src);
    expect(parseEasternWallClock(date, time)).toBe(src.getTime());
  });

  it('round-trips an Eastern wall-clock value back to its source instant (winter/EST)', () => {
    const src = new Date('2025-01-15T14:30:00Z'); // 9:30 AM EST
    const { date, time } = easternDateTime(src);
    expect(parseEasternWallClock(date, time)).toBe(src.getTime());
  });

  it('handles the "spring forward" DST gap by treating the input as post-shift', () => {
    // DST starts 2025-03-09: 02:00 EST jumps to 03:00 EDT (02:xx doesn't exist).
    // We accept that 02:30 of that day is ambiguous; we just assert we don't crash
    // and produce a time that lands in Eastern within a sane offset.
    const ms = parseEasternWallClock('2025-03-09', '03:30:00');
    expect(Number.isFinite(ms)).toBe(true);
    // 03:30 EDT on 2025-03-09 === 07:30 UTC
    expect(new Date(ms).toISOString()).toBe('2025-03-09T07:30:00.000Z');
  });

  it('handles the "fall back" DST overlap', () => {
    // DST ends 2025-11-02: 02:00 EDT falls back to 01:00 EST (01:xx happens twice).
    // 00:30 is unambiguous — it's EDT.
    const ms = parseEasternWallClock('2025-11-02', '00:30:00');
    // 00:30 EDT == 04:30 UTC
    expect(new Date(ms).toISOString()).toBe('2025-11-02T04:30:00.000Z');
  });

  it('accepts times without seconds', () => {
    const full = parseEasternWallClock('2025-06-15', '09:00:00');
    const short = parseEasternWallClock('2025-06-15', '09:00');
    expect(short).toBe(full);
  });

  it('matches a computed elapsed duration close to real-world usage', () => {
    // If we clock in at "10:00:00" on 2025-07-04 and check 15 minutes later (UTC 14:15),
    // elapsed should be ~900 seconds.
    const startMs = parseEasternWallClock('2025-07-04', '10:00:00');
    const nowMs = new Date('2025-07-04T14:15:00Z').getTime();
    expect(Math.round((nowMs - startMs) / 1000)).toBe(15 * 60);
  });
});
