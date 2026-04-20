// routes/expenseCategoryRoutes.js
const express = require('express');
const router = express.Router();
const expenseCategoryController = require('../controllers/expenseCategoryController');

// GET /api/expense-categories
router.get('/', expenseCategoryController.listExpenseCategories);

module.exports = router;
