/*
 * controllers/userController.js
 * Auth controller: login (issues JWT) and logout (stateless; client clears token).
 */

// Import bcrypt for password hash comparison.
const bcrypt = require('bcrypt');

// Import jsonwebtoken to create/sign JWTs.
const jwt = require('jsonwebtoken');

// Import model functions that query the SQLite database.
const userModel = require('../models/userModel');

// Import small helpers (JWT secret + Laravel bcrypt normalization).
const { getJwtSecret, normalizeBcryptHash } = require('../utils/helpers');

// Resolve the JWT secret once on startup.
const SECRET = getJwtSecret();

/**
 * POST /api/auth/login
 * Validates credentials, then returns a JWT + basic user info.
 */
exports.login = async (req, res) => {
  // Read input from JSON body.
  const { email, password } = req.body || {};

  // Basic request validation.
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    // Find the user by email.
    const user = await userModel.getUserByEmail(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials.' });

    // Normalize the stored bcrypt hash.
    // Laravel stores bcrypt hashes with $2y$ prefix; Node bcrypt expects $2a$/$2b$.
    const hash = normalizeBcryptHash(user.password);

    // Compare plaintext password with stored bcrypt hash.
    const match = await bcrypt.compare(password, hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials.' });

    // Load role info (used by frontend for role-based UI).
    const role = user.roles_id ? await userModel.getRoleById(user.roles_id) : null;

    // Create JWT (expires in 1 day).
    const token = jwt.sign(
      { id: user.id, role: role ? role.role_name : null },
      SECRET,
      { expiresIn: '1d' }
    );

    // Send token + user payload back to client.
    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: role ? role.role_name : null,
      },
    });
  } catch {
    // Avoid leaking internal errors to client.
    return res.status(500).json({ error: 'Server error.' });
  }
};

/**
 * POST /api/auth/logout
 * JWT is stateless; logout is performed client-side by deleting the token.
 */
exports.logout = (req, res) => {
  res.json({ success: true });
};
