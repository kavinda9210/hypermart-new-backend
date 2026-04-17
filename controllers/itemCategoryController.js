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

exports.getCategory = async (req, res) => {
  const { id } = req.params;
  const idNum = Number(id);

  if (!Number.isInteger(idNum) || idNum <= 0) {
    return res.status(400).json({ error: 'Invalid category id.' });
  }

  try {
    const category = await itemCategoryModel.getCategoryById(idNum);
    if (!category) return res.status(404).json({ error: 'Category not found.' });

    return res.json({ category });
  } catch {
    return res.status(500).json({ error: 'Server error.' });
  }
};

exports.updateCategory = async (req, res) => {
  const { id } = req.params;
  const idNum = Number(id);

  if (!Number.isInteger(idNum) || idNum <= 0) {
    return res.status(400).json({ error: 'Invalid category id.' });
  }

  const { categories, description } = req.body || {};
  const name = String(categories || '').trim();
  const desc = String(description || '').trim();

  if (!name) {
    return res.status(400).json({ error: 'Category name is required.' });
  }

  try {
    const existing = await itemCategoryModel.getCategoryById(idNum);
    if (!existing) return res.status(404).json({ error: 'Category not found.' });

    const dup = await itemCategoryModel.getCategoryByName(name);
    if (dup && Number(dup.id) !== idNum) {
      return res.status(409).json({ error: 'Category already exists.' });
    }

    const changes = await itemCategoryModel.updateCategory(idNum, {
      categories: name,
      description: desc,
    });

    if (!changes) return res.status(404).json({ error: 'Category not found.' });

    const updated = await itemCategoryModel.getCategoryById(idNum);
    return res.json({ success: true, category: updated });
  } catch {
    return res.status(500).json({ error: 'Server error.' });
  }
};
