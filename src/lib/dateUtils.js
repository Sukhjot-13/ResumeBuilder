/**
 * Date Utilities
 * 
 * Collection of pure functions for date manipulation and comparison.
 * strictly adhering to SRP.
 */

/**
 * Checks if two dates represent the same calendar day.
 * @param {Date|string|number} date1 
 * @param {Date|string|number} date2 
 * @returns {boolean}
 */
export function isSameDay(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);

  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * Adds a specified number of days to a date.
 * @param {Date|string|number} date 
 * @param {number} days 
 * @returns {Date} New Date object
 */
export function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Checks if a date is in the past.
 * @param {Date|string|number} date 
 * @returns {boolean}
 */
export function isPast(date) {
  return new Date(date) < new Date();
}

/**
 * Returns the current date/time.
 * Useful for mocking in tests.
 * @returns {Date}
 */
export function now() {
  return new Date();
}
