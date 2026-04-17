/*
 * controllers/stockController.js
 * Stock endpoints (list + quantity updates).
 */

const itemModel = require('../models/itemModel');

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
