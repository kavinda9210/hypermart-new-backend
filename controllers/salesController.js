const db = require('../config/db');

const toInt = (v, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
};

// GET /api/sales
// Query: category_id?, sales_code?, customer_name?, contact_number?, batch_no?, from_date?, to_date?, limit?, offset?
exports.listSales = (req, res) => {
  const {
    category_id,
    sales_code,
    customer_name,
    contact_number,
    batch_no,
    from_date,
    to_date,
  } = req.query;

  const limit = Math.max(1, toInt(req.query.limit, 30));
  const offset = Math.max(0, toInt(req.query.offset, 0));

  let sql = `
    SELECT
      s.id,
      s.sales_code,
      s.created_at,
      c.customer_name,
      c.contact_number,
      p.grand_total AS total,
      p.received_amount,
      p.paid_amount,
      p.payment_status AS status,
      p.due_amount,
      p.discount
    FROM sales s
    LEFT JOIN customers c ON c.id = s.customers_id
    LEFT JOIN payments p ON p.id = (
      SELECT p2.id
      FROM payments p2
      WHERE p2.sales_id = s.id
      ORDER BY datetime(p2.created_at) DESC
      LIMIT 1
    )
    WHERE 1=1
  `;
  const params = [];

  if (sales_code && String(sales_code).trim()) {
    sql += ' AND s.sales_code LIKE ?';
    params.push(`%${String(sales_code).trim()}%`);
  }
  if (customer_name && String(customer_name).trim()) {
    sql += ' AND c.customer_name LIKE ?';
    params.push(`%${String(customer_name).trim()}%`);
  }
  if (contact_number && String(contact_number).trim()) {
    sql += ' AND c.contact_number LIKE ?';
    params.push(`%${String(contact_number).trim()}%`);
  }

  // Filter by category if any item in the sale belongs to that category
  if (category_id && String(category_id).trim()) {
    sql += `
      AND EXISTS (
        SELECT 1
        FROM sales_items si
        JOIN items i ON i.id = si.items_id
        WHERE si.sales_id = s.id
          AND i.item_categories_id = ?
      )
    `;
    params.push(String(category_id).trim());
  }

  // Filter by batch no if any sales item came from a stock update with that batch
  if (batch_no && String(batch_no).trim()) {
    sql += `
      AND EXISTS (
        SELECT 1
        FROM sales_items si
        JOIN stock_updates su ON su.id = si.stock_update_id
        WHERE si.sales_id = s.id
          AND su.batch_no LIKE ?
      )
    `;
    params.push(`%${String(batch_no).trim()}%`);
  }

  if (from_date && String(from_date).trim()) {
    sql += ' AND date(s.created_at) >= date(?)';
    params.push(String(from_date).trim());
  }
  if (to_date && String(to_date).trim()) {
    sql += ' AND date(s.created_at) <= date(?)';
    params.push(String(to_date).trim());
  }

  sql += ' ORDER BY datetime(s.created_at) DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error.' });
    res.json({ sales: rows || [] });
  });
};

// GET /api/sales/returns
// Query: sale_code? (or search?), from_date?, to_date?, limit?, offset?
exports.listSalesReturns = (req, res) => {
  const saleCode = String(req.query.sale_code || req.query.search || '').trim();
  const fromDate = String(req.query.from_date || '').trim();
  const toDate = String(req.query.to_date || '').trim();
  const limit = Math.max(1, toInt(req.query.limit, 50));
  const offset = Math.max(0, toInt(req.query.offset, 0));

  let sql = `
    SELECT
      sri.id AS return_id,
      s.sales_code,
      COALESCE(sri.created_at, s.created_at) AS date,
      c.customer_name,
      i.item_name,
      si.quantity AS qty,
      sri.return_quantity AS returned,
      (sri.return_quantity * sri.price) AS refund,
      sri.price,
      sri.sales_id,
      sri.item_id
    FROM sales_return_items sri
    LEFT JOIN sales s ON s.id = sri.sales_id
    LEFT JOIN customers c ON c.id = s.customers_id
    LEFT JOIN items i ON i.id = sri.item_id
    LEFT JOIN sales_items si ON si.sales_id = sri.sales_id AND si.items_id = sri.item_id
    WHERE 1=1
  `;
  const params = [];

  if (saleCode) {
    sql += ' AND s.sales_code LIKE ?';
    params.push(`%${saleCode}%`);
  }
  if (fromDate) {
    sql += ' AND date(COALESCE(sri.created_at, s.created_at)) >= date(?)';
    params.push(fromDate);
  }
  if (toDate) {
    sql += ' AND date(COALESCE(sri.created_at, s.created_at)) <= date(?)';
    params.push(toDate);
  }

  sql += ' ORDER BY datetime(COALESCE(sri.created_at, s.created_at)) DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error.' });
    res.json({ returns: rows || [] });
  });
};
