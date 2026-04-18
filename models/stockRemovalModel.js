/*
 * models/stockRemovalModel.js
 * Data-access layer for stock_removals table.
 */

const db = require('../config/db');

exports.create = (payload) =>
  new Promise((resolve, reject) => {
    const now = new Date().toISOString();

    db.run(
      `
      INSERT INTO stock_removals (
        stock_update_id,
        items_id,
        user_id,
        quantity_removed,
        removal_reason,
        notes,
        removed_at,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        payload.stock_update_id,
        String(payload.items_id),
        String(payload.user_id),
        payload.quantity_removed,
        payload.removal_reason,
        payload.notes ?? null,
        payload.removed_at,
        now,
        now,
      ],
      function (err) {
        if (err) return reject(err);
        resolve({ id: this.lastID, created_at: now, updated_at: now });
      }
    );
  });
