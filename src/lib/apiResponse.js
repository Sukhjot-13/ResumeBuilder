import { NextResponse } from 'next/server';
import { AppError } from './AppError';

/**
 * Successful response (200 / 201).
 * Returns the data directly (no wrapper) since HTTP status codes already
 * communicate success. Callers can chain .cookies.set() etc.
 */
export function ok(data, message = 'Success', status = 200) {
  // eslint-disable-next-line no-unused-vars
  void message;
  return NextResponse.json(data, { status });
}

/**
 * Error response.
 * Shape: { success: false, error: message }
 */
export function fail(message, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

/**
 * Wrap a route handler so every thrown AppError or unexpected
 * error is caught and returned as a consistent JSON response.
 */
export function withErrorHandler(handler) {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (err) {
      if (err instanceof AppError) {
        return fail(err.message, err.status);
      }
      console.error('Unhandled route error:', err);
      return fail('Internal server error', 500);
    }
  };
}
