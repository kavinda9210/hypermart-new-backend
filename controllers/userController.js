/**
 * POST /api/users/roles
 * Creates a new role in the database.
 */
exports.createRole = async (req, res) => {
  const { role_name } = req.body || {};
  if (!role_name || typeof role_name !== 'string' || !role_name.trim()) {
    return res.status(400).json({ error: 'Role name is required.' });
  }
  try {
    // Check for duplicate role name
    const existingRoles = await userModel.listRoles();
    if (existingRoles.some(r => r.role_name.toLowerCase() === role_name.trim().toLowerCase())) {
      return res.status(409).json({ error: 'Role name already exists.' });
    }
    const created = await userModel.createRole({ role_name: role_name.trim() });

    // Default permissions for any newly created role.
    const DEFAULT_PERMISSION_NAMES = [
      'dashboards',
      'Access_Dashbord',
      'Access_Billing',
      'Access_Items',
      'Access_Stock',
      'Access_Sales',
      'Access_Users',
      'Access_Customers',
      'Access_Suppliers',
      'Access_Expenses',
      'Access_Finance',
      'Access_Reports',
      'Access_Settings',
      'Add new Item',
      'Add New User',
      'Add New Role',
      'Add New Permission',
      'User List View',
      'Role List View',
      'Permission List View',
      'User Status Control',
      'User Update',
      'Role Update',
      'Permission Update',
      'Add New Customers',
      'View Customer List',
      'Add New Customer Transaction',
    ];

    const defaultIds = await userModel.ensurePermissionIdsByNames(DEFAULT_PERMISSION_NAMES);
    await userModel.addMissingRolePermissions(created.id, defaultIds);

    return res.status(201).json({ role: created, default_permission_ids: defaultIds });
  } catch {
    return res.status(500).json({ error: 'Server error.' });
  }
};
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
      { expiresIn: '10h' }
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
 * GET /api/users/roles/:id
 * Returns one role (used by Salary Settings modal).
 */
exports.getRole = async (req, res) => {
  const { id } = req.params;

  try {
    const role = await userModel.getRoleWithPermissionCount(id);
    if (!role) return res.status(404).json({ error: 'Role not found.' });

    return res.json({ role });
  } catch {
    return res.status(500).json({ error: 'Server error.' });
  }
};

/**
 * PUT /api/users/roles/:id
 * Updates role salary settings (used by Salary Settings modal).
 */
