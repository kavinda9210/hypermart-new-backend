/*
 * middleware/authMiddleware.js
 * JWT auth guard middleware (expects Authorization: Bearer <token>).
 */

// Import JWT verify helper.
const jwt = require('jsonwebtoken');

// Import helper to fetch the JWT secret.
const { getJwtSecret } = require('../utils/helpers');

/**
 * Require a valid JWT in the Authorization header.
 * On success, attaches decoded token payload to req.user.
 */
exports.requireAuth = (req, res, next) => {
  // Read Authorization header: "Bearer <token>".
  const header = req.headers.authorization || '';
  const [type, token] = header.split(' ');

  // Reject missing/invalid auth header.
  if (type !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Verify token signature + expiration.
    req.user = jwt.verify(token, getJwtSecret());

    // Continue to the protected route.
    return next();
  } catch {
    // Invalid/expired token.
    return res.status(401).json({ error: 'Unauthorized' });
  }
};
