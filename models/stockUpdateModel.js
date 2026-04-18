/*
 * models/stockUpdateModel.js
 * Data-access layer for stock_updates table (batch-based stock additions).
 */

const db = require('../config/db');

exports.listByItemId = (itemId) =>
  new Promise((resolve, reject) => {
    const id = String(itemId || '').trim();
    if (!id) return resolve([]);

    db.all(
      `
      SELECT
        su.id,
        su.user_id,
        su.items_id,
        su.batch_no,
        su.supplier_id,
        s.supplier_name,
        su.stock,
        su.remaining_stock,
        su.purchase_price,
        su.retail_price,
        su.wholesale_price,
        su.market_price,
        su.additional_fees_percentage,
        su.additional_fees_amount,
        su.received_at,
        su.status,
        su.note,
        su.supplier_invoice_id,
        su.invoice_ref,
        si.reference_number AS supplier_invoice_reference_number,
        si.invoice_code AS supplier_invoice_code,
        su.exp_date,
        su.show_expiry_alert_in,
        su.created_at,
        su.updated_at
      FROM stock_updates su
      LEFT JOIN suppliers s ON s.id = su.supplier_id
      LEFT JOIN supplier_invoices si ON si.id = su.supplier_invoice_id
      WHERE su.items_id = ?
      ORDER BY COALESCE(su.received_at, su.created_at) DESC, su.id DESC
      `,
      [id],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      }
    );
  });

exports.getById = (id) =>
  new Promise((resolve, reject) => {
    const safeId = Number(id);
    if (!Number.isInteger(safeId) || safeId <= 0) return resolve(null);

    db.get(
      `
      SELECT
        id,
        user_id,
        items_id,
        batch_no,
        supplier_id,
        stock,
        remaining_stock,
        purchase_price,
        retail_price,
        wholesale_price,
        market_price,
        additional_fees_percentage,
        additional_fees_amount,
        received_at,
        status,
        note,
        supplier_invoice_id,
        invoice_ref,
        exp_date,
        show_expiry_alert_in,
        created_at,
        updated_at
      FROM stock_updates
      WHERE id = ?
      `,
      [safeId],
      (err, row) => {
        if (err) return reject(err);
        resolve(row || null);
      }
    );
  });

exports.updateRemainingStock = (id, remainingStock) =>
  new Promise((resolve, reject) => {
    const now = new Date().toISOString();
    const safeId = Number(id);
    const remaining = Number(remainingStock);

    if (!Number.isInteger(safeId) || safeId <= 0) {
      return reject(new Error('Invalid stock update id'));
    }
    if (!Number.isFinite(remaining) || remaining < 0) {
      return reject(new Error('Invalid remaining stock'));
    }

    db.run(
      `UPDATE stock_updates SET remaining_stock = ?, updated_at = ? WHERE id = ?`,
      [remaining, now, safeId],
      function (err) {
        if (err) return reject(err);
        resolve({ changes: this.changes, updated_at: now });
      }
    );
  });

exports.getById = (id) =>
  new Promise((resolve, reject) => {
    const safeId = Number(id);
    if (!Number.isInteger(safeId) || safeId <= 0) return resolve(null);

    db.get(
      `
      SELECT
        id,
        user_id,
        items_id,
        batch_no,
        supplier_id,
        stock,
        remaining_stock,
        purchase_price,
        retail_price,
        wholesale_price,
        market_price,
        additional_fees_percentage,
        additional_fees_amount,
        received_at,
        status,
        note,
        supplier_invoice_id,
        invoice_ref,
        exp_date,
        show_expiry_alert_in,
        created_at,
        updated_at
      FROM stock_updates
      WHERE id = ?
      `,
      [safeId],
      (err, row) => {
        if (err) return reject(err);
        resolve(row || null);
      }
    );
  });

exports.updateRemainingStock = (id, remainingStock) =>
  new Promise((resolve, reject) => {
    const now = new Date().toISOString();
    const safeId = Number(id);
    const remaining = Number(remainingStock);

    if (!Number.isInteger(safeId) || safeId <= 0) {
      return reject(new Error('Invalid stock update id'));
    }
    if (!Number.isFinite(remaining) || remaining < 0) {
      return reject(new Error('Invalid remaining stock'));
    }

    db.run(
      `UPDATE stock_updates SET remaining_stock = ?, updated_at = ? WHERE id = ?`,
      [remaining, now, safeId],
      function (err) {
        if (err) return reject(err);
        resolve({ changes: this.changes, updated_at: now });
      }
    );
  });

exports.create = (payload) =>
  new Promise((resolve, reject) => {
    const now = new Date().toISOString();

    db.run(
      `
      INSERT INTO stock_updates (
        user_id,
        items_id,
        batch_no,
        supplier_id,
        stock,
        purchase_price,
        retail_price,
        wholesale_price,
        market_price,
        additional_fees_percentage,
        additional_fees_amount,
        remaining_stock,
        received_at,
        status,
        note,
        supplier_invoice_id,
        invoice_ref,
        exp_date,
        show_expiry_alert_in,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        payload.user_id ?? null,
        String(payload.items_id),
        payload.batch_no ?? null,
        payload.supplier_id ?? null,
        payload.stock,
        payload.purchase_price ?? null,
        payload.retail_price ?? null,
        payload.wholesale_price ?? null,
        payload.market_price ?? null,
        payload.additional_fees_percentage ?? 0,
        payload.additional_fees_amount ?? 0,
        payload.remaining_stock,
        payload.received_at ?? null,
        payload.status,
        payload.note ?? null,
        payload.supplier_invoice_id ?? null,
        payload.invoice_ref ?? null,
        payload.exp_date ?? null,
        payload.show_expiry_alert_in ?? null,
        now,
        now,
      ],
      function (err) {
        if (err) return reject(err);
        resolve({ id: this.lastID, created_at: now, updated_at: now });
      }
    );
  });
