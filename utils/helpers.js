/*
 * utils/helpers.js
 * Small shared helpers (JWT secret, Laravel bcrypt hash normalization).
 */

/**
 * Get JWT secret from environment.
 * Note: set JWT_SECRET in production (do not rely on the default).
 */
exports.getJwtSecret = () => process.env.JWT_SECRET || 'hypermart_secret';

/**
 * Normalize Laravel bcrypt hashes for Node bcrypt.
 * Laravel uses $2y$ prefix; Node bcrypt expects $2a$/$2b$.
 */
exports.normalizeBcryptHash = (hash) =>
  typeof hash === 'string' ? hash.replace(/^\$2y\$/, '$2a$') : '';
