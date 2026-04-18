/*
 * controllers/stockController.js
 * Stock endpoints (list + quantity updates + batch stock updates).
 */

const itemModel = require('../models/itemModel');
const stockUpdateModel = require('../models/stockUpdateModel');

exports.listStock = async (req, res) => {
  const search = String(req.query?.search || '').trim();
  const categoryIdRaw = req.query?.categoryId;

  const limitRaw = req.query?.limit;
  const offsetRaw = req.query?.offset;
  const limit = limitRaw === undefined ? 30 : Number(limitRaw);
  const offset = offsetRaw === undefined ? 0 : Number(offsetRaw);
  const safeLimit = Number.isInteger(limit) && limit > 0 && limit <= 500 ? limit : 30;
  const safeOffset = Number.isInteger(offset) && offset >= 0 ? offset : 0;

  const categoryId = categoryIdRaw === undefined || categoryIdRaw === '' ? null : Number(categoryIdRaw);
  if (categoryId !== null && (!Number.isInteger(categoryId) || categoryId <= 0)) {
    return res.status(400).json({ error: 'Invalid category.' });
  }

  try {
    const [items, total] = await Promise.all([
      itemModel.listItems({
        searchTerm: search,
        categoryId,
        supplierId: null,
        scaleItem: null,
        sortBy: 'item_code',
        sortOrder: 'asc',
        limit: safeLimit,
        offset: safeOffset,
      }),
      itemModel.countItems({
        searchTerm: search,
        categoryId,
        supplierId: null,
        scaleItem: null,
      }),
    ]);

    // Map to the fields Stock page needs.
    const rows = items.map((it) => ({
      id: it.id,
      item_code: it.item_code,
      item_name: it.item_name,
      item_categories_id: it.item_categories_id,
      quantity: it.quantity,
      unit_type_id: it.unit_type_id,
    }));

    return res.json({ items: rows, total, limit: safeLimit, offset: safeOffset });
  } catch {
    return res.status(500).json({ error: 'Server error.' });
  }
};

// GET /api/stock/:id/updates
exports.listStockUpdatesForItem = async (req, res) => {
  const id = String(req.params?.id || '').trim();
  if (!id) return res.status(400).json({ error: 'Invalid item id.' });

  try {
    const existing = await itemModel.getItemById(id);
    if (!existing) return res.status(404).json({ error: 'Item not found.' });

    const rows = await stockUpdateModel.listByItemId(id);
    return res.json({ updates: rows });
  } catch {
    return res.status(500).json({ error: 'Server error.' });
  }
};

