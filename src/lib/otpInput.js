/**
 * OTP box-input helpers.
 *
 * The six boxes are rendered from a fixed-width string so each box can read its
 * own character by index. Unfilled slots are spaces, which means the raw string
 * is ALWAYS six characters long from the first keystroke — so completion must be
 * derived from the digits, never from `.length`.
 */

export const OTP_LENGTH = 6;

const BLANK = ' ';

/** All non-digit characters removed. */
export function otpDigits(value) {
  return String(value ?? '').replace(/\D/g, '');
}

/** True only when exactly `length` digits are present. */
export function isOtpComplete(value, length = OTP_LENGTH) {
  return otpDigits(value).length === length;
}

/** A single character to place in one box: a digit, or blank to clear. */
export function sanitizeBoxInput(value) {
  return String(value ?? '').replace(/\D/g, '').slice(-1);
}

/**
 * Write one box, returning a fixed-width string. Digits before `index` are
 * preserved, so clicking into an earlier box and retyping does not wipe later
 * boxes.
 */
export function setOtpBox(value, index, digit, length = OTP_LENGTH) {
  const next = String(value ?? '').padEnd(length, BLANK).split('').slice(0, length);
  next[index] = digit || BLANK;
  return next.join('');
}

/** Clear the box before `index` and return a fixed-width string. */
export function clearOtpBoxBefore(value, index, length = OTP_LENGTH) {
  const next = String(value ?? '').padEnd(length, BLANK).split('').slice(0, length);
  next[index - 1] = BLANK;
  return next.join('');
}
