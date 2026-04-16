/*
 * middleware/authMiddleware.js
 * JWT auth guard middleware (expects Authorization: Bearer <token>).
 */

// Import JWT verify helper.
const jwt = require('jsonwebtoken');

// Import helper to fetch the JWT secret.
const { getJwtSecret } = require('../utils/helpers');

// Import model to validate the current user's status from DB.
const userModel = require('../models/userModel');

/**
 * Require a valid JWT in the Authorization header.
 * On success, attaches decoded token payload to req.user.
 */
exports.requireAuth = async (req, res, next) => {
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

    const dbUser = await userModel.getUserById(req.user?.id);
    if (!dbUser) return res.status(401).json({ error: 'Unauthorized' });

    const statusId = dbUser.status_id === null || dbUser.status_id === undefined ? 1 : Number(dbUser.status_id);
    if (statusId !== 1) {
      return res.status(403).json({ error: 'User is deactivated.' });
    }

    // Continue to the protected route.
    return next();
  } catch {
    // Invalid/expired token.
    return res.status(401).json({ error: 'Unauthorized' });
  }
};
