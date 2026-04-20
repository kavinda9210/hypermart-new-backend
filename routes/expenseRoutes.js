const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');


// POST /api/expenses
router.post('/', expenseController.createExpense);

// GET /api/expenses/:id
router.get('/:id', expenseController.getExpenseById);


// PUT /api/expenses/:id
router.put('/:id', expenseController.updateExpenseById);

// DELETE /api/expenses/:id
router.delete('/:id', expenseController.deleteExpenseById);

module.exports = router;
