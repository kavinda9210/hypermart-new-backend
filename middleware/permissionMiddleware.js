/**
 * Require a single permission (case-insensitive name).
 * @param {string} permissionName
 */
exports.requirePermission = (permissionName) =>
  exports.requireAllPermissions([permissionName]);
/*
 * middleware/permissionMiddleware.js
 * Permission guard middleware using roles_has_permissions.
 */

const userModel = require('../models/userModel');

const toKey = (s) => String(s || '').trim().toLowerCase();

const getUserPermissionSet = async (userId) => {
  const perms = await userModel.listPermissionsForUser(String(userId));
  return new Set((perms || []).map((p) => toKey(p.permissions_name)));
};

const deny = (res, reason) => {
  if (reason) {
    console.log('[PermissionMiddleware] Deny reason:', reason);
  }
  return res.status(403).json({ error: 'Forbidden' });
};

/**
 * Require ALL permissions (case-insensitive names).
 * @param {string[]} permissionNames
 */
exports.requireAllPermissions = (permissionNames) => async (req, res, next) => {
  const names = Array.isArray(permissionNames) ? permissionNames : [];
  if (names.length === 0) return next();

  try {
    const userId = req.user?.id;
    if (!userId) {
      console.log('[PermissionMiddleware] No userId in req.user:', req.user);
      return deny(res, 'No userId in req.user');
    }
    const set = await getUserPermissionSet(userId);
    console.log('[PermissionMiddleware] userId:', userId, 'required:', names, 'userPerms:', Array.from(set));
    const ok = names.every((n) => set.has(toKey(n)));
    if (!ok) return deny(res, 'Missing required permission');
    return next();
  } catch (e) {
    console.log('[PermissionMiddleware] Error:', e);
    return deny(res, 'Exception in permission check');
  }
};

/**
 * Require ANY of the permissions (case-insensitive names).
 * @param {string[]} permissionNames
 */
exports.requireAnyPermissions = (permissionNames) => async (req, res, next) => {
  const names = Array.isArray(permissionNames) ? permissionNames : [];
  if (names.length === 0) return next();

  try {
    const userId = req.user?.id;
    if (!userId) {
      console.log('[PermissionMiddleware] No userId in req.user:', req.user);
      return deny(res, 'No userId in req.user');
    }
    const set = await getUserPermissionSet(userId);
    console.log('[PermissionMiddleware] userId:', userId, 'requiredAny:', names, 'userPerms:', Array.from(set));
    const ok = names.some((n) => set.has(toKey(n)));
    if (!ok) return deny(res, 'Missing any required permission');
    return next();
  } catch (e) {
    console.log('[PermissionMiddleware] Error:', e);
    return deny(res, 'Exception in permission check');
  }
};
