// controllers/expenseCategoryController.js
const db = require('../config/db');

// GET /api/expense-categories
exports.listExpenseCategories = (req, res) => {
  db.all('SELECT id, name FROM expense_categories ORDER BY id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch categories', details: err.message });
    res.json(rows || []);
  });
};
