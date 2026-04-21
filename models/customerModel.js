/**
 * Get all balance-affecting transactions for a customer
 * @param {string} customerId
 * @returns {Promise<Array>} transaction rows
 */
exports.getCustomerBalanceTransactions = (customerId) =>
  new Promise((resolve, reject) => {
    // This query selects all transactions that affect the customer's balance
    const query = `
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
        ct.created_at
      FROM customer_transactions ct
      WHERE ct.customer_id = ?
      ORDER BY ct.transaction_date DESC, ct.created_at DESC
    `;
    db.all(query, [customerId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
const db = require('../config/db');
const { randomUUID } = require('crypto')

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
 * Get transaction history for ALL customers (with filters)
 * @param {Object} filters - date_from, date_to, transaction_type
 * @returns {Promise<Array>} transaction rows
 */
exports.getAllCustomerTransactions = (filters = {}) =>
  new Promise((resolve, reject) => {
    const { date_from, date_to, transaction_type } = filters;

    let query = `
      SELECT 
        ct.id,
        ct.customer_id,
        c.customer_name,
        c.customer_code,
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
      LEFT JOIN customers c ON c.id = ct.customer_id OR c.customer_id = ct.customer_id
      LEFT JOIN customer_invoices ci ON ct.source_type = 'customer_invoice' AND ct.source_id = ci.id
      LEFT JOIN cheques ch ON ct.source_type = 'cheque' AND ct.source_id = ch.id
      WHERE 1 = 1
    `;

    const params = [];

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
 * Get transaction summary for ALL customers
 * @param {Object} filters - date_from, date_to
 * @returns {Promise<Object>} summary totals
 */
exports.getAllCustomerTransactionSummary = (filters = {}) =>
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
      WHERE 1 = 1
    `;

    const params = [];

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

/**
 * Create a new customer transaction
 * @param {Object} data - Transaction data
 * @returns {Promise<number>} Transaction ID
 */
exports.createCustomerTransaction = (data) =>
  new Promise((resolve, reject) => {
    const now = new Date().toISOString();
    const {
      customer_id,
      type, // 'debit' or 'credit'
      amount,
      source_type,
      source_id,
      split_data,
      transaction_date,
      reference_number,
      description,
      performed_by,
      bank_slip_path, // Store the relative path
      branch_id
    } = data;

    db.run(
      `INSERT INTO customer_transactions (
        customer_id, amount, type, source_type, source_id,
        split_data, transaction_date, reference_number, description, 
        performed_by, bank_slip, branch_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customer_id,
        amount,
        type,
        source_type,
        source_id || null,
        split_data ? JSON.stringify(split_data) : null,
        transaction_date,
        reference_number || null,
        description || null,
        performed_by,
        bank_slip_path || null, // Store the relative path
        branch_id || null,
        now,
        now
      ],
      function(err) {
        if (err) return reject(err);
        
        // After creating transaction, update customer's current balance
        const balanceChange = type === 'credit' ? amount : -amount;
        exports.updateCustomerBalance(customer_id, balanceChange)
          .then(() => resolve(this.lastID))
          .catch(reject);
      }
    );
  });

// backend/models/customerModel.js

/**
 * Get available sources (cash, bank accounts, etc.) for dropdown
 * @returns {Promise<Object>}
 */
exports.getAvailableSources = () =>
  new Promise((resolve, reject) => {
    const sources = {
      systemCash: [],
      bankAccounts: [],
      paymentMachines: [],
      cheques: []
    };

    // Get cash book balance
    db.get(`SELECT amount FROM sys_cash WHERE name = 'cashbook'`, (err, row) => {
      if (err) {
        console.error('Error fetching cashbook:', err);
      } else if (row) {
        sources.systemCash.push({
          id: 'cashbook',
          name: 'Cash Book',
          balance: row.amount || 0
        });
      }

      // Get petty cash balance
      db.get(`SELECT amount FROM sys_cash WHERE name = 'petty_cash'`, (err, row) => {
        if (err) {
          console.error('Error fetching petty cash:', err);
        } else if (row) {
          sources.systemCash.push({
            id: 'petty_cash',
            name: 'Petty Cash',
            balance: row.amount || 0
          });
        }

        // Get bank accounts
        db.all(
          `SELECT ba.id, ba.account_name, ba.account_number, ba.current_balance, b.bank_name
           FROM bank_accounts ba
           LEFT JOIN banks b ON ba.bank_id = b.id
           WHERE ba.is_active = 1`,
          (err, rows) => {
            if (err) {
              console.error('Error fetching bank accounts:', err);
            } else if (rows && rows.length > 0) {
              sources.bankAccounts = rows.map(row => ({
                id: `bank_${row.id}`,
                name: `${row.bank_name || ''} ${row.account_name} (${row.account_number})`,
                balance: row.current_balance || 0,
                account_id: row.id
              }));
            }

            // Get payment machines
            db.all(
              `SELECT pm.id, pm.name, pm.description, ba.current_balance
               FROM payment_machines pm
               LEFT JOIN bank_accounts ba ON pm.bank_account_id = ba.id
               WHERE pm.is_active = 1`,
              (err, rows) => {
                if (err) {
                  console.error('Error fetching payment machines:', err);
                } else if (rows && rows.length > 0) {
                  sources.paymentMachines = rows.map(row => ({
                    id: `machine_${row.id}`,
                    name: row.name,
                    balance: row.current_balance || 0,
                    machine_id: row.id
                  }));
                }

                // Get available cheques
                db.all(
                  `SELECT id, cheque_number, bank_name, amount, used_amount, status
                   FROM cheques 
                   WHERE status = 'pending' 
                   AND (amount - IFNULL(used_amount, 0)) > 0
                   ORDER BY cheque_date ASC`,
                  (err, rows) => {
                    if (err) {
                      console.error('Error fetching cheques:', err);
                    } else if (rows && rows.length > 0) {
                      sources.cheques = rows.map(row => ({
                        id: `cheque_${row.id}`,
                        name: `${row.cheque_number} - ${row.bank_name}`,
                        balance: row.amount - (row.used_amount || 0),
                        cheque_id: row.id,
                        cheque_number: row.cheque_number
                      }));
                    }
                    resolve(sources);
                  }
                );
              }
            );
          }
        );
      });
    });
  });

/**
 * Update source balance (cash, bank, cheque) when transaction is created
 * @param {string} sourceType 
 * @param {string} sourceId 
 * @param {number} amount 
 * @param {string} direction - 'increase' or 'decrease'
 */
exports.updateSourceBalance = (sourceType, sourceId, amount, direction) =>
  new Promise((resolve, reject) => {
    const change = direction === 'increase' ? amount : -amount;
    
    if (sourceType === 'cashbook') {
      db.run(
        `UPDATE sys_cash SET amount = amount + ?, updated_at = ? WHERE name = 'cashbook'`,
        [change, new Date().toISOString()],
        function(err) {
          if (err) return reject(err);
          resolve(this.changes > 0);
        }
      );
    } else if (sourceType === 'petty_cash') {
      db.run(
        `UPDATE sys_cash SET amount = amount + ?, updated_at = ? WHERE name = 'petty_cash'`,
        [change, new Date().toISOString()],
        function(err) {
          if (err) return reject(err);
          resolve(this.changes > 0);
        }
      );
    } else if (sourceType === 'bank' && sourceId) {
      db.run(
        `UPDATE bank_accounts SET current_balance = current_balance + ?, updated_at = ? WHERE id = ?`,
        [change, new Date().toISOString(), sourceId],
        function(err) {
          if (err) return reject(err);
          resolve(this.changes > 0);
        }
      );
    } else if (sourceType === 'machine' && sourceId) {
      // Update payment machine linked bank account
      db.run(
        `UPDATE bank_accounts 
         SET current_balance = current_balance + ?, updated_at = ?
         WHERE id = (SELECT bank_account_id FROM payment_machines WHERE id = ?)`,
        [change, new Date().toISOString(), sourceId],
        function(err) {
          if (err) return reject(err);
          resolve(this.changes > 0);
        }
      );
    } else if (sourceType === 'cheque' && sourceId) {
      db.run(
        `UPDATE cheques 
         SET used_amount = IFNULL(used_amount, 0) + ?, 
             status = CASE WHEN (amount - (IFNULL(used_amount, 0) + ?)) <= 0 THEN 'fully_used' ELSE status END,
             updated_at = ?
         WHERE id = ?`,
        [amount, amount, new Date().toISOString(), sourceId],
        function(err) {
          if (err) return reject(err);
          resolve(this.changes > 0);
        }
      );
    } else {
      resolve(false);
    }
  });

  /**
 * Update customer's current balance
 * @param {string} customerId 
 * @param {number} amountChange - Positive for credit, negative for debit
 * @returns {Promise<boolean>}
 */
exports.updateCustomerBalance = (customerId, amountChange) =>
  new Promise((resolve, reject) => {
    db.run(
      `UPDATE customers 
       SET current_balance = COALESCE(current_balance, 0) + ?,
           updated_at = ?
       WHERE id = ? OR customer_id = ?`,
      [amountChange, new Date().toISOString(), customerId, customerId],
      function(err) {
        if (err) return reject(err);
        resolve(this.changes > 0);
      }
    );
  });

/**
 * Get customer's current balance
 * @param {string} customerId 
 * @returns {Promise<Object>}
 */
exports.getCustomerBalance = (customerId) =>
  new Promise((resolve, reject) => {
    db.get(
      `SELECT COALESCE(current_balance, 0) as current_balance, COALESCE(due_amount, 0) as due_amount 
       FROM customers WHERE id = ? OR customer_id = ?`,
      [customerId, customerId],
      (err, row) => {
        if (err) return reject(err);
        resolve(row || { current_balance: 0, due_amount: 0 });
      }
    );
  });

/**
 * Create transaction log entry
 * @param {Object} data 
 * @returns {Promise<number>}
 */
exports.createTransactionLog = (data) =>
  new Promise((resolve, reject) => {
    const now = new Date().toISOString();
    const {
      customer_id,
      action_type,
      related_id,
      related_type,
      amount,
      debit_credit,
      description,
      performed_by
    } = data;

    db.run(
      `INSERT INTO customer_transaction_logs (
        customer_id, action_type, related_id, related_type, 
        amount, debit_credit, description, performed_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customer_id,
        action_type,
        related_id,
        related_type,
        amount,
        debit_credit,
        description,
        performed_by,
        now,
        now
      ],
      function(err) {
        if (err) return reject(err);
        resolve(this.lastID);
      }
    );
  });

/**
 * Create balance log entry
 * @param {Object} data 
 * @returns {Promise<number>}
 */
exports.createBalanceLog = (data) =>
  new Promise((resolve, reject) => {
    const now = new Date().toISOString();
    const {
      customer_id,
      amount,
      direction,
      balance_before,
      balance_after,
      reason,
      source_type,
      source_id,
      reference,
      notes,
      performed_by,
      branch_id
    } = data;

    db.run(
      `INSERT INTO customer_balance_logs (
        customer_id, amount, direction, balance_before, balance_after,
        reason, source_type, source_id, reference, notes, performed_by, 
        branch_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customer_id,
        amount,
        direction,
        balance_before,
        balance_after,
        reason,
        source_type,
        source_id,
        reference,
        notes,
        performed_by,
        branch_id,
        now,
        now
      ],
      function(err) {
        if (err) return reject(err);
        resolve(this.lastID);
      }
    );
  });

/**
 * Get all balance-affecting transactions for a customer
 * @param {string} customerId
 * @returns {Promise<Array>} transaction rows
 */
exports.getCustomerBalanceTransactions = (customerId) =>
  new Promise((resolve, reject) => {
    const query = `
      SELECT 
        ct.id,
        ct.amount,
        ct.type,
        ct.source_type,
        ct.transaction_date,
        ct.reference_number,
        ct.description,
        ct.performed_by,
        ct.created_at,
        CASE 
          WHEN ct.source_type = 'customer_invoice' THEN ci.invoice_code
          ELSE NULL
        END as invoice_code,
        CASE 
          WHEN ct.source_type = 'cheque' THEN ch.cheque_number
          ELSE NULL
        END as cheque_number,
        CASE 
          WHEN ct.source_type = 'cheque' THEN ch.status
          ELSE NULL
        END as cheque_status
      FROM customer_transactions ct
      LEFT JOIN customer_invoices ci ON ct.source_type = 'customer_invoice' AND ct.source_id = ci.id
      LEFT JOIN cheques ch ON ct.source_type = 'cheque' AND ct.source_id = ch.id
      WHERE ct.customer_id = ?
      ORDER BY ct.transaction_date DESC, ct.created_at DESC
    `;
    db.all(query, [customerId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });