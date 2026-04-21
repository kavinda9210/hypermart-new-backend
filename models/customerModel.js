/**
 * Get a single customer by ID
 * @param {string} id
 * @returns {Promise<object|null>}
 */
exports.getCustomerById = (id) =>
  new Promise((resolve, reject) => {
    db.get(
      'SELECT *, rowid AS rowid FROM customers WHERE id = ? OR customer_id = ? OR rowid = ?',
      [id, id, id],
      (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
      }
    );
  });

/**
 * Update a customer by ID
 * @param {string} id
 * @param {object} data
 * @returns {Promise<boolean>} true if updated, false if not found
 */
exports.updateCustomer = (id, data) =>
  new Promise((resolve, reject) => {
    const now = new Date().toISOString();
    const fields = [
      'customer_name', 'is_company', 'vat_number', 'vat_document', 'contact_number', 'contact_number_2',
      'email', 'gender', 'dob', 'nic', 'cities_id', 'city_name', 'address_line_1', 'address_line_2', 'due_amount',
      'opening_balance', 'opening_balance_type', 'credit_limit', 'updated_at'
    ];
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = [
      data.customer_name,
      data.is_company ? 1 : 0,
      data.vat_number || '',
      data.vat_document || '',
      data.contact_number,
      data.contact_number_2 || '',
      data.email || '',
      data.gender || '',
      data.dob || '',
      data.nic || '',
      data.cities_id ?? null,
      data.city_name || '',
      data.address_line_1 || '',
      data.address_line_2 || '',
      data.due_amount || 0,
      data.opening_balance || 0,
      data.opening_balance_type || 'credit',
      data.credit_limit || 0,
      now
    ];
    db.run(
      `UPDATE customers SET ${setClause} WHERE id = ? OR customer_id = ? OR rowid = ?`,
      [...values, id, id, id],
      function (err) {
        if (err) return reject(err);
        resolve(this.changes > 0);
      }
    );
  });
/**
 * List all customers (basic info for list page)
 * @returns {Promise<Array>}
 */
exports.listCustomers = () =>
  new Promise((resolve, reject) => {
    db.all(
      `SELECT *, rowid AS rowid
       FROM customers
       ORDER BY created_at DESC, rowid DESC`,
      [],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      }
    );
  });
// backend/models/customerModel.js
const db = require('../config/db');

const { randomUUID } = require('crypto');

/**
 * Create a new customer.
 * @param {object} data
 * @returns {Promise<number>} id of new customer
 */
