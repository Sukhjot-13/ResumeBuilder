import { NextResponse } from 'next/server';

/**
 * Successful response (200 / 201).
 * Returns the data directly (no wrapper). Callers can chain .cookies.set() etc.
 *
 * @param {any} data - Response data
 * @param {number} [status=200] - HTTP status code
 */
export function ok(data, status = 200) {
  return NextResponse.json(data, { status });
}

/**
 * Successful response with a standard envelope.
 * Shape: { success: true, data, message? }
 *
 * @param {any} data - Response data
 * @param {string} [message] - Optional success message
 * @param {number} [status=200] - HTTP status code
 */
export function success(data, message = undefined, status = 200) {
  const body = { success: true, data };
  if (message !== undefined) body.message = message;
  return NextResponse.json(body, { status });
}

/**
 * Error response.
 * Shape: { success: false, error: message }
 */
export function fail(message, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

// ---------------------------------------------------------------------------
// Body reading with size guard
// ---------------------------------------------------------------------------

/**
 * Reads a JSON request body with a hard size cap (M4 fix — prevents oversized
 * payloads from reaching AI/PDF engines).
 *
 * @param {Request} request
 * @param {number} maxBytes - Maximum accepted body size (default 256KB)
 * @returns {Promise<{ok: true, body: object} | {ok: false, response: NextResponse}>}
 */
export async function readJson(request, maxBytes = 256 * 1024) {
  let text;
  try {
    text = await request.text();
  } catch {
    return { ok: false, response: fail('Invalid request body', 400) };
  }

  // Measure actual BYTES — multibyte chars make length undercount
  if (Buffer.byteLength(text, 'utf8') > maxBytes) {
    return { ok: false, response: fail('Request body too large', 413) };
  }

  try {
    return { ok: true, body: JSON.parse(text) };
  } catch {
    return { ok: false, response: fail('Invalid JSON body', 400) };
  }
}

// ---------------------------------------------------------------------------
// Custom error classes for use with withErrorHandler
// ---------------------------------------------------------------------------

export class AppError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed') {
    super(message, 400);
  }
}

export class AuthError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

/**
 * Wrap a route handler so any thrown error is caught and returned as JSON.
 * Supports AppError subclasses (custom status codes) and generic errors (500).
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
