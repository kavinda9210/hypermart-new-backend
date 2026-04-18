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
