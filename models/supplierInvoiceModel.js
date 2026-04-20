/*
 * models/supplierInvoiceModel.js
 * Data-access layer for supplier_invoices table.
 */

const db = require('../config/db');

exports.listSupplierInvoices = ({
  supplierId = null,
  search = '',
  paymentStatus = '',
  transactionType = '',
  dateFrom = '',
  dateTo = '',
  minAmount = null,
  maxAmount = null,
  limit = 30,
  offset = 0,
} = {}) => new Promise((resolve, reject) => {
  let where = [];
  let params = [];

  if (supplierId) {
    where.push('supplier_id = ?');
    params.push(supplierId);
  }
  if (search) {
    where.push('(reference_number LIKE ? OR invoice_code LIKE ? OR description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (paymentStatus) {
    where.push('payment_status = ?');
    params.push(paymentStatus);
  }
  if (transactionType) {
    where.push('transaction_type = ?');
    params.push(transactionType);
  }
  if (dateFrom) {
    where.push('date(created_at) >= date(?)');
    params.push(dateFrom);
  }
  if (dateTo) {
    where.push('date(created_at) <= date(?)');
    params.push(dateTo);
  }
  if (minAmount !== null && minAmount !== '') {
    where.push('amount >= ?');
    params.push(Number(minAmount));
  }
  if (maxAmount !== null && maxAmount !== '') {
    where.push('amount <= ?');
    params.push(Number(maxAmount));
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  db.all(
    `SELECT * FROM supplier_invoices ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset],
    (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    }
  );
});

exports.countSupplierInvoices = (filters = {}) => new Promise((resolve, reject) => {
  let where = [];
  let params = [];
  const { supplierId, search, paymentStatus, transactionType, dateFrom, dateTo, minAmount, maxAmount } = filters;

  if (supplierId) {
    where.push('supplier_id = ?');
    params.push(supplierId);
  }
  if (search) {
    where.push('(reference_number LIKE ? OR invoice_code LIKE ? OR description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (paymentStatus) {
    where.push('payment_status = ?');
    params.push(paymentStatus);
  }
  if (transactionType) {
    where.push('transaction_type = ?');
    params.push(transactionType);
  }
  if (dateFrom) {
    where.push('date(created_at) >= date(?)');
    params.push(dateFrom);
  }
  if (dateTo) {
    where.push('date(created_at) <= date(?)');
    params.push(dateTo);
  }
  if (minAmount !== null && minAmount !== '') {
    where.push('amount >= ?');
    params.push(Number(minAmount));
  }
  if (maxAmount !== null && maxAmount !== '') {
    where.push('amount <= ?');
    params.push(Number(maxAmount));
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  db.get(
    `SELECT COUNT(*) as count FROM supplier_invoices ${whereClause}`,
    params,
    (err, row) => {
      if (err) return reject(err);
      resolve(Number(row?.count) || 0);
    }
  );
});

exports.getSupplierInvoiceById = (id) => new Promise((resolve, reject) => {
  db.get('SELECT * FROM supplier_invoices WHERE id = ?', [id], (err, row) => {
    if (err) return reject(err);
    resolve(row || null);
  });
});
