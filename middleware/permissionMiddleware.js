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

const deny = (res) => res.status(403).json({ error: 'Forbidden' });

/**
 * Require ALL permissions (case-insensitive names).
 * @param {string[]} permissionNames
 */
exports.requireAllPermissions = (permissionNames) => async (req, res, next) => {
  const names = Array.isArray(permissionNames) ? permissionNames : [];
  if (names.length === 0) return next();

  try {
    const set = await getUserPermissionSet(req.user?.id);
    const ok = names.every((n) => set.has(toKey(n)));
    if (!ok) return deny(res);
    return next();
  } catch {
    return deny(res);
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
    const set = await getUserPermissionSet(req.user?.id);
    const ok = names.some((n) => set.has(toKey(n)));
    if (!ok) return deny(res);
    return next();
  } catch {
    return deny(res);
  }
};
