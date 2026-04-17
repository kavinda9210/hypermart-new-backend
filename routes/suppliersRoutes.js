/*
 * routes/suppliersRoutes.js
 * Supplier endpoints mounted under /api/suppliers.
 */

const express = require('express');

const router = express.Router();

const { requireAuth } = require('../middleware/authMiddleware');
const supplierController = require('../controllers/supplierController');

// GET /api/suppliers
router.get('/', requireAuth, supplierController.listSuppliers);

// GET /api/suppliers/:id
router.get('/:id', requireAuth, supplierController.getSupplier);

// POST /api/suppliers
router.post('/', requireAuth, supplierController.createSupplier);

// PUT /api/suppliers/:id
router.put('/:id', requireAuth, supplierController.updateSupplier);

// PATCH /api/suppliers/:id/toggle-status
router.patch('/:id/toggle-status', requireAuth, supplierController.toggleSupplierStatus);

module.exports = router;
