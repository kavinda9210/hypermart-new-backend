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

// POST /api/item-categories
router.post('/', requireAuth, itemCategoryController.createCategory);

module.exports = router;
