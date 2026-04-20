/*
 * routes/supplierInvoiceRoutes.js
 * Supplier invoice endpoints mounted under /api/supplier-invoices.
 */

const express = require('express');
const router = express.Router();

const { requireAuth } = require('../middleware/authMiddleware');
const { requireAllPermissions } = require('../middleware/permissionMiddleware');
const supplierInvoiceController = require('../controllers/supplierInvoiceController');

// GET /api/supplier-invoices
router.get(
  '/',
  requireAuth,
  requireAllPermissions(['Access_Suppliers']),
  supplierInvoiceController.listSupplierInvoices
);

// GET /api/supplier-invoices/:id
router.get(
  '/:id',
  requireAuth,
  requireAllPermissions(['Access_Suppliers']),
  supplierInvoiceController.getSupplierInvoice
);

module.exports = router;
