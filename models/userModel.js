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
