const ExpenseList = require('../models/expenseListModel');

exports.listExpenses = async (req, res) => {
  try {
    const { search = '', limit = 30, offset = 0 } = req.query;
    const result = await ExpenseList.findAll({ search, limit, offset });
    res.json({ expenses: result.expenses, totalCount: result.totalCount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch expenses', details: err.message });
  }
};
