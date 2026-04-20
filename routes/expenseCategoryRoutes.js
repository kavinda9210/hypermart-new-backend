// routes/expenseCategoryRoutes.js
const express = require('express');
const router = express.Router();
const expenseCategoryController = require('../controllers/expenseCategoryController');


// GET /api/expense-categories
router.get('/', expenseCategoryController.listExpenseCategories);

// GET /api/expense-categories/:id
router.get('/:id', expenseCategoryController.getExpenseCategoryById);

// POST /api/expense-categories
router.post('/', expenseCategoryController.createExpenseCategory);

// PUT /api/expense-categories/:id
router.put('/:id', expenseCategoryController.updateExpenseCategoryById);

// DELETE /api/expense-categories/:id
router.delete('/:id', expenseCategoryController.deleteExpenseCategoryById);

module.exports = router;
