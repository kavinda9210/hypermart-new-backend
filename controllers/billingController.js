// controllers/billingController.js

const itemModel = require('../models/itemModel');

const DEFAULT_ITEM_IMAGE_URL = '/upload/items/default-item.svg';

const toImageUrl = (imagePath) => {
  const raw = String(imagePath || '').trim();
  if (!raw) return DEFAULT_ITEM_IMAGE_URL;
  return raw.startsWith('/') ? raw : `/${raw}`;
};

const withImageUrl = (item) => {
  if (!item) return item;
  return { ...item, image_url: toImageUrl(item.image_path) };
};

/**
 * GET /api/billing/search-items
 * Search items for billing (with barcode scanning support)
 */
exports.searchItems = async (req, res) => {
  const { search, pricing_mode = 'retail' } = req.query;
  
  console.log('[SearchItems] Request received:', { search, pricing_mode, user: req.user?.id });
  
  // Return empty if no search term
  if (!search || !String(search).trim()) {
    return res.json({ items: [], total: 0 });
  }
  
  try {
    // First try exact barcode or item code match
    let item = await itemModel.getItemByBarcode(search, pricing_mode);
    
    if (item) {
      console.log('[SearchItems] Found exact match:', item.item_name);
      return res.json({ items: [withImageUrl(item)], total: 1 });
    }
    
    // Otherwise search by name/code (partial match)
    const items = await itemModel.searchItemsForBilling(search, pricing_mode, 20);
    console.log('[SearchItems] Found partial matches:', items.length);
    return res.json({ items: (items || []).map(withImageUrl), total: items.length });
  } catch (err) {
    console.error('[SearchItems] Error:', err);
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
};

/**
 * GET /api/billing/items
 * List items for billing right panel (no search term).
 * Query: pricing_mode=retail|wholesale, limit, offset, include_out_of_stock=1|0
 */
exports.listItems = async (req, res) => {
  const {
    pricing_mode = 'retail',
    limit = '60',
    offset = '0',
    include_out_of_stock = '1',
  } = req.query;

  const safeLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 60, 1), 500);
  const safeOffset = Math.max(Number.parseInt(offset, 10) || 0, 0);
  const includeOutOfStock = String(include_out_of_stock) !== '0';

  try {
    const [items, total] = await Promise.all([
      itemModel.listItemsForBilling({
        pricingMode: pricing_mode,
        limit: safeLimit,
        offset: safeOffset,
        includeOutOfStock,
      }),
      itemModel.countItemsForBilling({ includeOutOfStock }),
    ]);

    return res.json({ items: (items || []).map(withImageUrl), total, limit: safeLimit, offset: safeOffset });
  } catch (err) {
    console.error('[BillingItems] Error:', err);
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
};