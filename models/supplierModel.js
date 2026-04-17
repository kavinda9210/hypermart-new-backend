/*
 * models/supplierModel.js
 * Data-access layer for suppliers table.
 */

const db = require('../config/db');

exports.getSupplierByNameAndContact = (supplierName, contactNumber) =>
  new Promise((resolve, reject) => {
    db.get(
      `
      SELECT id, supplier_name, contact_number
      FROM suppliers
      WHERE LOWER(supplier_name) = LOWER(?) AND contact_number = ?
      `,
      [supplierName, contactNumber],
      (err, row) => {
        if (err) return reject(err);
        resolve(row || null);
      }
    );
  });

exports.createSupplier = (payload) =>
  new Promise((resolve, reject) => {
    const now = new Date().toISOString();

    db.run(
      `
      INSERT INTO suppliers (
        supplier_name,
        vat_no,
        branch_id,
        contact_number,
        email,
        address,
        opening_balance,
        current_balance,
        user_id,
        status_id,
        created_at,
        updated_at,
        city_id,
        city_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        payload.supplier_name,
        payload.vat_no ?? null,
        payload.branch_id ?? null,
        payload.contact_number,
        payload.email ?? null,
        payload.address ?? null,
        payload.opening_balance,
        payload.current_balance,
        payload.user_id ?? null,
        payload.status_id ?? 1,
        now,
        now,
        payload.city_id ?? null,
        payload.city_name ?? null,
      ],
      function (err) {
        if (err) return reject(err);
        resolve({
          id: this.lastID,
          ...payload,
          created_at: now,
          updated_at: now,
        });
      }
    );
  });
