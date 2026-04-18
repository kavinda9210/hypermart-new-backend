// GET /api/sales/:saleId/details
// Returns: sale info, customer, latest payment, and all items for the sale
exports.getSaleDetails = (req, res) => {
  const saleId = req.params.saleId;
  if (!saleId) return res.status(400).json({ error: 'Missing saleId' });

  // Get sale, customer, user, latest payment
  const saleSql = `
    SELECT s.id as sale_id, s.sales_code, s.created_at, c.customer_name, c.contact_number, u.name as sales_person
    FROM sales s
    LEFT JOIN customers c ON c.id = s.customers_id
    LEFT JOIN users u ON u.id = s.users_id
    WHERE s.id = ?
  `;
  // Get latest payment for this sale
  const paymentSql = `
    SELECT * FROM payments WHERE sales_id = ? ORDER BY datetime(created_at) DESC LIMIT 1
  `;
  // Get all items for this sale
  const itemsSql = `
    SELECT si.id as sales_item_id, i.item_name, si.quantity, si.price, si.return_quantity, si.status
    FROM sales_items si
    LEFT JOIN items i ON i.id = si.items_id
    WHERE si.sales_id = ?
  `;

  const db = require('../config/db');
  db.get(saleSql, [saleId], (err, saleRow) => {
    if (err) return res.status(500).json({ error: 'Database error (sale).' });
    if (!saleRow) return res.status(404).json({ error: 'Sale not found.' });
    db.get(paymentSql, [saleId], (err2, paymentRow) => {
      if (err2) return res.status(500).json({ error: 'Database error (payment).' });
      db.all(itemsSql, [saleId], (err3, itemsRows) => {
        if (err3) return res.status(500).json({ error: 'Database error (items).' });
        res.json({
          sale: saleRow,
          payment: paymentRow || {},
          items: itemsRows || []
        });
      });
    });
  });
};
// GET /api/sales/due-amount
// Returns: invoice (sales_code), customer, phone, item, invoiceAmount, receivedAmount, due, createdBy, date
exports.listDueAmounts = (req, res) => {
  // Filters (optional, not implemented yet)
  // const { fromDate, toDate, customer, customerId, phone, itemCode, createdBy } = req.query;

  // For each sale, get latest payment (for due/received), customer, item, user
  const sql = `
    SELECT
      s.sales_code AS invoice,
      c.customer_name AS customer,
      c.contact_number AS phone,
      i.item_name AS item,
      p.grand_total AS invoiceAmount,
      p.received_amount AS receivedAmount,
      p.due_amount AS due,
      u.name AS createdBy,
      s.created_at AS date
    FROM sales s
    LEFT JOIN customers c ON c.id = s.customers_id
    LEFT JOIN (
      SELECT p1.* FROM payments p1
      INNER JOIN (
        SELECT sales_id, MAX(datetime(created_at)) AS max_created
        FROM payments
        GROUP BY sales_id
      ) p2 ON p1.sales_id = p2.sales_id AND datetime(p1.created_at) = p2.max_created
    ) p ON p.sales_id = s.id
    LEFT JOIN sales_items si ON si.sales_id = s.id
    LEFT JOIN items i ON i.id = si.items_id
    LEFT JOIN users u ON u.id = s.users_id
    WHERE p.due_amount IS NOT NULL AND p.due_amount > 0
    GROUP BY s.id, si.id
    ORDER BY datetime(s.created_at) DESC
    LIMIT 100
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error.' });
    res.json({ dueAmounts: rows || [] });
  });
};
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
      s.id AS sale_id,
      s.sales_code,
      s.created_at,
      c.customer_name,
      c.contact_number,
      si.id AS sales_item_id,
      i.item_code,
      i.item_name,
      ic.categories AS category,
      si.quantity,
      si.price,
      si.discount,
      si.status
    FROM sales s
    LEFT JOIN customers c ON c.id = s.customers_id
    LEFT JOIN sales_items si ON si.sales_id = s.id
    LEFT JOIN items i ON i.id = si.items_id
    LEFT JOIN item_categories ic ON ic.id = i.item_categories_id
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
    sql += ` AND i.item_categories_id = ?`;
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
