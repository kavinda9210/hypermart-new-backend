/*
 * controllers/itemCategoryController.js
 * CRUD handlers for item categories.
 */

const itemCategoryModel = require('../models/itemCategoryModel');

exports.listCategories = async (req, res) => {
  try {
    const categories = await itemCategoryModel.listCategories();
    return res.json({ categories });
  } catch {
    return res.status(500).json({ error: 'Server error.' });
  }
};

exports.createCategory = async (req, res) => {
  const { categories, description } = req.body || {};

  const name = String(categories || '').trim();
  const desc = String(description || '').trim();

  if (!name) {
    return res.status(400).json({ error: 'Category name is required.' });
  }

  try {
    const existing = await itemCategoryModel.getCategoryByName(name);
    if (existing) {
      return res.status(409).json({ error: 'Category already exists.' });
    }

    const created = await itemCategoryModel.createCategory({
      categories: name,
      // DB schema has description NOT NULL.
      description: desc,
    });

    return res.status(201).json({ category: created });
  } catch {
    return res.status(500).json({ error: 'Server error.' });
  }
};
