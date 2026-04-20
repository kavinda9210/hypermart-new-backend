exports.getExpenseById = async (req, res) => {
  try {
    const id = req.params.id;
    const expense = await Expense.findById(id);
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    res.json(expense);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch expense', details: err.message });
  }
};

exports.updateExpenseById = async (req, res) => {
  try {
    const id = req.params.id;
    const { expense_title, details, expense_date, amount, expense_categories_id, user_id } = req.body;
    if (!expense_title || !details || !expense_date || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const updated = await Expense.updateById(id, { expense_title, details, expense_date, amount, expense_categories_id, user_id });
    if (!updated) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update expense', details: err.message });
  }
};
const Expense = require('../models/expenseModel');

exports.deleteExpenseById = async (req, res) => {
  try {
    const id = req.params.id;
    const deleted = await Expense.deleteById(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete expense', details: err.message });
  }
};

exports.createExpense = async (req, res) => {
  try {
    const { expense_title, details, expense_date, amount, expense_categories_id, user_id } = req.body;
    if (!expense_title || !details || !expense_date || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const result = await Expense.create({ expense_title, details, expense_date, amount, expense_categories_id, user_id });
    res.status(201).json({ id: result.id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add expense', details: err.message });
  }
};
