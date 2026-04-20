const express = require('express');
const router = express.Router();
const expenseListController = require('../controllers/expenseListController');

// GET /api/expenses-list
router.get('/', expenseListController.listExpenses);

module.exports = router;
