const db = require('../config/db');

exports.getUserByEmail = (email) =>
  new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });

exports.getRoleById = (id) =>
  new Promise((resolve, reject) => {
    db.get('SELECT * FROM roles WHERE id = ?', [id], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
