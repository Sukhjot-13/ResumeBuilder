/**
 * AppError — Standardised API error class.
 *
 * Throw this from services / route handlers with a user-facing message
 * and an HTTP status code. The apiResponse helper catches
 * these and returns a consistent JSON shape to the client.
 */
export class AppError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'AppError';
    this.status = status;
  }

  static badRequest(msg) {
    return new AppError(msg, 400);
  }

  static unauthorized(msg = 'Unauthorized') {
    return new AppError(msg, 401);
  }

  static forbidden(msg = 'Forbidden') {
    return new AppError(msg, 403);
  }

  static notFound(msg = 'Not found') {
    return new AppError(msg, 404);
  }

  static internal(msg = 'Internal server error') {
    return new AppError(msg, 500);
  }
}
