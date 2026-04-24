import { describe, expect, it } from 'vitest';
import { formatTime12h, formatTimeRange } from './time';

describe('formatTime12h', () => {
  it('converts morning 24-hour to 12-hour', () => {
    expect(formatTime12h('07:14:00')).toBe('7:14 AM');
    expect(formatTime12h('07:14')).toBe('7:14 AM');
  });

  it('converts afternoon 24-hour to 12-hour', () => {
    expect(formatTime12h('15:22:00')).toBe('3:22 PM');
    expect(formatTime12h('13:00')).toBe('1:00 PM');
  });

  it('handles midnight and noon boundary', () => {
    expect(formatTime12h('00:00:00')).toBe('12:00 AM');
    expect(formatTime12h('12:00:00')).toBe('12:00 PM');
    expect(formatTime12h('00:30')).toBe('12:30 AM');
    expect(formatTime12h('12:30')).toBe('12:30 PM');
  });

  it('handles end of day', () => {
    expect(formatTime12h('23:59:59')).toBe('11:59 PM');
  });

  it('returns fallback for null/undefined/empty', () => {
    expect(formatTime12h(null)).toBe('--');
    expect(formatTime12h(undefined)).toBe('--');
    expect(formatTime12h('')).toBe('--');
    expect(formatTime12h(null, 'n/a')).toBe('n/a');
  });

  it('returns fallback for malformed input', () => {
    expect(formatTime12h('not a time')).toBe('--');
    expect(formatTime12h('25:00')).toBe('--');
    expect(formatTime12h('24:00')).toBe('--');
    expect(formatTime12h('-1:00')).toBe('--');
    expect(formatTime12h('ab:cd')).toBe('--');
  });
});

describe('formatTimeRange', () => {
  it('renders a full range', () => {
    expect(formatTimeRange('07:00', '15:30')).toBe('7:00 AM – 3:30 PM');
  });

  it('marks an open entry when end time is missing', () => {
    expect(formatTimeRange('07:00', null)).toBe('7:00 AM · open');
    expect(formatTimeRange('07:00', undefined, 'open')).toBe('7:00 AM · open');
  });
});
