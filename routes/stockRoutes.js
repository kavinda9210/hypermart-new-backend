/*
 * routes/stockRoutes.js
 * Stock endpoints mounted under /api/stock.
 */

const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireAllPermissions } = require('../middleware/permissionMiddleware');
const stockController = require('../controllers/stockController');

const router = express.Router();

// GET /api/stock
router.get('/', requireAuth, requireAllPermissions(['Access_Stock']), stockController.listStock);

// GET /api/stock/:id/updates
router.get(
	'/:id/updates',
	requireAuth,
	requireAllPermissions(['Access_Stock']),
	stockController.listStockUpdatesForItem
);

// POST /api/stock/:id/updates
router.post(
	'/:id/updates',
	requireAuth,
	requireAllPermissions(['Access_Stock']),
	stockController.createStockUpdate
);

// POST /api/stock/:itemId/updates/:updateId/remove
router.post(
	'/:itemId/updates/:updateId/remove',
	requireAuth,
	requireAllPermissions(['Access_Stock']),
	stockController.removeStockFromBatch
);

// PATCH /api/stock/:id
router.patch(
	'/:id',
	requireAuth,
	requireAllPermissions(['Access_Stock']),
	stockController.updateStock
);

module.exports = router;