// POST /api/stock/:id/updates
// Body: { quantity, purchase_price, retail_price, wholesale_price, batch_no?, supplier_id?, supplier_invoice_id?, invoice_ref?, exp_date?, show_expiry_alert_in?, received_at?, note? }
exports.createStockUpdate = async (req, res) => {
  const id = String(req.params?.id || '').trim();
  if (!id) return res.status(400).json({ error: 'Invalid item id.' });

  const quantityRaw = Number(req.body?.quantity);
  if (!Number.isFinite(quantityRaw) || quantityRaw <= 0) {
    return res.status(400).json({ error: 'quantity must be a positive number.' });
  }
  const quantity = Math.floor(quantityRaw);
  if (quantity <= 0) {
    return res.status(400).json({ error: 'quantity must be at least 1.' });
  }

  const toOptionalNumber = (v) => {
    if (v === undefined || v === null || v === '') return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : NaN;
  };

  const purchase_price = toOptionalNumber(req.body?.purchase_price);
  const retail_price = toOptionalNumber(req.body?.retail_price);
  const wholesale_price = toOptionalNumber(req.body?.wholesale_price);

  if (Number.isNaN(purchase_price) || Number.isNaN(retail_price) || Number.isNaN(wholesale_price)) {
    return res.status(400).json({ error: 'Invalid price value.' });
  }

  const supplier_id = toOptionalNumber(req.body?.supplier_id);
  const supplier_invoice_id = toOptionalNumber(req.body?.supplier_invoice_id);
  const show_expiry_alert_in = toOptionalNumber(req.body?.show_expiry_alert_in);

  if (Number.isNaN(supplier_id) || Number.isNaN(supplier_invoice_id) || Number.isNaN(show_expiry_alert_in)) {
    return res.status(400).json({ error: 'Invalid numeric value.' });
  }

  const batch_no = req.body?.batch_no === undefined || req.body?.batch_no === null || String(req.body.batch_no).trim() === ''
    ? null
    : String(req.body.batch_no).trim();

  const received_at = req.body?.received_at === undefined || req.body?.received_at === null || String(req.body.received_at).trim() === ''
    ? new Date().toISOString()
    : String(req.body.received_at).trim();

  const exp_date = req.body?.exp_date === undefined || req.body?.exp_date === null || String(req.body.exp_date).trim() === ''
    ? null
    : String(req.body.exp_date).trim();

  const invoice_ref = req.body?.invoice_ref === undefined || req.body?.invoice_ref === null || String(req.body.invoice_ref).trim() === ''
    ? null
    : String(req.body.invoice_ref).trim();

  const note = req.body?.note === undefined || req.body?.note === null || String(req.body.note).trim() === ''
    ? null
    : String(req.body.note).trim();

  try {
    const existing = await itemModel.getItemById(id);
    if (!existing) return res.status(404).json({ error: 'Item not found.' });

    // Insert stock batch log.
    const created = await stockUpdateModel.create({
      user_id: req.user?.id ?? null,
      items_id: id,
      batch_no,
      supplier_id: supplier_id === undefined ? null : Math.trunc(supplier_id),
      stock: quantity,
      purchase_price: purchase_price === undefined ? null : purchase_price,
      retail_price: retail_price === undefined ? null : retail_price,
      wholesale_price: wholesale_price === undefined ? null : wholesale_price,
      remaining_stock: quantity,
      received_at,
      status: 1,
      note,
      supplier_invoice_id: supplier_invoice_id === undefined ? null : Math.trunc(supplier_invoice_id),
      invoice_ref,
      exp_date,
      show_expiry_alert_in: show_expiry_alert_in === undefined ? null : Math.trunc(show_expiry_alert_in),
    });

    // Update main item quantity.
    const nextQty = Math.floor(Number(existing.quantity ?? 0) + quantity);
    await itemModel.updateItemQuantity(id, nextQty);

    // Optionally sync item pricing + expiry flags.
    const pricingUpdate = {};
    if (purchase_price !== undefined) pricingUpdate.purchase_price = purchase_price;
    if (retail_price !== undefined) pricingUpdate.retail_price = retail_price;
    if (wholesale_price !== undefined) pricingUpdate.wholesale_price = wholesale_price;
    if (exp_date) pricingUpdate.has_expiry_date = 1;
    if (show_expiry_alert_in !== undefined) pricingUpdate.show_expiry_alert_in = Math.trunc(show_expiry_alert_in);
    await itemModel.updateItemPricingAndExpiry(id, pricingUpdate);

    const updatedItem = await itemModel.getItemById(id);
    return res.status(201).json({ stock_update: { id: created.id }, item: updatedItem });
  } catch {
    return res.status(500).json({ error: 'Server error.' });
  }
};

// PATCH /api/stock/:id
// Body: { quantity: 123 } OR { delta: 5 }
exports.updateStock = async (req, res) => {
  const id = String(req.params?.id || '').trim();
  if (!id) return res.status(400).json({ error: 'Invalid item id.' });

  const hasQuantity = Object.prototype.hasOwnProperty.call(req.body || {}, 'quantity');
  const hasDelta = Object.prototype.hasOwnProperty.call(req.body || {}, 'delta');

  if (!hasQuantity && !hasDelta) {
    return res.status(400).json({ error: 'Provide quantity or delta.' });
  }

  const quantityRaw = hasQuantity ? Number(req.body.quantity) : null;
  const deltaRaw = hasDelta ? Number(req.body.delta) : null;

  if (hasQuantity && (!Number.isFinite(quantityRaw) || quantityRaw < 0)) {
    return res.status(400).json({ error: 'quantity must be a non-negative number.' });
  }
  if (hasDelta && (!Number.isFinite(deltaRaw))) {
    return res.status(400).json({ error: 'delta must be a number.' });
  }

  try {
    const existing = await itemModel.getItemById(id);
    if (!existing) return res.status(404).json({ error: 'Item not found.' });

    let nextQty = Number(existing.quantity ?? 0);
    if (hasQuantity) {
      nextQty = Math.floor(quantityRaw);
    } else {
      nextQty = Math.floor(nextQty + deltaRaw);
    }

    if (nextQty < 0) {
      return res.status(400).json({ error: 'Resulting quantity cannot be negative.' });
    }

    await itemModel.updateItemQuantity(id, nextQty);
    const updated = await itemModel.getItemById(id);
    return res.json({ item: updated });
  } catch {
    return res.status(500).json({ error: 'Server error.' });
  }
};
