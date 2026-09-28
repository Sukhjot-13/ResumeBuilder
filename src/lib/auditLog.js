/**
 * auditLog.js — durable audit trail for security-sensitive mutations.
 *
 * Every admin write (role/permission rewrite, role change, credit adjustment,
 * credit reset, user deletion) and every subscription upgrade goes through
 * recordAuthorizationEvent(). Writes are best-effort and NEVER throw into the
 * request path, but a failure is logged loudly.
 *
 * Secrets are never persisted: values are reduced to scalars and any key that
 * looks like a credential is dropped before the document is written.
 */

import crypto from 'crypto';
import dbConnect from '@/lib/mongodb';
import { getClientIp } from '@/lib/clientIp';
import { logger } from '@/lib/logger';

const REDACTED = '[redacted]';
const SECRET_KEY_PATTERN = /(token|secret|password|passwd|otp|authorization|apikey|api_key|cookie|signature|stripepaymentid|customerid)/i;
const MAX_STRING_LENGTH = 200;
const MAX_ARRAY_LENGTH = 50;

function sanitizeValue(value, depth = 0) {
  if (value === null || value === undefined) return value;

  const type = typeof value;
  if (type === 'number' || type === 'boolean') return value;
  if (type === 'string') {
    return value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}…` : value;
  }
  if (type !== 'object') return REDACTED;
  if (depth >= 3) return '[truncated]';

  if (Array.isArray(value)) {
    const trimmed = value.slice(0, MAX_ARRAY_LENGTH);
    return trimmed.map((entry) => sanitizeValue(entry, depth + 1));
  }

  const output = {};
  for (const [key, entry] of Object.entries(value)) {
    if (SECRET_KEY_PATTERN.test(key)) {
      output[key] = REDACTED;
      continue;
    }
    output[key] = sanitizeValue(entry, depth + 1);
  }
  return output;
}

/**
 * Resolves a correlation id for the current request, honouring an inbound
 * X-Request-Id so proxy and API logs can be joined.
 * @param {Request} [request]
 * @returns {string}
 */
export function resolveRequestId(request) {
  const incoming = request?.headers?.get?.('x-request-id');
  if (incoming && /^[A-Za-z0-9._-]{1,100}$/.test(incoming)) return incoming;
  return crypto.randomUUID();
}

/**
 * Persists one authorization/audit event.
 *
 * @param {object} event
 * @param {string|object} event.actorId - Acting user id (or user doc)
 * @param {number} [event.actorRole]
 * @param {string} event.action - e.g. 'role.permissions.updated'
 * @param {string} event.targetType - e.g. 'Role', 'User', 'Subscription'
 * @param {string} [event.targetId]
 * @param {'allowed'|'denied'} [event.outcome]
 * @param {object} [event.before]
 * @param {object} [event.after]
 * @param {Request} [event.request]
 * @returns {Promise<object|null>} - The saved document, or null when the write failed.
 */
export async function recordAuthorizationEvent(event) {
  const {
    actorId,
    actorRole,
    action,
    targetType,
    targetId,
    outcome = 'allowed',
    before,
    after,
    request,
  } = event || {};

  if (!action || !targetType) {
    logger.error('Audit event rejected: action and targetType are required', null, { action, targetType });
    return null;
  }

  const resolvedActorId =
    actorId && typeof actorId === 'object' ? actorId._id ?? actorId.id : actorId;

  const payload = {
    actor: resolvedActorId || undefined,
    actorRole: Number.isInteger(actorRole) ? actorRole : undefined,
    action,
    targetType,
    targetId: targetId != null ? String(targetId) : undefined,
    outcome,
    before: before === undefined ? undefined : sanitizeValue(before),
    after: after === undefined ? undefined : sanitizeValue(after),
    requestId: resolveRequestId(request),
    ip: getClientIp(request),
    userAgent: request?.headers?.get?.('user-agent')?.slice(0, 200),
  };

  try {
    await dbConnect();
    const { default: AuthorizationEvent } = await import('@/models/AuthorizationEvent');
    return await AuthorizationEvent.create(payload);
  } catch (err) {
    logger.error('Failed to persist authorization audit event', err, { action, targetType, targetId });
    return null;
  }
}
