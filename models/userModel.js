/*
 * models/userModel.js
 * Data-access layer for users/roles tables.
 */

// Import the shared SQLite DB connection.
const db = require('../config/db');

/**
 * Get a user row by email.
 * @param {string} email
 * @returns {Promise<object|null>}
 */
exports.getUserByEmail = (email) =>
  new Promise((resolve, reject) => {
    // Query a single user by email.
    db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });

/**
 * Get a user row by mobile/number.
 * @param {string} mobile
 * @returns {Promise<object|null>}
 */
exports.getUserByMobile = (mobile) =>
  new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE number = ?', [mobile], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });

/**
 * Get a role row by id.
 * @param {number|string} id
 * @returns {Promise<object|null>}
 */
exports.getRoleById = (id) =>
  new Promise((resolve, reject) => {
    // Query a single role by primary key.
    db.get('SELECT * FROM roles WHERE id = ?', [id], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });

/**
 * Get a user row by id.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
exports.getUserById = (id) =>
  new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });

/**
 * List users with display fields used by the UI.
 * @returns {Promise<Array<{id:string,name:string,email:string,role:string|null,mobile:string|null,gender:string|null,branch:string|null,status:string|null}>>}
 */
exports.listUsers = () =>
  new Promise((resolve, reject) => {
    // Join related tables to get friendly names for role/branch.
    db.all(
      `
      SELECT
        u.id,
        u.name,
        u.email,
        r.role_name AS role,
        u.number AS mobile,
        u.gender,
        b.name AS branch,
        COALESCE(u.status_id, 1) AS status_id,
        CASE
          WHEN COALESCE(u.status_id, 1) = 1 THEN 'Active'
          ELSE 'Inactive'
        END AS status
      FROM users u
      LEFT JOIN roles r ON r.id = u.roles_id
      LEFT JOIN branches b ON b.id = u.branch_id
      ORDER BY u.name
      `,
      [],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      }
    );
  });

/**
 * List roles for dropdowns.
 * @returns {Promise<Array<{id:number, role_name:string}>>}
 */
exports.listRoles = () =>
  new Promise((resolve, reject) => {
    db.all('SELECT id, role_name FROM roles ORDER BY id', [], (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });

/**
 * List branches for dropdowns.
 * @returns {Promise<Array<{id:number, name:string}>>}
 */
exports.listBranches = () =>
  new Promise((resolve, reject) => {
    db.all('SELECT id, name FROM branches ORDER BY id', [], (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });

/**
 * Get next numeric user id as TEXT.
 * @returns {Promise<string>}
 */
const getNextUserId = () =>
  new Promise((resolve, reject) => {
    db.get(
      'SELECT COALESCE(MAX(CAST(id AS INTEGER)), 0) + 1 AS nextId FROM users',
      [],
      (err, row) => {
        if (err) return reject(err);
        resolve(String(row?.nextId ?? 1));
      }
    );
  });

/**
 * Create a new user.
 * @param {{name:string,email:string,mobile:string,gender?:string|null,roles_id?:number|null,branch_id?:number|null,passwordHash:string,yearly_leave_allowance?:number|null}} payload
 * @returns {Promise<{id:string,name:string,email:string,mobile:string,gender:string|null,roles_id:number|null,branch_id:number|null,yearly_leave_allowance:number|null}>}
 */
exports.createUser = async (payload) => {
  const id = await getNextUserId();
  const now = new Date().toISOString();

  const yearlyLeave =
    payload.yearly_leave_allowance === undefined || payload.yearly_leave_allowance === null
      ? 0
      : Number(payload.yearly_leave_allowance);

  await new Promise((resolve, reject) => {
    db.run(
      `
      INSERT INTO users (
        id,
        branch_id,
        name,
        email,
        number,
        password,
        yearly_leave_allowance,
        roles_id,
        status_id,
        gender,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        payload.branch_id ?? null,
        payload.name,
        payload.email,
        payload.mobile,
        payload.passwordHash,
        yearlyLeave,
        payload.roles_id ?? null,
        1,
        payload.gender ?? null,
        now,
        now,
      ],
      (err) => {
        if (err) return reject(err);
        resolve();
      }
    );
  });

  return {
    id,
    name: payload.name,
    email: payload.email,
    mobile: payload.mobile,
    gender: payload.gender ?? null,
    roles_id: payload.roles_id ?? null,
    branch_id: payload.branch_id ?? null,
    yearly_leave_allowance: yearlyLeave,
  };
};

/**
 * Update a user's active status.
 * @param {string} id
 * @param {0|1} statusId
 * @returns {Promise<number>} number of updated rows
 */
exports.updateUserStatus = (id, statusId) =>
  new Promise((resolve, reject) => {
    const now = new Date().toISOString();

    db.run(
      'UPDATE users SET status_id = ?, updated_at = ? WHERE id = ?',
      [statusId, now, id],
      function (err) {
        if (err) return reject(err);
        resolve(this.changes || 0);
      }
    );
  });

/**
 * Update a user (profile fields; optional password update).
 * @param {string} id
 * @param {{name:string,email:string,mobile:string,gender?:string|null,roles_id?:number|null,branch_id?:number|null,yearly_leave_allowance?:number|null,passwordHash?:string}} payload
 * @returns {Promise<number>} number of updated rows
 */
exports.updateUser = (id, payload) =>
  new Promise((resolve, reject) => {
    const now = new Date().toISOString();

    const yearlyLeave =
      payload.yearly_leave_allowance === undefined || payload.yearly_leave_allowance === null
        ? 0
        : Number(payload.yearly_leave_allowance);

    if (payload.passwordHash) {
      db.run(
        `
        UPDATE users
        SET
          branch_id = ?,
          name = ?,
          email = ?,
          number = ?,
          password = ?,
          yearly_leave_allowance = ?,
          roles_id = ?,
          gender = ?,
          updated_at = ?
        WHERE id = ?
        `,
        [
          payload.branch_id ?? null,
          payload.name,
          payload.email,
          payload.mobile,
          payload.passwordHash,
          yearlyLeave,
          payload.roles_id ?? null,
          payload.gender ?? null,
          now,
          id,
        ],
        function (err) {
          if (err) return reject(err);
          resolve(this.changes || 0);
        }
      );
      return;
    }

    db.run(
      `
      UPDATE users
      SET
        branch_id = ?,
        name = ?,
        email = ?,
        number = ?,
        yearly_leave_allowance = ?,
        roles_id = ?,
        gender = ?,
        updated_at = ?
      WHERE id = ?
      `,
      [
        payload.branch_id ?? null,
        payload.name,
        payload.email,
        payload.mobile,
        yearlyLeave,
        payload.roles_id ?? null,
        payload.gender ?? null,
        now,
        id,
      ],
      function (err) {
        if (err) return reject(err);
        resolve(this.changes || 0);
      }
    );
  });
