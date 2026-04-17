// Bulk import items from CSV
const crypto = require('crypto');
exports.importItems = async (req, res) => {
  const items = req.body?.items;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'No items to import.' });
  }
  try {
    let tempId = Date.now();
    for (const row of items) {
      await itemModel.createItem({
        id: crypto.randomUUID(),
        temp_id: tempId++,
        item_code: row['Item Code'] || null,
        barcode: row['Barcode'] || null,
        item_name: row['Item Name'],
        item_name_2: row['Item Name 2'] || null,
        description: row['Description'] || null,
        scale_item: Number(row['Scale Item']) || 0,
        scale_group_no: Number(row['Scale Group No']) || 1,
        pos_order_no: row['POS Order No'] ? Number(row['POS Order No']) : null,
        suppliers_id: row['Supplier ID'] ? Number(row['Supplier ID']) : null,
        item_categories_id: row['Category ID'] ? Number(row['Category ID']) : null,
        quantity: row['Qty'] ? Number(row['Qty']) : 0,
        unit_type_id: row['Unit Type ID'] ? Number(row['Unit Type ID']) : 1,
        minimum_qty: row['Min Qty'] ? Number(row['Min Qty']) : 0,
        purchase_price: row['Purchase Price'] ? Number(row['Purchase Price']) : 0,
        market_price: row['Market Price'] ? Number(row['Market Price']) : null,
        retail_price: row['Retail Price'] ? Number(row['Retail Price']) : 0,
        wholesale_price: row['Wholesale Price'] ? Number(row['Wholesale Price']) : 0,
        additional_fees_percentage: row['Additional Fees Percentage'] ? Number(row['Additional Fees Percentage']) : 0,
        additional_fees_amount: row['Additional Fees Amount'] ? Number(row['Additional Fees Amount']) : 0,
        status_id: row['Status ID'] ? Number(row['Status ID']) : 1,
        start_qty: row['Start Qty'] ? Number(row['Start Qty']) : 0,
      });
    }
    return res.json({ success: true, count: items.length });
  } catch (err) {
    return res.status(500).json({ error: 'Import failed.' });
  }
};
// PATCH /api/items/:id/status
exports.updateItemStatus = async (req, res) => {
  const id = String(req.params?.id || '').trim();
  if (!id) return res.status(400).json({ error: 'Invalid item id.' });

  // Accept status from body: { status: 'out_of_stock' }
  const status = String(req.body?.status || '').trim().toLowerCase();
  let status_id = null;
  if (status === 'out_of_stock') {
    status_id = 0; // 0 = Out of Stock (adjust as per your DB convention)
  } else if (status === 'in_stock') {
    status_id = 1; // 1 = In Stock
  } else {
    return res.status(400).json({ error: 'Invalid status value.' });
  }

  try {
    const existing = await itemModel.getItemById(id);
    if (!existing) return res.status(404).json({ error: 'Item not found.' });

    await itemModel.updateItemStatus(id, status_id);
    const updated = await itemModel.getItemById(id);
    return res.json({ item: updated });
  } catch (err) {
    return res.status(500).json({ error: 'Server error.' });
  }
};
/*
 * controllers/itemController.js
 * Item endpoints.
 */

// const crypto = require('crypto');
const itemModel = require('../models/itemModel');

const normalizeMoney = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  if (num < 0) return null;
  return Math.round(num * 100) / 100;
};

