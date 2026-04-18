/*
 * routes/itemCategoriesRoutes.js
 * Item category endpoints mounted under /api/item-categories.
 */

const express = require('express');

const router = express.Router();

const { requireAuth } = require('../middleware/authMiddleware');
const { requireAllPermissions } = require('../middleware/permissionMiddleware');
const itemCategoryController = require('../controllers/itemCategoryController');

// GET /api/item-categories
router.get('/', requireAuth, requireAllPermissions(['Access_Items']), itemCategoryController.listCategories);

// GET /api/item-categories/:id
router.get('/:id', requireAuth, requireAllPermissions(['Access_Items']), itemCategoryController.getCategory);

// POST /api/item-categories
router.post('/', requireAuth, requireAllPermissions(['Access_Items']), itemCategoryController.createCategory);

// PUT /api/item-categories/:id
router.put('/:id', requireAuth, requireAllPermissions(['Access_Items']), itemCategoryController.updateCategory);

module.exports = router;
