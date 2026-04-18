// backend/routes/customersRoutes.js
const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { requirePermission } = require('../middleware/permissionMiddleware');
const { requireAuth } = require('../middleware/authMiddleware');

// GET /api/customers - List customers (permission: View Customer List)
router.get('/', requireAuth, requirePermission('View Customer List'), customerController.listCustomers);

// POST /api/customers - Add new customer (permission: Add New Customers)
router.post('/', requireAuth, requirePermission('Add New Customers'), customerController.createCustomer);

// GET /api/customers/:id - Get single customer (permission: View Customer List)
router.get('/:id', requireAuth, requirePermission('View Customer List'), customerController.getCustomerById);

// PUT /api/customers/:id - Update customer (permission: View Customer List)
router.put('/:id', requireAuth, requirePermission('View Customer List'), customerController.updateCustomer);

module.exports = router;
