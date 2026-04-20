const express = require('express');
const router = express.Router();
const supplierChequeController = require('../controllers/supplierChequeController');

// GET /api/supplier-cheques
router.get('/', supplierChequeController.listSupplierCheques);

module.exports = router;
