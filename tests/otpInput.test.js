import { describe, it, expect } from 'vitest';
import {
  OTP_LENGTH,
  otpDigits,
  isOtpComplete,
  sanitizeBoxInput,
  setOtpBox,
  clearOtpBoxBefore,
} from '@/lib/otpInput';

// Regression: the six-box OTP input pads unfilled slots with spaces, so the raw
// state string is always OTP_LENGTH characters from the first keystroke. The
// auto-submit effect used to test `otp.length === OTP_LENGTH`, which was
// therefore always true and fired the verify request after ONE digit. That sent
// a padded string like "1     " to the server, which incremented otpAttempts on
// every keystroke and locked the user out before they finished typing.
describe('otpDigits', () => {
  it('strips the space padding used for unfilled boxes', () => {
    expect(otpDigits('1     ')).toBe('1');
    expect(otpDigits('123   ')).toBe('123');
  });

  it('strips non-digits from pasted or magic-link input', () => {
    expect(otpDigits('12-34 56')).toBe('123456');
    expect(otpDigits('  1 2 3 4 5 6  ')).toBe('123456');
  });

  it('handles null, undefined and empty input', () => {
    expect(otpDigits('')).toBe('');
    expect(otpDigits(null)).toBe('');
    expect(otpDigits(undefined)).toBe('');
  });
});

describe('isOtpComplete', () => {
  it('is false for a partially typed, space-padded code', () => {
    expect(isOtpComplete('')).toBe(false);
    expect(isOtpComplete('1     ')).toBe(false);
    expect(isOtpComplete('12    ')).toBe(false);
    expect(isOtpComplete('12345 ')).toBe(false);
  });

  it('is true only when all six digits are present', () => {
    expect(isOtpComplete('123456')).toBe(true);
  });

  it('is false when more than six digits are present', () => {
    expect(isOtpComplete('1234567')).toBe(false);
  });

  it('never treats the padded state string as complete (the original bug)', () => {
    let state = '';
    for (let i = 0; i < OTP_LENGTH; i += 1) {
      state = setOtpBox(state, i, String(i + 1));
      const expected = i === OTP_LENGTH - 1;
      expect(state.length).toBe(OTP_LENGTH);
      expect(isOtpComplete(state)).toBe(expected);
    }
    expect(isOtpComplete(state)).toBe(true);
  });
});

describe('sanitizeBoxInput', () => {
  it('keeps only the last typed digit', () => {
    expect(sanitizeBoxInput('7')).toBe('7');
    expect(sanitizeBoxInput('12')).toBe('2');
  });

  it('rejects non-digits', () => {
    expect(sanitizeBoxInput('a')).toBe('');
    expect(sanitizeBoxInput('-')).toBe('');
    expect(sanitizeBoxInput('')).toBe('');
  });
});

describe('setOtpBox', () => {
  it('places a digit at the given index and pads the rest', () => {
    expect(setOtpBox('', 0, '9')).toBe('9     ');
    expect(setOtpBox('', 3, '9')).toBe('   9  ');
    expect(setOtpBox('', 5, '9')).toBe('     9');
  });

  it('preserves digits in other boxes when retyping an earlier one', () => {
    expect(setOtpBox('1     ', 0, '9')).toBe('9     ');
    expect(setOtpBox('123456', 1, '9')).toBe('193456');
  });

  it('clears a box when given a blank digit', () => {
    expect(setOtpBox('123456', 2, '')).toBe('12 456');
  });

  it('always returns exactly OTP_LENGTH characters', () => {
    expect(setOtpBox('', 0, '1').length).toBe(OTP_LENGTH);
    expect(setOtpBox('123456', 0, '1').length).toBe(OTP_LENGTH);
  });
});

describe('clearOtpBoxBefore', () => {
  it('clears the preceding box on backspace over an empty box', () => {
    expect(clearOtpBoxBefore('12 456', 2)).toBe('1  456');
  });

  it('pads a short state string out to the fixed width', () => {
    expect(clearOtpBoxBefore('1 456', 2)).toBe('1 456 ');
  });

  it('keeps the fixed width so box indices stay stable', () => {
    expect(clearOtpBoxBefore('123456', 3).length).toBe(OTP_LENGTH);
  });
});