exports.createCustomer = (data) =>
  new Promise((resolve, reject) => {
    const now = new Date().toISOString();
    const id = (data && typeof data.id === 'string' && data.id.trim()) ? data.id.trim() : randomUUID();
    db.run(
      `INSERT INTO customers (
        id, customer_name, is_company, vat_number, vat_document, contact_number, contact_number_2, email, gender, dob, nic, cities_id, city_name, address_line_1, address_line_2, due_amount, opening_balance, opening_balance_type, credit_limit, status_id, user_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
      [
        id,
        data.customer_name,
        data.is_company ? 1 : 0,
        data.vat_number || '',
        data.vat_document || '',
        data.contact_number,
        data.contact_number_2 || '',
        data.email || '',
        data.gender || '',
        data.dob || '',
        data.nic || '',
        data.cities_id ?? null,
        data.city_name || '',
        data.address_line_1 || '',
        data.address_line_2 || '',
        data.due_amount || 0,
        data.opening_balance || 0,
        data.opening_balance_type || 'credit',
        data.credit_limit || 0,
        data.status_id ?? 1,
        data.user_id ?? null,
        now,
        now
      ],
      function (err) {
        if (err) return reject(err);
        resolve(id);
      }
    );
  });

/**
 * Get customer transaction history
 * @param {string} customerId
 * @param {Object} filters - date_from, date_to, transaction_type
 * @returns {Promise<Object>} transactions and summary
 */
exports.getCustomerTransactions = (customerId, filters = {}) =>
  new Promise((resolve, reject) => {
    const { date_from, date_to, transaction_type } = filters;
    let query = `
      SELECT 
        ct.id,
        ct.amount,
        ct.type,
        ct.source_type,
        ct.source_id,
        ct.transaction_date,
        ct.reference_number,
        ct.description,
        ct.performed_by,
        ct.created_at,
        CASE 
          WHEN ct.source_type = 'customer_invoice' THEN 'invoice'
          WHEN ct.source_type = 'customer_deposit' THEN 'deposit'
          WHEN ct.source_type = 'cheque' THEN 'cheque'
          WHEN ct.source_type = 'oil_sale' THEN 'oil_sale'
          ELSE ct.source_type
        END as transaction_type,
        ci.invoice_code,
        ci.payment_status as invoice_payment_status,
        ch.cheque_number,
        ch.status as cheque_status
      FROM customer_transactions ct
      LEFT JOIN customer_invoices ci ON ct.source_type = 'customer_invoice' AND ct.source_id = ci.id
      LEFT JOIN cheques ch ON ct.source_type = 'cheque' AND ct.source_id = ch.id
      WHERE ct.customer_id = ?
    `;
    
    const params = [customerId];
    
    if (date_from && date_from !== '') {
      query += ` AND DATE(ct.transaction_date) >= DATE(?)`;
      params.push(date_from);
    }
    
    if (date_to && date_to !== '') {
      query += ` AND DATE(ct.transaction_date) <= DATE(?)`;
      params.push(date_to);
    }
    
    if (transaction_type && transaction_type !== '') {
      query += ` AND ct.source_type = ?`;
      params.push(transaction_type);
    }
    
    query += ` ORDER BY ct.transaction_date DESC, ct.created_at DESC`;
    
    db.all(query, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });

/**
 * Get customer transaction summary
 * @param {string} customerId
 * @param {Object} filters - date_from, date_to
 * @returns {Promise<Object>} summary totals
 */
exports.getCustomerTransactionSummary = (customerId, filters = {}) =>
  new Promise((resolve, reject) => {
    const { date_from, date_to } = filters;
    let query = `
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END), 0) as total_debits,
        COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END), 0) as total_credits,
        COUNT(CASE WHEN type = 'debit' THEN 1 END) as debit_count,
        COUNT(CASE WHEN type = 'credit' THEN 1 END) as credit_count,
        COALESCE(SUM(CASE WHEN source_type = 'customer_invoice' THEN amount ELSE 0 END), 0) as invoice_total,
        COUNT(CASE WHEN source_type = 'customer_invoice' THEN 1 END) as invoice_count,
        COALESCE(SUM(CASE WHEN source_type = 'customer_deposit' THEN amount ELSE 0 END), 0) as deposit_total,
        COUNT(CASE WHEN source_type = 'customer_deposit' THEN 1 END) as deposit_count,
        COALESCE(SUM(CASE WHEN source_type = 'cheque' THEN amount ELSE 0 END), 0) as cheque_total,
        COUNT(CASE WHEN source_type = 'cheque' THEN 1 END) as cheque_count,
        COALESCE(SUM(CASE WHEN source_type = 'oil_sale' THEN amount ELSE 0 END), 0) as oil_sale_total,
        COUNT(CASE WHEN source_type = 'oil_sale' THEN 1 END) as oil_sale_count
      FROM customer_transactions
      WHERE customer_id = ?
    `;
    
    const params = [customerId];
    
    if (date_from && date_from !== '') {
      query += ` AND DATE(transaction_date) >= DATE(?)`;
      params.push(date_from);
    }
    
    if (date_to && date_to !== '') {
      query += ` AND DATE(transaction_date) <= DATE(?)`;
      params.push(date_to);
    }
    
    db.get(query, params, (err, row) => {
      if (err) return reject(err);
      resolve(row || {
        total_debits: 0,
        total_credits: 0,
        debit_count: 0,
        credit_count: 0,
        invoice_total: 0,
        invoice_count: 0,
        deposit_total: 0,
        deposit_count: 0,
        cheque_total: 0,
        cheque_count: 0,
        oil_sale_total: 0,
        oil_sale_count: 0
      });
    });
  });

/**
 * Get single customer with basic info for transaction page
 * @param {string} id
 * @returns {Promise<object|null>}
 */
exports.getCustomerBasicInfo = (id) =>
  new Promise((resolve, reject) => {
    db.get(
      `SELECT id, customer_name, customer_code, contact_number, due_amount, current_balance, opening_balance, opening_balance_type, credit_limit
       FROM customers 
       WHERE id = ? OR customer_id = ? OR rowid = ?`,
      [id, id, id],
      (err, row) => {
        if (err) return reject(err);
        resolve(row || null);
      }
    );
  });

/**
 * Get transaction by ID with customer verification
 * @param {number} transactionId
 * @param {string} customerId
 * @returns {Promise<object|null>}
 */
exports.getTransactionById = (transactionId, customerId) =>
  new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM customer_transactions 
       WHERE id = ? AND customer_id = ?`,
      [transactionId, customerId],
      (err, row) => {
        if (err) return reject(err);
        resolve(row || null);
      }
    );
  });

/**
 * Get invoice details by invoice ID
 * @param {number} invoiceId
 * @returns {Promise<object|null>}
 */
exports.getInvoiceDetails = (invoiceId) =>
  new Promise((resolve, reject) => {
    db.get(
      `SELECT ci.*, 
              s.sales_code,
              GROUP_CONCAT(DISTINCT si.item_id) as item_ids
       FROM customer_invoices ci
       LEFT JOIN sales s ON ci.sales_code = s.sales_code
       LEFT JOIN sales_items si ON s.id = si.sales_id
       WHERE ci.id = ?
       GROUP BY ci.id`,
      [invoiceId],
      (err, row) => {
        if (err) return reject(err);
        resolve(row || null);
      }
    );
  });

/**
 * Get cheque details by cheque ID
 * @param {number} chequeId
 * @returns {Promise<object|null>}
 */
exports.getChequeDetails = (chequeId) =>
  new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM cheques WHERE id = ?`,
      [chequeId],
      (err, row) => {
        if (err) return reject(err);
        resolve(row || null);
      }
    );
  });
