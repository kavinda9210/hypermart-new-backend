const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const router = express.Router();

// Dashboard endpoints
router.get('/amounts', dashboardController.getAmounts);
router.get('/summary', dashboardController.getSummary);
router.get('/monthly-sales', dashboardController.getMonthlySales);
router.get('/stock-alert', dashboardController.getStockAlert);
router.get('/expiry-alert', dashboardController.getExpiryAlert);

module.exports = router;
