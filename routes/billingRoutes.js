// routes/billingRoutes.js

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');

// Import controller - make sure all methods exist
const billingController = require('../controllers/billingController');

// Check if controller methods exist, if not create empty functions
const safeController = {
  searchItems: billingController.searchItems || ((req, res) => res.status(501).json({ error: 'Not implemented' })),
  listItems: billingController.listItems || ((req, res) => res.status(501).json({ error: 'Not implemented' })),
  listHoldOrders: billingController.listHoldOrders || ((req, res) => res.status(501).json({ error: 'Not implemented' })),
  getHoldOrder: billingController.getHoldOrder || ((req, res) => res.status(501).json({ error: 'Not implemented' })),
  saveHoldOrder: billingController.saveHoldOrder || ((req, res) => res.status(501).json({ error: 'Not implemented' })),
  deleteHoldOrder: billingController.deleteHoldOrder || ((req, res) => res.status(501).json({ error: 'Not implemented' })),
  getPaymentSources: billingController.getPaymentSources || ((req, res) => res.status(501).json({ error: 'Not implemented' })),
  processPayment: billingController.processPayment || ((req, res) => res.status(501).json({ error: 'Not implemented' })),
  searchCustomers: billingController.searchCustomers || ((req, res) => res.status(501).json({ error: 'Not implemented' })),
  createCustomer: billingController.createCustomer || ((req, res) => res.status(501).json({ error: 'Not implemented' }))
};

// Apply authentication to all billing routes
router.use(requireAuth);

// Item routes
router.get('/search-items', safeController.searchItems);
router.get('/items', safeController.listItems);

// Hold order routes
router.get('/hold-orders', safeController.listHoldOrders);
router.get('/hold/:id', safeController.getHoldOrder);
router.post('/hold', safeController.saveHoldOrder);
router.delete('/hold/:id', safeController.deleteHoldOrder);

// Payment routes
router.get('/payment-sources', safeController.getPaymentSources);
router.post('/process-payment', safeController.processPayment);

// Customer routes for billing
router.get('/customers/search', safeController.searchCustomers);
router.post('/customers', safeController.createCustomer);

module.exports = router;