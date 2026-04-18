const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const salesController = require('../controllers/salesController');

// GET /api/sales
router.get('/', requireAuth, salesController.listSales);

module.exports = router;
