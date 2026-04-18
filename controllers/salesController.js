const db = require('../database/db');

// List sales with filters
exports.listSales = (req, res) => {
  const {
    category_id,
    sales_code,
    customer_name,
    contact_number,
    batch_no,
    from_date,
    to_date,
    limit = 30,
    offset = 0,
  } = req.query;

  let sql = `SELECT s.id, s.sales_code, s.customer_name, s.contact_number, s.total, s.received_amount, s.paid_amount, s.status, s.due_amount, s.discount, s.created_at, s.batch_no, s.category_id
    FROM sales s
    WHERE 1=1`;
  const params = [];

  if (category_id) {
    sql += ' AND s.category_id = ?';
    params.push(category_id);
  }
  if (sales_code) {
    sql += ' AND s.sales_code LIKE ?';
    params.push(`%${sales_code}%`);
  }
  if (customer_name) {
    sql += ' AND s.customer_name LIKE ?';
    params.push(`%${customer_name}%`);
  }
  if (contact_number) {
    sql += ' AND s.contact_number LIKE ?';
    params.push(`%${contact_number}%`);
  }
  if (batch_no) {
    sql += ' AND s.batch_no LIKE ?';
    params.push(`%${batch_no}%`);
  }
  if (from_date) {
    sql += ' AND date(s.created_at) >= date(?)';
    params.push(from_date);
  }
  if (to_date) {
    sql += ' AND date(s.created_at) <= date(?)';
    params.push(to_date);
  }

  sql += ' ORDER BY s.created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error.' });
    res.json({ sales: rows });
  });
};
