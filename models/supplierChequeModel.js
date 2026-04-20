const db = require('../config/db');

const SupplierCheque = {
  async findAll({
    search = '',
    cheque_number = '',
    supplier_id = '',
    bank_name = '',
    cheque_status = '',
    payment_status = '',
    date_from = '',
    date_to = '',
    clearance_date_from = '',
    clearance_date_to = '',
    min_amount = '',
    max_amount = '',
    has_replacement = '',
    limit = 30,
    offset = 0,
    vat_enabled = '',
  }) {
    let sql = `SELECT * FROM supplier_cheques WHERE is_valid = 1`;
    const params = [];
    if (search) {
      sql += ` AND (cheque_number LIKE ? OR bank_name LIKE ? OR reference_number LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (cheque_number) {
      sql += ` AND cheque_number LIKE ?`;
      params.push(`%${cheque_number}%`);
    }
    if (supplier_id) {
      sql += ` AND supplier_id = ?`;
      params.push(supplier_id);
    }
    if (bank_name) {
      sql += ` AND bank_name LIKE ?`;
      params.push(`%${bank_name}%`);
    }
    if (cheque_status) {
      sql += ` AND cheque_status = ?`;
      params.push(cheque_status);
    }
    if (payment_status) {
      sql += ` AND payment_status = ?`;
      params.push(payment_status);
    }
    if (date_from) {
      sql += ` AND cheque_date >= ?`;
      params.push(date_from);
    }
    if (date_to) {
      sql += ` AND cheque_date <= ?`;
      params.push(date_to);
    }
    if (clearance_date_from) {
      sql += ` AND clearance_date >= ?`;
      params.push(clearance_date_from);
    }
    if (clearance_date_to) {
      sql += ` AND clearance_date <= ?`;
      params.push(clearance_date_to);
    }
    if (min_amount) {
      sql += ` AND amount >= ?`;
      params.push(min_amount);
    }
    if (max_amount) {
      sql += ` AND amount <= ?`;
      params.push(max_amount);
    }
    if (vat_enabled !== '') {
      sql += ` AND vat_enabled = ?`;
      params.push(vat_enabled);
    }
    if (has_replacement === 'yes') {
      sql += ` AND assigned_to_chq IS NOT NULL`;
    } else if (has_replacement === 'no') {
      sql += ` AND assigned_to_chq IS NULL`;
    } else if (has_replacement === 'is_replacement') {
      sql += ` AND id IN (SELECT assigned_to_chq FROM supplier_cheques WHERE assigned_to_chq IS NOT NULL)`;
    }
    const countSql = `SELECT COUNT(*) as count FROM (${sql})`;
    sql += ` ORDER BY cheque_date DESC, id DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));
    const cheques = await db.all(sql, params);
    const countRow = await db.get(countSql, params.slice(0, -2));
    return { cheques, totalCount: countRow ? countRow.count : 0 };
  },
};

module.exports = SupplierCheque;
