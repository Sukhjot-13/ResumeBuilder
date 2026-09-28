import dbConnect from '@/lib/mongodb';
import Role from '@/models/Role';
import { resolveUserId } from '@/lib/apiKeyAuth';
import { requirePermission, isPermissionError } from '@/lib/apiPermissionGuard';
import { PERMISSIONS } from '@/lib/constants';
import { invalidateRoleCache } from '@/lib/accessControl';
import { evaluateRolePermissionWrite } from '@/lib/roleAuthorization';
import { recordAuthorizationEvent } from '@/lib/auditLog';
import { logger } from '@/lib/logger';
import { ok, fail, failWithCode, withErrorHandler, readJson } from '@/lib/apiResponse';

export const GET = withErrorHandler(async (req) => {
  const { userId, error } = await resolveUserId(req);
  if (error) return error;

  const permResult = await requirePermission(userId, PERMISSIONS.MANAGE_ROLES);
  if (isPermissionError(permResult)) return permResult.error;

  await dbConnect();
  const roles = await Role.find().sort({ value: 1 }).lean();
  return ok({ roles });
});

export const PUT = withErrorHandler(async (req) => {
  const { userId, error } = await resolveUserId(req);
  if (error) return error;

  // Writing a role's permission set IS delegating authority, so it needs the
  // root-Admin-only delegation permission — not the developer-tier
  // MANAGE_ROLES, which would let a DEVELOPER grant themselves anything.
  const permResult = await requirePermission(userId, PERMISSIONS.DELEGATE_ROLE_MANAGEMENT);
  if (isPermissionError(permResult)) {
    await recordAuthorizationEvent({
      actorId: userId,
      action: 'role.permissions.denied',
      targetType: 'Role',
      outcome: 'denied',
      after: { code: 'PERMISSION_DENIED', permission: PERMISSIONS.DELEGATE_ROLE_MANAGEMENT },
      request: req,
    });
    return permResult.error;
  }
  const { user: actor } = permResult;

  const parsed = await readJson(req);
  if (!parsed.ok) return parsed.response;
  const { roleValue, permissions } = parsed.body || {};

  if (typeof roleValue !== 'number' || !Array.isArray(permissions)) {
    return fail('Invalid request. Need roleValue (number) and permissions (array)', 400);
  }

  await dbConnect();

  const existing = await Role.findOne({ value: roleValue }).select('permissions').lean();
  if (!existing) return fail('Role not found', 404);

  const decision = await evaluateRolePermissionWrite({ actor, roleValue, permissions });
  if (!decision.allowed) {
    logger.warn('Role permission write refused', {
      actorId: userId,
      actorRole: actor.role,
      roleValue,
      code: decision.code,
    });
    await recordAuthorizationEvent({
      actorId: userId,
      actorRole: actor.role,
      action: 'role.permissions.denied',
      targetType: 'Role',
      targetId: String(roleValue),
      outcome: 'denied',
      after: { permissions, code: decision.code },
      request: req,
    });
    return failWithCode(decision.reason, decision.code, 403);
  }

  const role = await Role.findOneAndUpdate(
    { value: roleValue },
    { $set: { permissions } },
    { new: true }
  );

  if (!role) return fail('Role not found', 404);

  // Revocation must be effective on the next permission check, not after the
  // 60s cache TTL.
  invalidateRoleCache();

  await recordAuthorizationEvent({
    actorId: userId,
    actorRole: actor.role,
    action: 'role.permissions.updated',
    targetType: 'Role',
    targetId: String(roleValue),
    before: { permissions: existing.permissions },
    after: { permissions },
    request: req,
  });

  return ok({ role });
});
