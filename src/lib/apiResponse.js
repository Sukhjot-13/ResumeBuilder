import { NextResponse } from 'next/server';

/**
 * Successful response (200 / 201).
 * Returns the data directly (no wrapper). Callers can chain .cookies.set() etc.
 */
export function ok(data, message = 'Success', status = 200) {
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
 * Wrap a route handler so any thrown error is caught and returned as JSON.
 */
export function withErrorHandler(handler) {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (err) {
      console.error('Unhandled route error:', err);
      return fail('Internal server error', 500);
    }
  };
}
