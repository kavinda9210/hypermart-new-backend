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

// PATCH /api/stock/:id
router.patch('/:id', requireAuth, stockController.updateStock);

module.exports = router;
