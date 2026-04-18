
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const {
	requireAllPermissions,
	requireAnyPermissions,
} = require('../middleware/permissionMiddleware');
const salesController = require('../controllers/salesController');

// GET /api/sales/:saleId/details
router.get(
	'/:saleId/details',
	requireAuth,
	requireAnyPermissions(['Access_Sales', 'Access_Billing']),
	salesController.getSaleDetails
);

// GET /api/sales
router.get(
	'/',
	requireAuth,
	requireAnyPermissions(['Access_Sales', 'Access_Billing']),
	salesController.listSales
);

// GET /api/sales/returns
router.get(
	'/returns',
	requireAuth,
	requireAllPermissions(['Access_Sales']),
	salesController.listSalesReturns
);

// GET /api/sales/due-amount
router.get(
	'/due-amount',
	requireAuth,
	requireAnyPermissions(['Access Due Amount', 'Access_Sales']),
	salesController.listDueAmounts
);

module.exports = router;
