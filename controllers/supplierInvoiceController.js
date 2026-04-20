/*
 * controllers/supplierInvoiceController.js
 * Supplier invoice endpoints.
 */

const supplierInvoiceModel = require('../models/supplierInvoiceModel');

exports.listSupplierInvoices = async (req, res) => {
  const {
    supplier_id,
    search = '',
    payment_status = '',
    transaction_type = '',
    date_from = '',
    date_to = '',
    min_amount = '',
    max_amount = '',
    limit = 30,
    offset = 0,
  } = req.query;

  try {
    const [invoices, totalCount] = await Promise.all([
      supplierInvoiceModel.listSupplierInvoices({
        supplierId: supplier_id,
        search,
        paymentStatus: payment_status,
        transactionType: transaction_type,
        dateFrom: date_from,
        dateTo: date_to,
        minAmount: min_amount,
        maxAmount: max_amount,
        limit: Number(limit),
        offset: Number(offset),
      }),
      supplierInvoiceModel.countSupplierInvoices({
        supplierId: supplier_id,
        search,
        paymentStatus: payment_status,
        transactionType: transaction_type,
        dateFrom: date_from,
        dateTo: date_to,
        minAmount: min_amount,
        maxAmount: max_amount,
      }),
    ]);
    res.json({ invoices, totalCount });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.getSupplierInvoice = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid invoice id.' });
  }
  try {
    const invoice = await supplierInvoiceModel.getSupplierInvoiceById(id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found.' });
    res.json({ invoice });
  } catch {
    res.status(500).json({ error: 'Server error.' });
  }
};
