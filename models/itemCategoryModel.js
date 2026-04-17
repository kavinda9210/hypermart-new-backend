/*
 * models/itemCategoryModel.js
 * Data-access layer for item_categories table.
 */

const db = require('../config/db');

exports.listCategories = () =>
  new Promise((resolve, reject) => {
    db.all(
      `
      SELECT id, categories, description, created_at, updated_at
      FROM item_categories
      ORDER BY id DESC
      `,
      [],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      }
    );
  });

exports.getCategoryByName = (name) =>
  new Promise((resolve, reject) => {
    db.get(
      'SELECT id, categories, description, created_at, updated_at FROM item_categories WHERE LOWER(categories) = LOWER(?)',
      [name],
      (err, row) => {
        if (err) return reject(err);
        resolve(row || null);
      }
    );
  });

exports.createCategory = ({ categories, description }) =>
  new Promise((resolve, reject) => {
    const now = new Date().toISOString();

    db.run(
      `
      INSERT INTO item_categories (
        categories,
        description,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?)
      `,
      [categories, description, now, now],
      function (err) {
        if (err) return reject(err);
        resolve({
          id: this.lastID,
          categories,
          description,
          created_at: now,
          updated_at: now,
        });
      }
    );
  });
