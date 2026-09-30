import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatDateInput } from '@/lib/dateUtils';

afterEach(() => vi.unstubAllEnvs());

describe('profile calendar date formatting', () => {
  it.each(['America/Toronto', 'America/Los_Angeles', 'UTC', 'Pacific/Auckland'])(
    'preserves saved birthdays in %s across winter, summer and leap days', (timezone) => {
      vi.stubEnv('TZ', timezone);
      for (const day of ['1990-01-01', '2000-02-29', '1990-07-01']) {
        const serialized = `${day}T00:00:00.000Z`;
        expect(formatDateInput(serialized)).toBe(day);
        expect(formatDateInput(new Date(serialized))).toBe(day);
        expect(formatDateInput(day)).toBe(day);
      }
    },
  );

  it('keeps repeated profile save/reload cycles on the same calendar date', () => {
    vi.stubEnv('TZ', 'America/Toronto');
    let value = '1990-01-01T00:00:00.000Z';
    for (let save = 0; save < 3; save += 1) {
      const input = formatDateInput(value);
      expect(input).toBe('1990-01-01');
      value = new Date(input).toISOString();
    }
  });

  it('returns an empty input for missing or malformed dates', () => {
    for (const value of [undefined, null, '', 'not-a-date', {}, 0, new Date('invalid')]) {
      expect(formatDateInput(value)).toBe('');
    }
  });
});
