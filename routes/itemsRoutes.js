/*
 * routes/itemsRoutes.js
 * Item endpoints mounted under /api/items.
 */

const express = require('express');

const router = express.Router();

const { requireAuth } = require('../middleware/authMiddleware');
const itemController = require('../controllers/itemController');

// POST /api/items
router.post('/', requireAuth, itemController.createItem);

// GET /api/items
router.get('/', requireAuth, itemController.listItems);

// GET /api/items/:id
router.get('/:id', requireAuth, itemController.getItem);

// PUT /api/items/:id
router.put('/:id', requireAuth, itemController.updateItem);

// PATCH /api/items/:id/status
router.patch('/:id/status', requireAuth, itemController.updateItemStatus);

// Bulk import items from CSV
router.post('/import', requireAuth, itemController.importItems);

module.exports = router;
