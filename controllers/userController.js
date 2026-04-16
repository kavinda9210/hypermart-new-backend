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
        status_id: user.status_id === null || user.status_id === undefined ? 1 : Number(user.status_id),
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

    const existingMobile = await userModel.getUserByMobile(mobile);
    if (existingMobile) return res.status(409).json({ error: 'Mobile number already exists.' });

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

/**
 * PATCH /api/users/:id/status
 * Updates user's status_id (1 = Active, 0 = Inactive).
 */
exports.updateUserStatus = async (req, res) => {
  const { id } = req.params;
  const { status_id } = req.body || {};

  const statusNum = Number(status_id);
  if (!Number.isInteger(statusNum) || (statusNum !== 0 && statusNum !== 1)) {
    return res.status(400).json({ error: 'status_id must be 0 or 1.' });
  }

  try {
    const changes = await userModel.updateUserStatus(id, statusNum);
    if (!changes) return res.status(404).json({ error: 'User not found.' });

    return res.json({
      success: true,
      id,
      status_id: statusNum,
      status: statusNum === 1 ? 'Active' : 'Inactive',
    });
  } catch {
    return res.status(500).json({ error: 'Server error.' });
  }
};

/**
 * GET /api/users/:id
 * Returns one user's data for the Edit User form.
 */
exports.getUser = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await userModel.getUserById(id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.number,
        gender: user.gender,
        roles_id: user.roles_id,
        branch_id: user.branch_id,
        yearly_leave_allowance: user.yearly_leave_allowance,
        status_id: user.status_id === null || user.status_id === undefined ? 1 : Number(user.status_id),
      },
    });
  } catch {
    return res.status(500).json({ error: 'Server error.' });
  }
};

/**
 * PUT /api/users/:id
 * Updates one user (used by the Edit User form).
 */
exports.updateUser = async (req, res) => {
  const { id } = req.params;
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

  if (!name || !email || !mobile) {
    return res.status(400).json({ error: 'Name, email, and mobile are required.' });
  }

  const pwd = typeof password === 'string' ? password : '';
  if (pwd && password_confirmation !== undefined && pwd !== password_confirmation) {
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
    const existingUser = await userModel.getUserById(id);
    if (!existingUser) return res.status(404).json({ error: 'User not found.' });

    const existingEmail = await userModel.getUserByEmail(email);
    if (existingEmail && String(existingEmail.id) !== String(id)) {
      return res.status(409).json({ error: 'Email already exists.' });
    }

    const existingMobile = await userModel.getUserByMobile(mobile);
    if (existingMobile && String(existingMobile.id) !== String(id)) {
      return res.status(409).json({ error: 'Mobile number already exists.' });
    }

    const payload = {
      name,
      email,
      mobile,
      gender: gender || null,
      roles_id: roleId,
      branch_id: branchId,
      yearly_leave_allowance,
    };

    if (pwd) {
      payload.passwordHash = await bcrypt.hash(pwd, 10);
    }

    const changes = await userModel.updateUser(id, payload);
    if (!changes) return res.status(404).json({ error: 'User not found.' });

    const updated = await userModel.getUserById(id);

    return res.json({
      success: true,
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        mobile: updated.number,
        gender: updated.gender,
        roles_id: updated.roles_id,
        branch_id: updated.branch_id,
        yearly_leave_allowance: updated.yearly_leave_allowance,
        status_id: updated.status_id === null || updated.status_id === undefined ? 1 : Number(updated.status_id),
      },
    });
  } catch {
    return res.status(500).json({ error: 'Server error.' });
  }
};
