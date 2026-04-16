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

/**
 * GET /api/users
 * Returns users list from the database (used by the Users List page).
 */
exports.listUsers = async (req, res) => {
  try {
    const users = await userModel.listUsers();
    return res.json({ users });
  } catch {
    return res.status(500).json({ error: 'Server error.' });
  }
};

/**
 * GET /api/users/roles
 * Returns roles for the Add User form.
 */
exports.listRoles = async (req, res) => {
  try {
    const roles = await userModel.listRoles();
    return res.json({ roles });
  } catch {
    return res.status(500).json({ error: 'Server error.' });
  }
};

/**
 * GET /api/users/branches
 * Returns branches for the Add User form.
 */
exports.listBranches = async (req, res) => {
  try {
    const branches = await userModel.listBranches();
    return res.json({ branches });
  } catch {
    return res.status(500).json({ error: 'Server error.' });
  }
};

/**
 * POST /api/users
 * Creates a new user in the database.
 */
exports.createUser = async (req, res) => {
  const {
    name,
    email,
    mobile,
    gender,
    roles_id,
    branch_id,
    password,
    password_confirmation,
    yearly_leave_allowance,
  } = req.body || {};

  if (!name || !email || !mobile || !password) {
    return res.status(400).json({ error: 'Name, email, mobile, and password are required.' });
  }

  if (password_confirmation !== undefined && password !== password_confirmation) {
    return res.status(400).json({ error: 'Password confirmation does not match.' });
  }

  const roleId = roles_id === '' || roles_id === undefined || roles_id === null ? null : Number(roles_id);
  const branchId = branch_id === '' || branch_id === undefined || branch_id === null ? null : Number(branch_id);

  if (roleId !== null && Number.isNaN(roleId)) {
    return res.status(400).json({ error: 'Invalid role.' });
  }

  if (branchId !== null && Number.isNaN(branchId)) {
    return res.status(400).json({ error: 'Invalid branch.' });
  }

  try {
    const existing = await userModel.getUserByEmail(email);
    if (existing) return res.status(409).json({ error: 'Email already exists.' });

    const passwordHash = await bcrypt.hash(password, 10);

    const created = await userModel.createUser({
      name,
      email,
      mobile,
      gender: gender || null,
      roles_id: roleId,
      branch_id: branchId,
      passwordHash,
      yearly_leave_allowance,
    });

    return res.status(201).json({ user: created });
  } catch {
    return res.status(500).json({ error: 'Server error.' });
  }
};
