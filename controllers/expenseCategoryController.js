// controllers/expenseCategoryController.js
const db = require('../config/db');

// GET /api/expense-categories
exports.listExpenseCategories = (req, res) => {
  db.all('SELECT id, name FROM expense_categories ORDER BY id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch categories', details: err.message });
    res.json(rows || []);
  });
};

// POST /api/expense-categories
exports.createExpenseCategory = (req, res) => {
  const { name, user_id } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Category name is required' });
  }
  const now = new Date().toISOString();
  db.run(
    'INSERT INTO expense_categories (name, user_id, created_at, updated_at) VALUES (?, ?, ?, ?)',
    [name, user_id || null, now, now],
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to add category', details: err.message });
      res.status(201).json({ id: this.lastID, name });
    }
  );
};

// Get a category by ID
exports.getExpenseCategoryById = (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM expense_categories WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Category not found' });
    res.json(row);
  });
};

// Update a category by ID
exports.updateExpenseCategoryById = (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  db.run('UPDATE expense_categories SET name = ? WHERE id = ?', [name, id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Category not found' });
    res.json({ id, name });
  });
};

// Delete a category by ID
exports.deleteExpenseCategoryById = (req, res) => {
  const { id } = req.params;
  // Optionally: check for related expenses before deleting
  const sql = 'DELETE FROM expense_categories WHERE id = ?';
  db.run(sql, [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Category not found' });
    res.json({ success: true });
  });
};
