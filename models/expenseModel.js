const db = require('../config/db');

const Expense = {
  async create({ expense_title, details, expense_date, amount, expense_categories_id, user_id }) {
    const sql = `INSERT INTO expenses (expense_title, details, expense_date, amount, expense_categories_id, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`;
    const params = [expense_title, details, expense_date, amount, expense_categories_id, user_id];
    const result = await new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID });
      });
    });
    return result;
  },

  async findById(id) {
    const sql = `SELECT e.*, c.name as category FROM expenses e LEFT JOIN expense_categories c ON e.expense_categories_id = c.id WHERE e.id = ?`;
    return await new Promise((resolve, reject) => {
      db.get(sql, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  async updateById(id, { expense_title, details, expense_date, amount, expense_categories_id, user_id }) {
    const sql = `UPDATE expenses SET expense_title = ?, details = ?, expense_date = ?, amount = ?, expense_categories_id = ?, user_id = ?, updated_at = datetime('now') WHERE id = ?`;
    const params = [expense_title, details, expense_date, amount, expense_categories_id, user_id, id];
    return await new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      });
    });
  },

  async deleteById(id) {
    const sql = `DELETE FROM expenses WHERE id = ?`;
    return await new Promise((resolve, reject) => {
      db.run(sql, [id], function (err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      });
    });
  },
};

module.exports = Expense;
