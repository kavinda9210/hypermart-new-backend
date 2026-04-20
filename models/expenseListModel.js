const db = require('../config/db');

const ExpenseList = {
  async findAll({ search = '', limit = 30, offset = 0 }) {
    let sql = `SELECT e.id, e.expense_title, e.details, e.expense_date, e.amount, e.created_at, c.name as category FROM expenses e LEFT JOIN expense_categories c ON e.expense_categories_id = c.id WHERE 1=1`;
    const params = [];
    if (search) {
      sql += ` AND (e.expense_title LIKE ? OR e.details LIKE ? OR c.name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    sql += ` ORDER BY e.created_at DESC, e.id DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));
    const rows = await new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    const countRow = await new Promise((resolve, reject) => {
      db.get(`SELECT COUNT(*) as count FROM expenses e LEFT JOIN expense_categories c ON e.expense_categories_id = c.id WHERE 1=1${search ? ' AND (e.expense_title LIKE ? OR e.details LIKE ? OR c.name LIKE ?)' : ''}`, search ? [`%${search}%`, `%${search}%`, `%${search}%`] : [], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    return { expenses: rows, totalCount: countRow ? countRow.count : 0 };
  },
};

module.exports = ExpenseList;
