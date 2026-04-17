/*
 * routes/suppliersRoutes.js
 * Supplier endpoints mounted under /api/suppliers.
 */

const express = require('express');

const router = express.Router();

const { requireAuth } = require('../middleware/authMiddleware');
const supplierController = require('../controllers/supplierController');

// POST /api/suppliers
router.post('/', requireAuth, supplierController.createSupplier);

module.exports = router;
