// controllers/billingController.js

const itemModel = require('../models/itemModel');
const db = require('../config/db');
const { randomUUID } = require('crypto');

const DEFAULT_ITEM_IMAGE_URL = '/upload/items/default.png';

const toImageUrl = (imagePath) => {
  const raw = String(imagePath || '').trim();
  if (!raw) return DEFAULT_ITEM_IMAGE_URL;
  return raw.startsWith('/') ? raw : `/${raw}`;
};

const withImageUrl = (item) => {
  if (!item) return item;
  return { ...item, image_url: toImageUrl(item.image_path) };
};

// Helper function to escape HTML
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Helper function to generate bill HTML
function generateBillHTML(data) {
  const {
    salesCode,
    date,
    customer,
    items,
    totals,
    payment,
    user,
    pricing_mode
  } = data;

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-LK', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num || 0);
  };

  const formatDate = (d) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const formatTime = (d) => {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const itemsHtml = items.map((item, index) => `
    <tr style="border-bottom: 1px dashed #ccc;">
      <td style="padding: 4px 2px; width: 10%;">${index + 1}</td>
      <td style="padding: 4px 2px; width: 40%;">
        ${escapeHtml(item.item_name)}<br/>
        <small style="color: #666;">${escapeHtml(item.item_code)}</small>
      </td>
      <td style="padding: 4px 2px; width: 15%; text-align: center;">${item.quantity}</td>
      <td style="padding: 4px 2px; width: 15%; text-align: right;">${formatNumber(item.price)}</td>
      <td style="padding: 4px 2px; width: 20%; text-align: right;">${formatNumber(item.subtotal)}</td>
    </tr>
  `).join('');

  const ciType = totals.dueAmount > 0 ? 'CREDIT' : 'DEBIT';
  
  // Get customer name - handle both object and direct value
  let customerName = 'WALK-IN CUSTOMER';
  let customerVatNo = '-';
  
  if (customer) {
    if (typeof customer === 'object') {
      customerName = customer.customer_name || 'WALK-IN CUSTOMER';
      customerVatNo = customer.vat_number || '-';
    } else if (typeof customer === 'string') {
      customerName = customer;
    }
  }

  // Get payment type display
  let paymentTypeDisplay = payment.type;
  if (payment.split_payments && payment.split_payments.length > 1) {
    paymentTypeDisplay = 'SPLIT';
  } else if (payment.split_payments && payment.split_payments.length === 1) {
    paymentTypeDisplay = payment.split_payments[0].source_type;
  }

  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Sale Receipt #${escapeHtml(salesCode)}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            width: 75mm;
            margin: 0 auto;
            padding: 5px;
            background: white;
        }
        .header {
            text-align: center;
            margin-bottom: 10px;
            padding-bottom: 5px;
            border-bottom: 1px dashed #000;
        }
        .shop-name {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .shop-address {
            font-size: 10px;
            color: #555;
        }
        .shop-contact {
            font-size: 10px;
            font-weight: bold;
        }
        .sale-code {
            text-align: center;
            font-size: 14px;
            font-weight: bold;
            margin: 10px 0;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
            font-size: 10px;
        }
        .divider {
            border-top: 1px dashed #000;
            margin: 8px 0;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 8px 0;
        }
        .items-table th {
            text-align: left;
            border-bottom: 1px solid #000;
            padding: 4px 2px;
            font-size: 10px;
        }
        .totals {
            margin-top: 8px;
            border-top: 1px dashed #000;
            padding-top: 8px;
        }
        .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
            font-size: 11px;
        }
        .grand-total {
            font-weight: bold;
            font-size: 13px;
            margin-top: 5px;
            padding-top: 5px;
            border-top: 1px solid #000;
        }
        .footer {
            text-align: center;
            margin-top: 10px;
            padding-top: 8px;
            border-top: 1px dashed #000;
            font-size: 9px;
        }
        .thankyou {
            font-weight: bold;
            margin: 8px 0;
        }
        .text-right {
            text-align: right;
        }
        .text-center {
            text-align: center;
        }
        .bold {
            font-weight: bold;
        }
        @media print {
            body {
                margin: 0;
                padding: 0;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="shop-name">HYPERMART</div>
        <div class="shop-address">8th Mile Post, Kandy Road, Mawathagama</div>
        <div class="shop-contact">Tel: +94 77 361 0779</div>
    </div>

    <div class="sale-code">SALE CODE: ${escapeHtml(salesCode)}</div>

    <div class="info-row">
        <span>DATE: ${formatDate(date)}</span>
        <span>TIME: ${formatTime(date)}</span>
    </div>
    <div class="info-row">
        <span>CUS: ${escapeHtml(customerName)}</span>
        <span>VAT NO: ${escapeHtml(customerVatNo)}</span>
    </div>
    <div class="info-row">
        <span>PTYPE: ${escapeHtml(paymentTypeDisplay)}</span>
        <span>USER: ${escapeHtml(user)}</span>
    </div>
    <div class="info-row">
        <span>STYPE: ${escapeHtml(pricing_mode)}</span>
        <span>CI TYPE: ${ciType}</span>
    </div>

    <div class="divider"></div>

    <table class="items-table">
        <thead>
            <tr>
                <th>#</th>
                <th>ITEM</th>
                <th class="text-center">QTY</th>
                <th class="text-right">PRICE</th>
                <th class="text-right">AMOUNT</th>
            </tr>
        </thead>
        <tbody>
            ${itemsHtml}
        </tbody>
    </table>

    <div class="divider"></div>

    <div class="totals">
        <div class="total-row">
            <span>TOTAL</span>
            <span>${formatNumber(totals.subTotal)}</span>
        </div>
        ${totals.totalDiscount > 0 ? `
        <div class="total-row">
            <span>DISCOUNT</span>
            <span>${formatNumber(totals.totalDiscount)}</span>
        </div>
        ` : ''}
        <div class="total-row grand-total">
            <span>NET TOTAL</span>
            <span>${formatNumber(totals.grandTotal)}</span>
        </div>
        <div class="total-row">
            <span>RECEIVED</span>
            <span>${formatNumber(totals.receivedAmount)}</span>
        </div>
        <div class="total-row">
            <span>PAID</span>
            <span>${formatNumber(totals.paidAmount)}</span>
        </div>
        ${totals.changeAmount > 0 ? `
        <div class="total-row">
            <span>CHANGE</span>
            <span>${formatNumber(totals.changeAmount)}</span>
        </div>
        ` : ''}
        ${totals.dueAmount > 0 ? `
        <div class="total-row bold" style="color: red;">
            <span>DUE AMOUNT</span>
            <span>${formatNumber(totals.dueAmount)}</span>
        </div>
        ` : ''}
        <div class="total-row">
            <span>NO OF ITEMS</span>
            <span>${items.length}</span>
        </div>
        <div class="total-row">
            <span>TOTAL QTY</span>
            <span>${items.reduce((sum, i) => sum + i.quantity, 0)}</span>
        </div>
    </div>

    ${payment.split_payments && payment.split_payments.length > 0 ? `
    <div class="divider"></div>
    <div class="totals">
        <div class="total-row bold">
            <span>SPLIT PAYMENTS</span>
            <span></span>
        </div>
        ${payment.split_payments.map(sp => `
        <div class="total-row">
            <span>${escapeHtml(sp.source_type)}</span>
            <span>${formatNumber(sp.amount)}</span>
        </div>
        `).join('')}
    </div>
    ` : ''}

    <div class="divider"></div>

    <div class="footer">
        <div class="thankyou">THANK YOU! VISIT AGAIN</div>
        <div>Exchange within 07 days if item is in good condition.</div>
        <div>Bill must be produced for claims.</div>
        <div style="margin-top: 5px; font-size: 8px;">Powered by Silicon Radon Networks (Pvt) Ltd.</div>
    </div>
</body>
</html>`;
}

/**
 * GET /api/billing/search-items
 */
exports.searchItems = async (req, res) => {
  const { search, pricing_mode = 'retail' } = req.query;
  
  console.log('[SearchItems] Request received:', { search, pricing_mode });
  
  if (!search || !String(search).trim()) {
    return res.json({ items: [], total: 0 });
  }
  
  try {
    let item = await itemModel.getItemByBarcode(search, pricing_mode);
    
    if (item) {
      return res.json({ items: [withImageUrl(item)], total: 1 });
    }
    
    const items = await itemModel.searchItemsForBilling(search, pricing_mode, 20);
    return res.json({ items: (items || []).map(withImageUrl), total: items.length });
  } catch (err) {
    console.error('[SearchItems] Error:', err);
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
};

/**
 * GET /api/billing/items
 */
exports.listItems = async (req, res) => {
  const {
    pricing_mode = 'retail',
    limit = '60',
    offset = '0',
    include_out_of_stock = '1',
  } = req.query;

  const safeLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 60, 1), 500);
  const safeOffset = Math.max(Number.parseInt(offset, 10) || 0, 0);
  const includeOutOfStock = String(include_out_of_stock) !== '0';

  try {
    const [items, total] = await Promise.all([
      itemModel.listItemsForBilling({
        pricingMode: pricing_mode,
        limit: safeLimit,
        offset: safeOffset,
        includeOutOfStock,
      }),
      itemModel.countItemsForBilling({ includeOutOfStock }),
    ]);

    return res.json({ items: (items || []).map(withImageUrl), total, limit: safeLimit, offset: safeOffset });
  } catch (err) {
    console.error('[BillingItems] Error:', err);
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
};

/**
 * GET /api/billing/hold-orders
 */
exports.listHoldOrders = async (req, res) => {
  const userId = req.user?.id;

  try {
    const query = `
      SELECT 
        bs.id,
        bs.session_code,
        bs.customers_id,
        c.customer_name,
        bs.created_at,
        bs.total_items,
        bs.grand_total,
        bs.pricing_mode,
        bs.bill_name
      FROM billing_sessions bs
      LEFT JOIN customers c ON c.id = bs.customers_id
      WHERE bs.status = 'active'
        AND bs.users_id = ?
      ORDER BY bs.created_at DESC
    `;
    
    db.all(query, [userId], (err, rows) => {
      if (err) {
        console.error('[ListHoldOrders] DB Error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ holdOrders: rows || [] });
    });
  } catch (err) {
    console.error('[ListHoldOrders] Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * GET /api/billing/hold/:id
 */
exports.getHoldOrder = async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;

  try {
    const session = await new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM billing_sessions WHERE id = ? AND users_id = ? AND status = 'active'`,
        [id, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!session) {
      return res.status(404).json({ error: 'Hold order not found' });
    }

    const sessionItems = await new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM billing_session_items WHERE billing_session_id = ?`,
        [id],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    const cartItems = sessionItems.map(sessionItem => ({
      id: sessionItem.items_id,
      price: sessionItem.price,
      quantity: sessionItem.quantity,
      discount_percentage: sessionItem.discount_percentage,
      discount_amount: sessionItem.discount_amount,
      subtotal: sessionItem.subtotal
    }));

    res.json({
      session,
      cart_items: cartItems,
      pricing_mode: session.pricing_mode
    });
  } catch (err) {
    console.error('[GetHoldOrder] Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * POST /api/billing/hold
 */
exports.saveHoldOrder = async (req, res) => {
  const { bill_name, cart_items, totals, pricing_mode, discount } = req.body;
  const userId = req.user?.id;

  if (!bill_name || !bill_name.trim()) {
    return res.status(400).json({ error: 'Bill name is required' });
  }

  if (!cart_items || !cart_items.length) {
    return res.status(400).json({ error: 'Cannot hold empty cart' });
  }

  const now = new Date().toISOString();
  const sessionId = randomUUID();
  const sessionCode = `HOLD${Date.now()}`;

  try {
    await new Promise((resolve, reject) => {
      db.run('BEGIN TRANSACTION', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO billing_sessions (
          id, session_code, bill_name, customers_id, users_id, pricing_mode,
          total_items, total_quantity, total_amount, grand_total,
          discount_amount, discount_percentage, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sessionId, sessionCode, bill_name, null, userId,
          pricing_mode || 'retail', cart_items.length, totals.totalQuantity || 0,
          totals.totalAmount || 0, totals.grandTotal || 0, discount?.amount || 0,
          discount?.percentage || 0, 'active', now, now
        ],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    const stmt = db.prepare(
      `INSERT INTO billing_session_items (
        billing_session_id, items_id, quantity, price,
        discount_percentage, discount_amount, subtotal, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    for (const item of cart_items) {
      await new Promise((resolve, reject) => {
        stmt.run([
          sessionId, item.id, item.quantity, item.price,
          item.discount_percentage || 0, item.discount_amount || 0,
          item.subtotal, now, now
        ], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    stmt.finalize();

    await new Promise((resolve, reject) => {
      db.run('COMMIT', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.status(201).json({
      success: true,
      message: 'Order held successfully',
      hold_id: sessionId
    });
  } catch (err) {
    await new Promise((resolve) => { db.run('ROLLBACK', () => resolve()); });
    console.error('[SaveHoldOrder] Error:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
};

/**
 * DELETE /api/billing/hold/:id
 */
exports.deleteHoldOrder = async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;

  try {
    await new Promise((resolve, reject) => {
      db.run('BEGIN TRANSACTION', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const session = await new Promise((resolve, reject) => {
      db.get(
        `SELECT id FROM billing_sessions WHERE id = ? AND users_id = ?`,
        [id, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!session) {
      await new Promise((resolve) => { db.run('ROLLBACK', () => resolve()); });
      return res.status(404).json({ error: 'Hold order not found' });
    }

    await new Promise((resolve, reject) => {
      db.run(`DELETE FROM billing_session_items WHERE billing_session_id = ?`, [id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    await new Promise((resolve, reject) => {
      db.run(`DELETE FROM billing_sessions WHERE id = ?`, [id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    await new Promise((resolve, reject) => {
      db.run('COMMIT', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({ success: true });
  } catch (err) {
    await new Promise((resolve) => { db.run('ROLLBACK', () => resolve()); });
    console.error('[DeleteHoldOrder] Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * GET /api/billing/payment-sources
 */
exports.getPaymentSources = async (req, res) => {
  try {
    const sources = {
      systemCash: [
        { id: 'cashbook', name: 'Cash Book', balance: 0 },
        { id: 'petty_cash', name: 'Petty Cash', balance: 0 }
      ],
      bankAccounts: [],
      cheques: []
    };

    // Get cash book balance
    await new Promise((resolve) => {
      db.get(`SELECT amount FROM sys_cash WHERE name = 'cashbook'`, (err, row) => {
        if (!err && row && sources.systemCash[0]) {
          sources.systemCash[0].balance = row.amount || 0;
        }
        resolve();
      });
    });

    // Get petty cash balance
    await new Promise((resolve) => {
      db.get(`SELECT amount FROM sys_cash WHERE name = 'petty_cash'`, (err, row) => {
        if (!err && row && sources.systemCash[1]) {
          sources.systemCash[1].balance = row.amount || 0;
        }
        resolve();
      });
    });

    res.json({ success: true, sources });
  } catch (err) {
    console.error('[GetPaymentSources] Error:', err);
    res.json({
      success: true,
      sources: {
        systemCash: [
          { id: 'cashbook', name: 'Cash Book', balance: 0 },
          { id: 'petty_cash', name: 'Petty Cash', balance: 0 }
        ],
        bankAccounts: [],
        cheques: []
      }
    });
  }
};

/**
 * POST /api/billing/process-payment
 */
exports.processPayment = async (req, res) => {
  const {
    customer_id,
    cart_items,
    totals,
    discount,
    payment,
    split_payments,
    pricing_mode,
    sales_note,
    is_credit_bill
  } = req.body;

  const userId = req.user?.id;
  const userName = req.user?.name || req.user?.email || 'ADMIN';

  // Validation
  if (!cart_items || !cart_items.length) {
    return res.status(400).json({ error: 'No items in cart' });
  }

  if (!payment || payment.received_amount === undefined) {
    return res.status(400).json({ error: 'Payment information required' });
  }

  try {
    // Check stock availability
    for (const item of cart_items) {
      if (item.quantity > (item.stock_quantity || 0)) {
        return res.status(400).json({
          error: `Insufficient stock for ${item.item_name}. Available: ${item.stock_quantity || 0}`
        });
      }
    }

    // Calculate amounts
    const subTotal = totals.totalAmount || 0;
    const totalDiscount = discount?.amount || totals.totalDiscount || 0;
    const grandTotal = subTotal - totalDiscount;
    const receivedAmount = parseFloat(payment.received_amount) || 0;
    const changeAmount = Math.max(0, receivedAmount - grandTotal);
    const paidAmount = is_credit_bill ? 0 : Math.min(receivedAmount, grandTotal);
    const dueAmount = is_credit_bill ? grandTotal : Math.max(0, grandTotal - receivedAmount);

    let paymentStatus = 'PAID';
    if (is_credit_bill) {
      paymentStatus = 'UNPAID';
    } else if (dueAmount > 0) {
      paymentStatus = dueAmount === grandTotal ? 'UNPAID' : 'PARTIAL';
    }

    const now = new Date();
    const nowISO = now.toISOString();
    const saleId = randomUUID();
    const salesCode = `SALE-${Date.now().toString(36).toUpperCase()}`;

    // Get customer details
    let customerDetails = null;
    if (customer_id) {
      customerDetails = await new Promise((resolve, reject) => {
        db.get(
          `SELECT customer_name, contact_number, vat_number, address_line_1, city_name 
           FROM customers WHERE id = ?`,
          [customer_id],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });
    }

    // Begin transaction
    await new Promise((resolve, reject) => {
      db.run('BEGIN TRANSACTION', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // 1. Create sale
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO sales (id, sales_code, customers_id, users_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [saleId, salesCode, customer_id || null, userId, nowISO, nowISO],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // 2. Create sale items and deduct stock
    const saleItems = [];
    for (const item of cart_items) {
      const discountAmount = (item.price * item.quantity) * (item.discount_percentage / 100);
      const subtotal = (item.price * item.quantity) - discountAmount;
      
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO sales_items (items_id, sales_id, price, quantity, discount_type, discount, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [item.id, saleId, item.price, item.quantity, 'PERCENTAGE', item.discount_percentage || 0, nowISO, nowISO],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      // Deduct stock
      await new Promise((resolve, reject) => {
        db.run(
          `UPDATE items SET quantity = quantity - ?, updated_at = ? WHERE id = ?`,
          [item.quantity, nowISO, item.id],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      saleItems.push({
        id: item.id,
        item_code: item.item_code,
        item_name: item.item_name,
        quantity: item.quantity,
        price: item.price,
        discount_percentage: item.discount_percentage || 0,
        discount_amount: discountAmount,
        subtotal: subtotal
      });
    }

    // 3. Create payment record
    const splitSources = split_payments && split_payments.length > 0 ? split_payments : [];
    const paymentType = splitSources.length > 1 ? 'SPLIT' : (payment.payment_type || 'CASH');

    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO payments (
          id, sales_id, users_id, sub_total, grand_total,
          paid_amount, received_amount, change_return_amount, due_amount,
          discount_type, discount, payment_type, payment_status, sales_note, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          randomUUID(), saleId, userId, subTotal, grandTotal,
          paidAmount, receivedAmount, changeAmount, dueAmount,
          'FIXED', totalDiscount, paymentType, paymentStatus, sales_note || null, nowISO, nowISO
        ],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // 4. Create customer transaction if credit bill or due exists
    if (customer_id && dueAmount > 0) {
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO customer_transactions (
            customer_id, amount, type, source_type, source_id,
            transaction_date, description, performed_by, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            customer_id, dueAmount, 'credit', 'customer_invoice', saleId,
            nowISO.split('T')[0], `Invoice ${salesCode} - Credit Sale`, userId, nowISO, nowISO
          ],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      // Update customer balance
      await new Promise((resolve, reject) => {
        db.run(
          `UPDATE customers SET 
            current_balance = COALESCE(current_balance, 0) + ?,
            due_amount = COALESCE(due_amount, 0) + ?,
            updated_at = ? 
           WHERE id = ?`,
          [dueAmount, dueAmount, nowISO, customer_id],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }

    // 5. Commit transaction
    await new Promise((resolve, reject) => {
      db.run('COMMIT', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // 6. Generate Bill HTML
    const billHtml = generateBillHTML({
      salesCode,
      date: now,
      customer: customerDetails,
      items: saleItems,
      totals: {
        subTotal,
        totalDiscount,
        grandTotal,
        receivedAmount,
        paidAmount,
        changeAmount,
        dueAmount
      },
      payment: {
        type: paymentType,
        split_payments: splitSources
      },
      user: userName,
      pricing_mode: pricing_mode?.toUpperCase() || 'RETAIL'
    });

    res.status(201).json({
      success: true,
      message: 'Sale completed successfully',
      sale_id: saleId,
      sales_code: salesCode,
      bill_html: billHtml,
      invoice: {
        sale_id: saleId,
        sales_code: salesCode,
        date: nowISO,
        grand_total: grandTotal,
        paid_amount: paidAmount,
        due_amount: dueAmount,
        change_amount: changeAmount
      }
    });

  } catch (err) {
    await new Promise((resolve) => { db.run('ROLLBACK', () => resolve()); });
    console.error('[ProcessPayment] Error:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
};

/**
 * GET /api/billing/customers/search
 */
exports.searchCustomers = async (req, res) => {
  const { search } = req.query;

  if (!search || !search.trim()) {
    return res.json({ customers: [] });
  }

  try {
    const searchPattern = `%${search.trim()}%`;
    const query = `
      SELECT id, customer_name, contact_number, due_amount, current_balance
      FROM customers
      WHERE customer_name LIKE ? OR contact_number LIKE ? OR customer_code LIKE ?
      ORDER BY customer_name ASC
      LIMIT 20
    `;

    db.all(query, [searchPattern, searchPattern, searchPattern], (err, rows) => {
      if (err) {
        console.error('[SearchCustomers] Error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ customers: rows || [] });
    });
  } catch (err) {
    console.error('[SearchCustomers] Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * POST /api/billing/customers
 */
exports.createCustomer = async (req, res) => {
  const { customer_name, contact_number, email, address, city } = req.body;

  if (!customer_name || !customer_name.trim()) {
    return res.status(400).json({ error: 'Customer name is required' });
  }

  if (!contact_number || !contact_number.trim()) {
    return res.status(400).json({ error: 'Contact number is required' });
  }

  const now = new Date().toISOString();
  const customerId = `CUST${Date.now()}`;

  try {
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO customers (id, customer_name, contact_number, email, address_line_1, city_name, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [customerId, customer_name.trim(), contact_number.trim(), email || null, address || null, city || null, now, now],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.status(201).json({
      success: true,
      customer: {
        id: customerId,
        customer_name: customer_name.trim(),
        contact_number: contact_number.trim()
      }
    });
  } catch (err) {
    console.error('[CreateCustomer] Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};