exports.listItems = async (req, res) => {
  const search = String(req.query?.search || '').trim();
  const categoryIdRaw = req.query?.categoryId;
  const supplierIdRaw = req.query?.supplierId;
  const sortBy = String(req.query?.sort_by || 'item_code');
  const sortOrder = String(req.query?.sort_order || 'asc');

  const limitRaw = req.query?.limit;
  const offsetRaw = req.query?.offset;
  const limit = limitRaw === undefined ? 30 : Number(limitRaw);
  const offset = offsetRaw === undefined ? 0 : Number(offsetRaw);
  const safeLimit = Number.isInteger(limit) && limit > 0 && limit <= 500 ? limit : 30;
  const safeOffset = Number.isInteger(offset) && offset >= 0 ? offset : 0;

  const categoryId = categoryIdRaw === undefined || categoryIdRaw === '' ? null : Number(categoryIdRaw);
  const supplierId = supplierIdRaw === undefined || supplierIdRaw === '' ? null : Number(supplierIdRaw);

  if (categoryId !== null && (!Number.isInteger(categoryId) || categoryId <= 0)) {
    return res.status(400).json({ error: 'Invalid category.' });
  }
  if (supplierId !== null && (!Number.isInteger(supplierId) || supplierId <= 0)) {
    return res.status(400).json({ error: 'Invalid supplier.' });
  }

  try {
    const [items, total] = await Promise.all([
      itemModel.listItems({
        searchTerm: search,
        categoryId,
        supplierId,
        sortBy,
        sortOrder,
        limit: safeLimit,
        offset: safeOffset,
      }),
      itemModel.countItems({
        searchTerm: search,
        categoryId,
        supplierId,
      }),
    ]);
    return res.json({ items, total, limit: safeLimit, offset: safeOffset });
  } catch {
    return res.status(500).json({ error: 'Server error.' });
  }
};

exports.getItem = async (req, res) => {
  const id = String(req.params?.id || '').trim();
  if (!id) return res.status(400).json({ error: 'Invalid item id.' });

  try {
    const item = await itemModel.getItemById(id);
    if (!item) return res.status(404).json({ error: 'Item not found.' });
    return res.json({ item });
  } catch {
    return res.status(500).json({ error: 'Server error.' });
  }
};

exports.updateItem = async (req, res) => {
  const id = String(req.params?.id || '').trim();
  if (!id) return res.status(400).json({ error: 'Invalid item id.' });

  // Accept fields from req.body (JSON or urlencoded or multipart)
  const barcode = req.body?.barcode;
  const item_name = req.body?.item_name;
  const item_categories_id = req.body?.item_categories_id;
  const suppliers_id = req.body?.suppliers_id;
  const minimum_qty = req.body?.minimum_qty;
  const pos_order_no = req.body?.pos_order_no;
  const description = req.body?.description;
  // Accept image_path from frontend (frontend stores image, backend stores only path)
  const image_path_from_body = req.body?.image_path;

  const name = String(item_name || '').trim();
  if (!name) return res.status(400).json({ error: 'Item name is required.' });

  const categoryId = Number(item_categories_id);
  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    return res.status(400).json({ error: 'Category is required.' });
  }

  const supplierId = Number(suppliers_id);
  if (!Number.isInteger(supplierId) || supplierId <= 0) {
    return res.status(400).json({ error: 'Supplier is required.' });
  }

  const minQty = Number(minimum_qty);
  if (!Number.isInteger(minQty) || minQty < 0) {
    return res.status(400).json({ error: 'Minimum quantity must be a non-negative integer.' });
  }

  const posOrder = pos_order_no === undefined || pos_order_no === '' ? null : Number(pos_order_no);
  if (posOrder !== null && (!Number.isInteger(posOrder) || posOrder <= 0)) {
    return res.status(400).json({ error: 'Invalid POS order no.' });
  }

  // Use image_path from body if provided, otherwise keep existing
  let image_path = undefined;
  if (typeof image_path_from_body === 'string' && image_path_from_body.trim() !== '') {
    image_path = image_path_from_body.trim();
  }

  try {
    const existing = await itemModel.getItemById(id);
    if (!existing) return res.status(404).json({ error: 'Item not found.' });

    await itemModel.updateItem(id, {
      barcode: String(barcode || '').trim() || null,
      item_name: name,
      suppliers_id: supplierId,
      item_categories_id: categoryId,
      minimum_qty: minQty,
      pos_order_no: posOrder,
      description: String(description || '').trim() || null,
      image_path: image_path !== undefined ? image_path : existing.image_path,
    });

    const updated = await itemModel.getItemById(id);
    return res.json({ item: updated });
  } catch (err) {
    return res.status(500).json({ error: 'Server error.' });
  }
};

