// backend/routes/customersRoutes.js
const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { requirePermission } = require('../middleware/permissionMiddleware');
const { requireAuth } = require('../middleware/authMiddleware');

// POST /api/customers - Add new customer (permission: Add New Customers)
router.post('/', requireAuth, requirePermission('Add New Customers'), customerController.createCustomer);

module.exports = router;
