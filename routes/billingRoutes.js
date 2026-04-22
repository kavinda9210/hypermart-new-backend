// routes/billingRoutes.js

const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');

// Import your existing auth middleware (requireAuth)
const { requireAuth } = require('../middleware/authMiddleware');

// Apply authentication to all billing routes
router.use(requireAuth);

// Search items for billing
router.get('/search-items', billingController.searchItems);

// List items for billing right panel (when no search term)
router.get('/items', billingController.listItems);

module.exports = router;