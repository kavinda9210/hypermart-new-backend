/*
 * routes/stockRoutes.js
 * Stock endpoints mounted under /api/stock.
 */

const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const stockController = require('../controllers/stockController');

const router = express.Router();

// GET /api/stock
router.get('/', requireAuth, stockController.listStock);

// GET /api/stock/:id/updates
router.get('/:id/updates', requireAuth, stockController.listStockUpdatesForItem);

// POST /api/stock/:id/updates
router.post('/:id/updates', requireAuth, stockController.createStockUpdate);

// PATCH /api/stock/:id
router.patch('/:id', requireAuth, stockController.updateStock);

module.exports = router;
