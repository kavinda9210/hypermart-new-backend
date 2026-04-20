const express = require('express');
const router = express.Router();
const bankController = require('../controllers/bankController');

router.get('/', bankController.listBanks);
router.get('/:id', bankController.getBankById);
router.post('/', bankController.createBank);
router.put('/:id', bankController.updateBankById);
router.delete('/:id', bankController.deleteBankById);

module.exports = router;
