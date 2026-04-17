// Update only the status_id of an item
exports.updateItemStatus = (id, status_id) =>
  new Promise((resolve, reject) => {
    const now = new Date().toISOString();
    db.run(
      `UPDATE items SET status_id = ?, updated_at = ? WHERE id = ?`,
      [status_id, now, id],
      function (err) {
        if (err) return reject(err);
        resolve({ changes: this.changes, updated_at: now });
      }
    );
  });
/*
 * models/itemModel.js
 * Data-access layer for items table.
 */

const db = require('../config/db');

const buildItemsWhere = ({ searchTerm = '', categoryId = null, supplierId = null }) => {
  const where = [];
  const params = [];

  const normalizedSearch = String(searchTerm || '').trim();
  if (normalizedSearch) {
    where.push('(LOWER(item_name) LIKE LOWER(?) OR item_code LIKE ? OR barcode LIKE ?)');
    params.push(`%${normalizedSearch}%`, `%${normalizedSearch}%`, `%${normalizedSearch}%`);
  }
  if (Number.isInteger(categoryId) && categoryId > 0) {
    where.push('item_categories_id = ?');
    params.push(categoryId);
  }
  if (Number.isInteger(supplierId) && supplierId > 0) {
    where.push('suppliers_id = ?');
    params.push(supplierId);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  return { whereClause, params };
};

exports.getItemByItemCode = (itemCode) =>
  new Promise((resolve, reject) => {
    db.get(
      `
      SELECT id, item_code
      FROM items
      WHERE item_code = ?
      `,
      [String(itemCode)],
      (err, row) => {
        if (err) return reject(err);
        resolve(row || null);
      }
    );
  });

exports.getNextTempId = () =>
  new Promise((resolve, reject) => {
    db.get('SELECT COALESCE(MAX(temp_id), 0) + 1 AS nextTempId FROM items', [], (err, row) => {
      if (err) return reject(err);
      resolve(Number(row?.nextTempId) || 1);
    });
  });

exports.listItems = ({ searchTerm = '', categoryId = null, supplierId = null, sortBy = 'item_code', sortOrder = 'asc', limit = 30, offset = 0 }) =>
  new Promise((resolve, reject) => {
    const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 30;
    const safeOffset = Number.isInteger(offset) && offset >= 0 ? offset : 0;

    const sortKeyMap = {
      item_code: 'item_code',
      item_name: 'item_name',
      quantity: 'quantity',
      status_id: 'status_id',
      unit_type_id: 'unit_type_id',
      created_at: 'created_at',
    };
    const safeSortBy = sortKeyMap[sortBy] || 'item_code';
    const safeSortOrder = String(sortOrder).toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    const { whereClause, params } = buildItemsWhere({ searchTerm, categoryId, supplierId });

    db.all(
      `
      SELECT
        id,
        item_code,
        barcode,
        item_name,
        suppliers_id,
        item_categories_id,
        quantity,
        unit_type_id,
        minimum_qty,
        purchase_price,
        retail_price,
        wholesale_price,
        image_path,
        status_id,
        created_at,
        updated_at,
        description,
        pos_order_no,
        has_expiry_date,
        show_expiry_alert_in
      FROM items
      ${whereClause}
      ORDER BY ${safeSortBy} ${safeSortOrder}
      LIMIT ? OFFSET ?
      `,
      [...params, safeLimit, safeOffset],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      }
    );
  });

exports.countItems = ({ searchTerm = '', categoryId = null, supplierId = null }) =>
  new Promise((resolve, reject) => {
    const { whereClause, params } = buildItemsWhere({ searchTerm, categoryId, supplierId });

    db.get(
      `
      SELECT COUNT(1) AS total
      FROM items
      ${whereClause}
      `,
      params,
      (err, row) => {
        if (err) return reject(err);
        resolve(Number(row?.total) || 0);
      }
    );
  });

exports.getItemById = (id) =>
  new Promise((resolve, reject) => {
    db.get(
      `
      SELECT
        id,
        item_code,
        barcode,
        item_name,
        suppliers_id,
        item_categories_id,
        quantity,
        unit_type_id,
        minimum_qty,
        purchase_price,
        retail_price,
        wholesale_price,
        image_path,
        status_id,
        created_at,
        updated_at,
        description,
        pos_order_no,
        has_expiry_date,
        show_expiry_alert_in
      FROM items
      WHERE id = ?
      `,
      [id],
      (err, row) => {
        if (err) return reject(err);
        resolve(row || null);
      }
    );
  });

exports.updateItem = (id, payload) =>
  new Promise((resolve, reject) => {
    const now = new Date().toISOString();

    // Support updating image_path if provided
    const fields = [
      'barcode = ?',
      'item_name = ?',
      'suppliers_id = ?',
      'item_categories_id = ?',
      'minimum_qty = ?',
      'pos_order_no = ?',
      'description = ?',
      'updated_at = ?'
    ];
    const values = [
      payload.barcode ?? null,
      payload.item_name,
      payload.suppliers_id,
      payload.item_categories_id,
      payload.minimum_qty,
      payload.pos_order_no ?? null,
      payload.description ?? null,
      now
    ];
    if ('image_path' in payload) {
      fields.push('image_path = ?');
      values.push(payload.image_path ?? null);
    }
    values.push(id);

    db.run(
      `
      UPDATE items
      SET
        ${fields.join(',\n        ')}
      WHERE id = ?
      `,
      values,
      function (err) {
        if (err) return reject(err);
        resolve({ changes: this.changes, updated_at: now });
      }
    );
  });

exports.createItem = (payload) =>
  new Promise((resolve, reject) => {
    const now = new Date().toISOString();

    db.run(
      `
      INSERT INTO items (
        id,
        item_code,
        barcode,
        item_name,
        item_name_2,
        scale_item,
        scale_group_no,
        pos_order_no,
        suppliers_id,
        item_categories_id,
        quantity,
        unit_type_id,
        minimum_qty,
        purchase_price,
        market_price,
        retail_price,
        wholesale_price,
        additional_fees_percentage,
        additional_fees_amount,
        start_qty,
        image_path,
        status_id,
        has_expiry_date,
        show_expiry_alert_in,
        created_at,
        updated_at,
        description,
        temp_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        payload.id,
        String(payload.item_code),
        payload.barcode ?? null,
        payload.item_name,
        payload.item_name_2 ?? null,
        payload.scale_item ?? 0,
        payload.scale_group_no ?? 1,
        payload.pos_order_no ?? null,
        payload.suppliers_id ?? null,
        payload.item_categories_id ?? null,
        payload.quantity,
        payload.unit_type_id ?? 1,
        payload.minimum_qty ?? null,
        payload.purchase_price,
        payload.market_price ?? null,
        payload.retail_price,
        payload.wholesale_price,
        payload.additional_fees_percentage ?? 0,
        payload.additional_fees_amount ?? 0,
        payload.start_qty ?? null,
        payload.image_path ?? null,
        payload.status_id ?? 1,
        payload.has_expiry_date ?? 0,
        payload.show_expiry_alert_in ?? null,
        now,
        now,
        payload.description ?? null,
        payload.temp_id,
      ],
      function (err) {
        if (err) return reject(err);
        resolve({
          ...payload,
          created_at: now,
          updated_at: now,
        });
      }
    );
  });
