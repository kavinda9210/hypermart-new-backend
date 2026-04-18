/*
 * routes/suppliersRoutes.js
 * Supplier endpoints mounted under /api/suppliers.
 */

const express = require('express');

const router = express.Router();

const { requireAuth } = require('../middleware/authMiddleware');
const { requireAllPermissions } = require('../middleware/permissionMiddleware');
const supplierController = require('../controllers/supplierController');

// GET /api/suppliers
router.get(
	'/',
	requireAuth,
	requireAllPermissions(['Access_Suppliers']),
	supplierController.listSuppliers
);

// GET /api/suppliers/:id
router.get(
	'/:id',
	requireAuth,
	requireAllPermissions(['Access_Suppliers']),
	supplierController.getSupplier
);

// POST /api/suppliers
router.post(
	'/',
	requireAuth,
	requireAllPermissions(['Access_Suppliers']),
	supplierController.createSupplier
);

// PUT /api/suppliers/:id
router.put(
	'/:id',
	requireAuth,
	requireAllPermissions(['Access_Suppliers']),
	supplierController.updateSupplier
);

// PATCH /api/suppliers/:id/toggle-status
router.patch(
	'/:id/toggle-status',
	requireAuth,
	requireAllPermissions(['Access_Suppliers']),
	supplierController.toggleSupplierStatus
);

module.exports = router;
