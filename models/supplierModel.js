// Get total count of suppliers (with optional search)
exports.countSuppliers = ({ searchTerm = '' }) =>
  new Promise((resolve, reject) => {
    const normalized = String(searchTerm || '').trim();
    const whereClause = normalized ? 'WHERE LOWER(supplier_name) LIKE LOWER(?)' : '';
    const params = normalized ? [`%${normalized}%`] : [];
    db.get(
      `SELECT COUNT(*) as count FROM suppliers ${whereClause}`,
      params,
      (err, row) => {
        if (err) return reject(err);
        resolve(Number(row?.count) || 0);
      }
    );
  });
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

exports.listSuppliers = ({ searchTerm = '', limit = 30, offset = 0 }) =>
  new Promise((resolve, reject) => {
    const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 30;
    const safeOffset = Number.isInteger(offset) && offset >= 0 ? offset : 0;
    const normalized = String(searchTerm || '').trim();

    const whereClause = normalized ? 'WHERE LOWER(supplier_name) LIKE LOWER(?)' : '';
    const params = normalized ? [`%${normalized}%`, safeLimit, safeOffset] : [safeLimit, safeOffset];

    db.all(
      `
      SELECT
        id,
        supplier_name,
        contact_number,
        email,
        address,
        city_id,
        city_name,
        vat_no,
        opening_balance,
        current_balance,
        status_id,
        created_at,
        updated_at
      FROM suppliers
      ${whereClause}
      ORDER BY id DESC
      LIMIT ? OFFSET ?
      `,
      params,
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      }
    );
  });

exports.getSupplierById = (id) =>
  new Promise((resolve, reject) => {
    db.get(
      `
      SELECT
        id,
        supplier_name,
        contact_number,
        email,
        address,
        city_id,
        city_name,
        vat_no,
        opening_balance,
        current_balance,
        status_id,
        created_at,
        updated_at
      FROM suppliers
      WHERE id = ?
      `,
      [id],
      (err, row) => {
        if (err) return reject(err);
        resolve(row || null);
      }
    );
  });

exports.updateSupplier = (id, payload) =>
  new Promise((resolve, reject) => {
    const now = new Date().toISOString();

    db.run(
      `
      UPDATE suppliers
      SET
        supplier_name = ?,
        contact_number = ?,
        email = ?,
        vat_no = ?,
        address = ?,
        city_id = ?,
        city_name = ?,
        updated_at = ?
      WHERE id = ?
      `,
      [
        payload.supplier_name,
        payload.contact_number,
        payload.email ?? null,
        payload.vat_no ?? null,
        payload.address ?? null,
        payload.city_id ?? null,
        payload.city_name ?? null,
        now,
        id,
      ],
      function (err) {
        if (err) return reject(err);
        resolve({ changes: this.changes, updated_at: now });
      }
    );
  });

exports.updateSupplierStatus = (id, statusId) =>
  new Promise((resolve, reject) => {
    const now = new Date().toISOString();

    db.run(
      `
      UPDATE suppliers
      SET status_id = ?, updated_at = ?
      WHERE id = ?
      `,
      [statusId, now, id],
      function (err) {
        if (err) return reject(err);
        resolve({ changes: this.changes, updated_at: now });
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
