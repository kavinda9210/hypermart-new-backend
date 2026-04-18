// backend/models/customerModel.js
const db = require('../config/db');

/**
 * Create a new customer.
 * @param {object} data
 * @returns {Promise<number>} id of new customer
 */
exports.createCustomer = (data) =>
  new Promise((resolve, reject) => {
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO customers (
        customer_name, is_company, vat_number, vat_document, contact_number, contact_number_2, email, gender, dob, nic, city_name, address_line_1, address_line_2, due_amount, opening_balance, opening_balance_type, credit_limit, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
      [
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
        data.city_name || '',
        data.address_line_1 || '',
        data.address_line_2 || '',
        data.due_amount || 0,
        data.opening_balance || 0,
        data.opening_balance_type || 'credit',
        data.credit_limit || 0,
        now,
        now
      ],
      function (err) {
        if (err) return reject(err);
        resolve(this.lastID);
      }
    );
  });