exports.updateRole = async (req, res) => {
  const { id } = req.params;

  const roleName = String(req.user?.role || '').toLowerCase();
  if (!roleName.includes('admin')) {
    return res.status(403).json({ error: 'Forbidden.' });
  }

  const {
    salary_type,
    hourly_wage,
    monthly_salary,
    daily_rate,
    no_pay_rate,
    allowance,
    ot_included,
    ot_rate,
    double_ot_rate,
    triple_ot_rate,
    epf_enabled,
  } = req.body || {};

  const salaryType = String(salary_type || '').trim();
  if (salaryType !== 'hourly' && salaryType !== 'monthly') {
    return res.status(400).json({ error: 'salary_type must be hourly or monthly.' });
  }

  const hourlyWageNum = Number(hourly_wage);
  if (!Number.isFinite(hourlyWageNum) || hourlyWageNum < 0) {
    return res.status(400).json({ error: 'hourly_wage must be a non-negative number.' });
  }

  const noPayNum = Number(no_pay_rate);
  if (!Number.isFinite(noPayNum) || noPayNum < 0) {
    return res.status(400).json({ error: 'no_pay_rate must be a non-negative number.' });
  }

  const allowanceNum = Number(allowance);
  if (!Number.isFinite(allowanceNum) || allowanceNum < 0) {
    return res.status(400).json({ error: 'allowance must be a non-negative number.' });
  }

  const otIncludedNum = ot_included ? 1 : 0;
  const epfEnabledNum = epf_enabled ? 1 : 0;

  const monthlySalaryNum =
    monthly_salary === '' || monthly_salary === undefined || monthly_salary === null
      ? null
      : Number(monthly_salary);

  if (monthlySalaryNum !== null && (!Number.isFinite(monthlySalaryNum) || monthlySalaryNum < 0)) {
    return res.status(400).json({ error: 'monthly_salary must be a non-negative number.' });
  }

  const dailyRateNum =
    daily_rate === '' || daily_rate === undefined || daily_rate === null
      ? null
      : Number(daily_rate);

  if (dailyRateNum !== null && (!Number.isFinite(dailyRateNum) || dailyRateNum < 0)) {
    return res.status(400).json({ error: 'daily_rate must be a non-negative number.' });
  }

  const numOrNull = (v) => {
    if (v === '' || v === undefined || v === null) return null;
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) return NaN;
    return n;
  };

  let otRateNum = numOrNull(ot_rate);
  let doubleOtNum = numOrNull(double_ot_rate);
  let tripleOtNum = numOrNull(triple_ot_rate);

  if ([otRateNum, doubleOtNum, tripleOtNum].some((n) => Number.isNaN(n))) {
    return res.status(400).json({ error: 'OT rates must be non-negative numbers.' });
  }

  if (!otIncludedNum) {
    otRateNum = null;
    doubleOtNum = null;
    tripleOtNum = null;
  }

  if (salaryType === 'monthly' && monthlySalaryNum === null) {
    return res.status(400).json({ error: 'monthly_salary is required when salary_type is monthly.' });
  }

  try {
    const existing = await userModel.getRoleById(id);
    if (!existing) return res.status(404).json({ error: 'Role not found.' });

    const payload = {
      salary_type: salaryType,
      hourly_wage: hourlyWageNum,
      monthly_salary: monthlySalaryNum,
      daily_rate: dailyRateNum,
      no_pay_rate: noPayNum,
      allowance: allowanceNum,
      ot_included: otIncludedNum,
      ot_rate: otRateNum,
      double_ot_rate: doubleOtNum,
      triple_ot_rate: tripleOtNum,
      epf_enabled: epfEnabledNum,
    };

    const changes = await userModel.updateRole(id, payload);
    if (!changes) return res.status(404).json({ error: 'Role not found.' });

    const updated = await userModel.getRoleWithPermissionCount(id);
    return res.json({ success: true, role: updated });
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
 * GET /api/users/permissions
 * Returns all available permissions.
 */
exports.listPermissions = async (req, res) => {
  try {
    const permissions = await userModel.listPermissions();
    return res.json({ permissions });
  } catch {
    return res.status(500).json({ error: 'Server error.' });
  }
};

/**
 * POST /api/users/permissions
 * Create a new permission.
 * Body: { permissions_name: string } (also accepts { permission: string })
 */
exports.createPermission = async (req, res) => {
  const rawName =
    req.body?.permissions_name !== undefined
      ? req.body.permissions_name
      : req.body?.permission;

  const permissions_name = String(rawName || '').trim();
  if (!permissions_name) {
    return res.status(400).json({ error: 'permissions_name is required.' });
  }

  try {
    const existing = await userModel.getPermissionByNameCI(permissions_name);
    if (existing) return res.status(409).json({ error: 'Permission already exists.' });

    const created = await userModel.createPermission(permissions_name);
    return res.status(201).json({ permission: created });
  } catch {
    return res.status(500).json({ error: 'Server error.' });
  }
};

/**
 * GET /api/users/permissions/:id
 * Get a single permission.
 */
exports.getPermission = async (req, res) => {
  const { id } = req.params;
  const idNum = Number(id);
  if (!Number.isFinite(idNum)) return res.status(400).json({ error: 'Invalid permission id.' });

  try {
    const permission = await userModel.getPermissionById(idNum);
    if (!permission) return res.status(404).json({ error: 'Permission not found.' });
    return res.json({ permission });
  } catch {
    return res.status(500).json({ error: 'Server error.' });
  }
};

/**
 * PUT /api/users/permissions/:id
 * Update permission name.
 * Body: { permissions_name: string } (also accepts { permission: string })
 */
exports.updatePermission = async (req, res) => {
  const { id } = req.params;
  const idNum = Number(id);
  if (!Number.isFinite(idNum)) return res.status(400).json({ error: 'Invalid permission id.' });

  const rawName =
    req.body?.permissions_name !== undefined
      ? req.body.permissions_name
      : req.body?.permission;

  const permissions_name = String(rawName || '').trim();
  if (!permissions_name) {
    return res.status(400).json({ error: 'permissions_name is required.' });
  }

  try {
    const existing = await userModel.getPermissionById(idNum);
    if (!existing) return res.status(404).json({ error: 'Permission not found.' });

    const conflict = await userModel.getPermissionByNameCI(permissions_name);
    if (conflict && Number(conflict.id) !== idNum) {
      return res.status(409).json({ error: 'Permission already exists.' });
    }

    const updatedOk = await userModel.updatePermissionName(idNum, permissions_name);
    if (!updatedOk) return res.status(404).json({ error: 'Permission not found.' });

    const updated = await userModel.getPermissionById(idNum);
    return res.json({ success: true, permission: updated });
  } catch {
    return res.status(500).json({ error: 'Server error.' });
  }
};

/**
 * GET /api/users/roles/:id/permissions
 * Returns permission ids assigned to the role.
 */
exports.getRolePermissions = async (req, res) => {
  const { id } = req.params;

  try {
    const role = await userModel.getRoleById(id);
    if (!role) return res.status(404).json({ error: 'Role not found.' });

    const permission_ids = await userModel.getRolePermissionIds(id);
    return res.json({ role, permission_ids });
  } catch {
    return res.status(500).json({ error: 'Server error.' });
  }
};

/**
 * PUT /api/users/roles/:id/permissions
 * Replace role permissions.
 * Body: { permission_ids: number[] }
 */
exports.updateRolePermissions = async (req, res) => {
  const { id } = req.params;

  const { permission_ids, role_name } = req.body || {};
  if (permission_ids !== undefined && !Array.isArray(permission_ids)) {
    return res.status(400).json({ error: 'permission_ids must be an array.' });
  }

  try {
    const role = await userModel.getRoleById(id);
    if (!role) return res.status(404).json({ error: 'Role not found.' });

    if (role_name !== undefined) {
      const nextName = String(role_name || '').trim();
      if (!nextName) {
        return res.status(400).json({ error: 'role_name is required.' });
      }

      const existingRoles = await userModel.listRoles();
      const conflict = (existingRoles || []).some(
        (r) => Number(r.id) !== Number(id) && String(r.role_name || '').toLowerCase() === nextName.toLowerCase()
      );
      if (conflict) return res.status(409).json({ error: 'Role name already exists.' });

      await userModel.updateRoleName(id, nextName);
    }

    const allPerms = await userModel.listPermissions();
    const allowedIds = new Set((allPerms || []).map((p) => Number(p.id)));
    const ids = Array.isArray(permission_ids)
      ? Array.from(
          new Set(
            permission_ids
              .map((n) => Number(n))
              .filter((n) => Number.isFinite(n) && allowedIds.has(n))
          )
        )
      : [];

    await userModel.replaceRolePermissions(id, ids);

    const updatedPermissionIds = await userModel.getRolePermissionIds(id);
    const updatedRole = await userModel.getRoleById(id);
    return res.json({ success: true, role: updatedRole, permission_ids: updatedPermissionIds });
  } catch {
    return res.status(500).json({ error: 'Server error.' });
  }
};

/**
 * GET /api/users/me/permissions
 * Returns permissions for current user (for dashboard/menu visibility).
 */
exports.getMyPermissions = async (req, res) => {
  const userId = String(req.user?.id || '').trim();
  if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

  try {
    const permissions = await userModel.listPermissionsForUser(userId);
    return res.json({ permissions });
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
