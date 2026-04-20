const db = require('../config/db');

const Bank = {
  getAll: (callback) => {
    db.all('SELECT * FROM banks', [], callback);
  },
  getById: (id, callback) => {
    db.get('SELECT * FROM banks WHERE id = ?', [id], callback);
  },
  create: (data, callback) => {
    const { bank_name, bank_code, branch_name, branch_code, swift_code, address, contact_number, email, is_active } = data;
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO banks (bank_name, bank_code, branch_name, branch_code, swift_code, address, contact_number, email, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [bank_name, bank_code, branch_name, branch_code, swift_code, address, contact_number, email, is_active ?? 1, now, now],
      function (err) {
        callback(err, this ? { id: this.lastID, ...data } : null);
      }
    );
  },
  updateById: (id, data, callback) => {
    const { bank_name, bank_code, branch_name, branch_code, swift_code, address, contact_number, email, is_active } = data;
    const now = new Date().toISOString();
    db.run(
      `UPDATE banks SET bank_name=?, bank_code=?, branch_name=?, branch_code=?, swift_code=?, address=?, contact_number=?, email=?, is_active=?, updated_at=? WHERE id=?`,
      [bank_name, bank_code, branch_name, branch_code, swift_code, address, contact_number, email, is_active ?? 1, now, id],
      function (err) {
        callback(err, this ? { id, ...data } : null, this ? this.changes : 0);
      }
    );
  },
  deleteById: (id, callback) => {
    db.run('DELETE FROM banks WHERE id = ?', [id], function (err) {
      callback(err, this ? this.changes : 0);
    });
  },
};

module.exports = Bank;
