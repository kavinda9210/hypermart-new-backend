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

const buildItemsWhere = ({ searchTerm = '', categoryId = null, supplierId = null, scaleItem = null }) => {
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

  // scale_item: 1 = Scale items, 0 = Normal items
  if (scaleItem === 0 || scaleItem === 1) {
    where.push('scale_item = ?');
    params.push(scaleItem);
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

exports.listItems = ({ searchTerm = '', categoryId = null, supplierId = null, scaleItem = null, sortBy = 'item_code', sortOrder = 'asc', limit = 30, offset = 0 }) =>
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

    const { whereClause, params } = buildItemsWhere({ searchTerm, categoryId, supplierId, scaleItem });

    db.all(
      `
      SELECT
        id,
        item_code,
        barcode,
        item_name,
        scale_item,
        scale_group_no,
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

exports.countItems = ({ searchTerm = '', categoryId = null, supplierId = null, scaleItem = null }) =>
  new Promise((resolve, reject) => {
    const { whereClause, params } = buildItemsWhere({ searchTerm, categoryId, supplierId, scaleItem });

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
        scale_item,
        scale_group_no,
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

exports.listItemsForExport = ({ scaleItem = null, ids = null } = {}) =>
  new Promise((resolve, reject) => {
    const where = [];
    const params = [];

    if (scaleItem === 0 || scaleItem === 1) {
      where.push('i.scale_item = ?');
      params.push(scaleItem);
    }

    const safeIds = Array.isArray(ids)
      ? ids.map((v) => String(v || '').trim()).filter(Boolean)
      : [];
    if (safeIds.length) {
      where.push(`i.id IN (${safeIds.map(() => '?').join(',')})`);
      params.push(...safeIds);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    db.all(
      `
      SELECT
        i.id,
        i.item_code,
        i.item_name,
        i.item_categories_id,
        c.categories AS category_name,
        i.unit_type_id,
        i.retail_price,
        i.scale_item,
        i.scale_group_no
      FROM items i
      LEFT JOIN item_categories c ON c.id = i.item_categories_id
      ${whereClause}
      ORDER BY i.item_code ASC
      `,
      params,
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
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

exports.updateItemQuantity = (id, quantity) =>
  new Promise((resolve, reject) => {
    const now = new Date().toISOString();
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty < 0) {
      return reject(new Error('Invalid quantity'));
    }

    db.run(
      `UPDATE items SET quantity = ?, updated_at = ? WHERE id = ?`,
      [Math.floor(qty), now, id],
      function (err) {
        if (err) return reject(err);
        resolve({ changes: this.changes, updated_at: now });
      }
    );
  });

exports.updateItemPricingAndExpiry = (id, payload) =>
  new Promise((resolve, reject) => {
    const now = new Date().toISOString();

    const set = [];
    const params = [];

    if (payload && Object.prototype.hasOwnProperty.call(payload, 'purchase_price')) {
      set.push('purchase_price = ?');
      params.push(payload.purchase_price ?? null);
    }
    if (payload && Object.prototype.hasOwnProperty.call(payload, 'retail_price')) {
      set.push('retail_price = ?');
      params.push(payload.retail_price ?? null);
    }
    if (payload && Object.prototype.hasOwnProperty.call(payload, 'wholesale_price')) {
      set.push('wholesale_price = ?');
      params.push(payload.wholesale_price ?? null);
    }
    if (payload && Object.prototype.hasOwnProperty.call(payload, 'has_expiry_date')) {
      set.push('has_expiry_date = ?');
      params.push(payload.has_expiry_date ? 1 : 0);
    }
    if (payload && Object.prototype.hasOwnProperty.call(payload, 'show_expiry_alert_in')) {
      set.push('show_expiry_alert_in = ?');
      params.push(payload.show_expiry_alert_in ?? null);
    }

    if (!set.length) {
      return resolve({ changes: 0, updated_at: now });
    }

    set.push('updated_at = ?');
    params.push(now);
    params.push(id);

    db.run(
      `UPDATE items SET ${set.join(', ')} WHERE id = ?`,
      params,
      function (err) {
        if (err) return reject(err);
        resolve({ changes: this.changes, updated_at: now });
      }
    );
  });
