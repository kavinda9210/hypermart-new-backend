const db = require('../config/db');

exports.getAmounts = (req, res) => {
  const queries = [
    `SELECT IFNULL(SUM(grand_total),0) as total_sales FROM payments`,
    `SELECT IFNULL(SUM(due_amount),0) as total_due FROM payments`,
    `SELECT IFNULL(SUM(amount),0) as total_expenses FROM expenses`,
    `SELECT IFNULL(SUM(received_amount),0) as total_received FROM payments`,
    `SELECT IFNULL(SUM(grand_total),0) as today_sales FROM payments WHERE date(created_at) = date('now')`,
    `SELECT IFNULL(SUM(amount),0) as today_expenses FROM expenses WHERE date(expense_date) = date('now')`
  ];
  let results = [];
  let completed = 0;
  queries.forEach((q, i) => {
    db.get(q, [], (err, row) => {
      results[i] = row ? Object.values(row)[0] : 0;
      completed++;
      if (completed === queries.length) {
        res.json({
          total_sales: results[0],
          total_due: results[1],
          total_expenses: results[2],
          total_received: results[3],
          today_sales: results[4],
          today_expenses: results[5],
        });
      }
    });
  });
};

exports.getSummary = (req, res) => {
  const queries = [
    `SELECT COUNT(*) as customers FROM customers`,
    `SELECT COUNT(*) as suppliers FROM suppliers`,
    `SELECT COUNT(*) as items FROM items`,
    `SELECT COUNT(*) as sales_invoices FROM sales`
  ];
  let results = [];
  let completed = 0;
  queries.forEach((q, i) => {
    db.get(q, [], (err, row) => {
      results[i] = row ? Object.values(row)[0] : 0;
      completed++;
      if (completed === queries.length) {
        res.json({
          customers: results[0],
          suppliers: results[1],
          items: results[2],
          sales_invoices: results[3],
        });
      }
    });
  });
};

exports.getMonthlySales = (req, res) => {
  const sql = `SELECT strftime('%m', created_at) as month, SUM(grand_total) as total FROM payments WHERE created_at >= date('now', '-1 year') GROUP BY month`;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    // Fill all months with 0 if missing
    const data = Array(12).fill(0);
    rows.forEach(r => {
      const idx = parseInt(r.month, 10) - 1;
      if (idx >= 0 && idx < 12) data[idx] = r.total;
    });
    res.json({ monthlySales: data });
  });
};

exports.getStockAlert = (req, res) => {
  const sql = `SELECT item_name, quantity, minimum_qty FROM items WHERE quantity <= minimum_qty LIMIT 10`;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ stockAlert: rows });
  });
};

exports.getExpiryAlert = (req, res) => {
  const sql = `SELECT items.item_name, stock_updates.exp_date FROM items JOIN stock_updates ON items.id = stock_updates.items_id WHERE stock_updates.exp_date IS NOT NULL AND stock_updates.exp_date != '' AND stock_updates.exp_date <= date('now', '+30 days') LIMIT 10`;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ expiryAlert: rows });
  });
};
