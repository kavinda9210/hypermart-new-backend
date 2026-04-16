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
 * List users with display fields used by the UI.
 * @returns {Promise<Array<{id:string,name:string,email:string,role:string|null,mobile:string|null,gender:string|null,branch:string|null,status:string|null}>>}
 */
exports.listUsers = () =>
  new Promise((resolve, reject) => {
    // Join related tables to get friendly names for role/branch/status.
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
        s.status_name AS status
      FROM users u
      LEFT JOIN roles r ON r.id = u.roles_id
      LEFT JOIN branches b ON b.id = u.branch_id
      LEFT JOIN statuses s ON s.id = u.status_id
      ORDER BY u.name
      `,
      [],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      }
    );
  });
