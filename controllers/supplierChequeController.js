const SupplierCheque = require('../models/supplierChequeModel');

exports.listSupplierCheques = async (req, res) => {
  try {
    const {
      search = '',
      cheque_number = '',
      supplier_id = '',
      bank_name = '',
      cheque_status = '',
      payment_status = '',
      date_from = '',
      date_to = '',
      clearance_date_from = '',
      clearance_date_to = '',
      min_amount = '',
      max_amount = '',
      has_replacement = '',
      limit = 30,
      offset = 0,
      vat_enabled = '',
    } = req.query;
    const result = await SupplierCheque.findAll({
      search,
      cheque_number,
      supplier_id,
      bank_name,
      cheque_status,
      payment_status,
      date_from,
      date_to,
      clearance_date_from,
      clearance_date_to,
      min_amount,
      max_amount,
      has_replacement,
      limit,
      offset,
      vat_enabled,
    });
    res.json({ cheques: result.cheques, totalCount: result.totalCount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch supplier cheques', details: err.message });
  }
};
