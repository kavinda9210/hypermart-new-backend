/*
 * routes/itemsRoutes.js
 * Item endpoints mounted under /api/items.
 */

const express = require('express');

const router = express.Router();

const { requireAuth } = require('../middleware/authMiddleware');
const { requireAllPermissions } = require('../middleware/permissionMiddleware');
const itemController = require('../controllers/itemController');

// POST /api/items
router.post('/', requireAuth, requireAllPermissions(['Access_Items', 'Add new Item']), itemController.createItem);

// GET /api/items
router.get('/', requireAuth, requireAllPermissions(['Access_Items']), itemController.listItems);

// Export items as CSV
// GET /api/items/export?type_filter=scale|normal
// POST /api/items/export  { type_filter, ids: [] }
router.get('/export', requireAuth, itemController.exportItems);
router.post('/export', requireAuth, itemController.exportItems);

// GET /api/items/:id
router.get('/:id', requireAuth, requireAllPermissions(['Access_Items']), itemController.getItem);

// PUT /api/items/:id
router.put('/:id', requireAuth, requireAllPermissions(['Access_Items']), itemController.updateItem);

// PATCH /api/items/:id/status
router.patch('/:id/status', requireAuth, requireAllPermissions(['Access_Items']), itemController.updateItemStatus);

// Bulk import items from CSV
router.post('/import', requireAuth, requireAllPermissions(['Access_Items', 'Add new Item']), itemController.importItems);

module.exports = router;