exports.createItem = async (req, res) => {
  const {
    item_code,
    barcode,
    item_name,
    item_categories_id,
    suppliers_id,
    quantity,
    minimum_qty,
    purchase_price,
    retail_price,
    wholesale_price,
    pos_order_no,
    has_expiry_date,
    show_expiry_alert_in,
    description,
  } = req.body || {};

  const name = String(item_name || '').trim();
  if (!name) return res.status(400).json({ error: 'Item name is required.' });

  const categoryId = Number(item_categories_id);
  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    return res.status(400).json({ error: 'Category is required.' });
  }

  const supplierId = Number(suppliers_id);
  if (!Number.isInteger(supplierId) || supplierId <= 0) {
    return res.status(400).json({ error: 'Supplier is required.' });
  }

  const qty = Number(quantity);
  if (!Number.isInteger(qty) || qty < 0) {
    return res.status(400).json({ error: 'Quantity must be a non-negative integer.' });
  }

  const minQty = Number(minimum_qty);
  if (!Number.isInteger(minQty) || minQty < 0) {
    return res.status(400).json({ error: 'Minimum quantity must be a non-negative integer.' });
  }

  const purchase = normalizeMoney(purchase_price);
  if (purchase === null) return res.status(400).json({ error: 'Purchase price is required.' });

  const retail = normalizeMoney(retail_price);
  if (retail === null) return res.status(400).json({ error: 'Retail price is required.' });

  const wholesale = wholesale_price === undefined || wholesale_price === '' ? null : normalizeMoney(wholesale_price);
  // DB requires wholesale_price NOT NULL.
  if (wholesale === null) return res.status(400).json({ error: 'Wholesale price is required.' });

  const posOrder = pos_order_no === undefined || pos_order_no === '' ? null : Number(pos_order_no);
  if (posOrder !== null && (!Number.isInteger(posOrder) || posOrder <= 0)) {
    return res.status(400).json({ error: 'Invalid POS order no.' });
  }

  const expiryEnabled = Boolean(Number(has_expiry_date)) ? 1 : 0;
  const alertIn = show_expiry_alert_in === undefined || show_expiry_alert_in === '' ? null : Number(show_expiry_alert_in);
  if (alertIn !== null && (!Number.isInteger(alertIn) || alertIn <= 0)) {
    return res.status(400).json({ error: 'Invalid expiry alert days.' });
  }

  const codeRaw = String(item_code || '').trim();

  try {
    let finalCode = codeRaw;
    if (!finalCode) {
      // Simple auto code: 5 digits from timestamp.
      finalCode = String(Date.now()).slice(-5);
    }

    const existing = await itemModel.getItemByItemCode(finalCode);
    if (existing) {
      return res.status(409).json({ error: 'Item code already exists.' });
    }

    const tempId = await itemModel.getNextTempId();

    // Accept image_path from frontend (like updateItem)
    let image_path = null;
    if (typeof req.body?.image_path === 'string' && req.body.image_path.trim() !== '') {
      image_path = req.body.image_path.trim();
    }
    const payload = {
      id: crypto.randomUUID(),
      item_code: finalCode,
      barcode: String(barcode || '').trim() || null,
      item_name: name,
      item_name_2: null,
      scale_item: 0,
      scale_group_no: 1,
      pos_order_no: posOrder,
      suppliers_id: supplierId,
      item_categories_id: categoryId,
      quantity: qty,
      unit_type_id: 1,
      minimum_qty: minQty,
      purchase_price: purchase,
      market_price: null,
      retail_price: retail,
      wholesale_price: wholesale,
      additional_fees_percentage: 0,
      additional_fees_amount: 0,
      start_qty: null,
      image_path,
      status_id: 1,
      has_expiry_date: expiryEnabled,
      show_expiry_alert_in: expiryEnabled ? alertIn : null,
      description: String(description || '').trim() || null,
      temp_id: tempId,
    };

    const created = await itemModel.createItem(payload);
    return res.status(201).json({ item: created });
  } catch {
    return res.status(500).json({ error: 'Server error.' });
  }
};
