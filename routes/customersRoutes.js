
// backend/routes/customersRoutes.js
const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { requirePermission } = require('../middleware/permissionMiddleware');
const { requireAuth } = require('../middleware/authMiddleware');


// GET /api/customers/:id/balance-transaction-log - Get customer balance transaction log

router.get('/:id/balance-transaction-log', requireAuth, requirePermission('View Customer List'), customerController.getCustomerBalanceTransactionLog);
// GET /api/customers/:id/balance-transaction-log - Get customer balance transaction log
router.get('/:id/balance-transaction-log', requireAuth, requirePermission('View Customer List'), customerController.getCustomerBalanceTransactionLog);

// Test route - MUST be before the /:id route
router.get('/test', (req, res) => {
  res.json({ message: 'Customers route is working!' });
});

// GET /api/customers/sources - Get available sources (MUST BE BEFORE /:id route)
router.get('/sources', requireAuth, customerController.getSources);

// GET /api/customers - List customers
router.get('/', requireAuth, requirePermission('View Customer List'), customerController.listCustomers);

// POST /api/customers - Add new customer
router.post('/', requireAuth, requirePermission('Add New Customers'), customerController.createCustomer);

// GET /api/customers/vehicles/:customerId - Get customer vehicles (BEFORE /:id)
router.get('/vehicles/:customerId', requireAuth, customerController.getCustomerVehicles);

// GET /api/customers/:id/transactions - Get customer transactions with filters
router.get('/:id/transactions', requireAuth, requirePermission('View Customer List'), customerController.getCustomerTransactions);

// GET /api/customers/:id/transaction-detail/:transactionId - Get single transaction details
router.get('/:id/transaction-detail/:transactionId', requireAuth, requirePermission('View Customer List'), customerController.getTransactionDetail);

// GET /api/customers/transactions - Get transactions for all customers (MUST BE BEFORE /:id route)
router.get('/transactions', requireAuth, requirePermission('View Customer List'), customerController.getAllCustomerTransactions);

// GET /api/customers/:id - Get single customer (MUST BE LAST)
router.get('/:id', requireAuth, requirePermission('View Customer List'), customerController.getCustomerById);

// PUT /api/customers/:id - Update customer
router.put('/:id', requireAuth, requirePermission('View Customer List'), customerController.updateCustomer);

// POST /api/customers/transactions - Create new transaction
router.post('/transactions', requireAuth, requirePermission('Add New Customer Transaction'), customerController.createTransaction);

module.exports = router;