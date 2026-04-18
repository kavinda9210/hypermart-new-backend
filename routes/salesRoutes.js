
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const salesController = require('../controllers/salesController');

// GET /api/sales/:saleId/details
router.get('/:saleId/details', requireAuth, salesController.getSaleDetails);

// GET /api/sales
router.get('/', requireAuth, salesController.listSales);

// GET /api/sales/returns
router.get('/returns', requireAuth, salesController.listSalesReturns);

// GET /api/sales/due-amount
router.get('/due-amount', requireAuth, salesController.listDueAmounts);

module.exports = router;
