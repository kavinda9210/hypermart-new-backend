/*
 * routes/itemCategoriesRoutes.js
 * Item category endpoints mounted under /api/item-categories.
 */

const express = require('express');

const router = express.Router();

const { requireAuth } = require('../middleware/authMiddleware');
const itemCategoryController = require('../controllers/itemCategoryController');

// GET /api/item-categories
router.get('/', requireAuth, itemCategoryController.listCategories);

// GET /api/item-categories/:id
router.get('/:id', requireAuth, itemCategoryController.getCategory);

// POST /api/item-categories
router.post('/', requireAuth, itemCategoryController.createCategory);

// PUT /api/item-categories/:id
router.put('/:id', requireAuth, itemCategoryController.updateCategory);

module.exports = router;
