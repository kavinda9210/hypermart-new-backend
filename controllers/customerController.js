// backend/controllers/customerController.js
const customerModel = require('../models/customerModel');
const userModel = require('../models/userModel');


/**
 * GET /api/customers/:id
 * Get a single customer by ID
 */
exports.getCustomerById = async (req, res) => {
  const { id } = req.params;
  try {
    const customer = await customerModel.getCustomerById(id);
    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found.' });
    }
    return res.json({ success: true, customer });
  } catch (err) {
    console.error('[GetCustomerById] Error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
};

/**
 * PUT /api/customers/:id
 * Update a customer by ID
 */
exports.updateCustomer = async (req, res) => {
  const { id } = req.params;
  const data = req.body || {};
  try {
    const updated = await customerModel.updateCustomer(id, data);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Customer not found.' });
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('[UpdateCustomer] Error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
};
/**
 * GET /api/customers
 * List all customers (for customer list page)
 */
exports.listCustomers = async (req, res) => {
  try {
    const customers = await customerModel.listCustomers();
    return res.json({ success: true, customers });
  } catch (err) {
    console.error('[ListCustomers] Error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
};


/**
 * POST /api/customers
 * Create a new customer.
 */
exports.createCustomer = async (req, res) => {
  // Debug: log user info and permissions
  try {
    const userId = req.user?.id;
    let perms = [];
    if (userId) {
      perms = await userModel.listPermissionsForUser(userId);
    }
    console.log('[AddCustomer] userId:', userId, 'permissions:', perms.map(p => p.permissions_name));
  } catch (e) {
    console.log('[AddCustomer] Debug error:', e);
  }
  const raw = req.body || {};

  const parseNumber = (v, fallback = 0) => {
    if (v === null || v === undefined || v === '') return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };

  const data = {
    customer_name: raw.customer_name ?? raw.name,
    is_company: raw.is_company ?? raw.isCompany,
    vat_number: raw.vat_number ?? raw.vatNumber,
    vat_document: raw.vat_document ?? raw.vatDocument,
    contact_number: raw.contact_number ?? raw.Mobile_Number ?? raw.mobile_number,
    contact_number_2: raw.contact_number_2 ?? raw.mobile_number_2,
    email: raw.email,
    gender: raw.gender,
    dob: raw.dob,
    nic: raw.nic,
    cities_id: raw.cities_id ?? raw.citiesId ?? raw.city_id ?? raw.cityId ?? raw.city,
    city_name: raw.city_name ?? raw.cityName,
    address_line_1: raw.address_line_1 ?? raw.address1 ?? raw.addl1,
    address_line_2: raw.address_line_2 ?? raw.address2 ?? raw.addl2,
    due_amount: parseNumber(raw.due_amount ?? raw.due),
    opening_balance: parseNumber(raw.opening_balance),
    opening_balance_type: raw.opening_balance_type,
    credit_limit: parseNumber(raw.credit_limit),
    status_id: raw.status_id ?? 1,
    user_id: raw.user_id ?? req.user?.id,
    id: raw.id,
  };

  // Basic validation
  if (!data.customer_name || !String(data.customer_name).trim() || !data.contact_number || !String(data.contact_number).trim()) {
    return res.status(400).json({ error: 'Customer name and contact number are required.' });
  }
  try {
    const id = await customerModel.createCustomer(data);
    return res.status(201).json({ success: true, id });
  } catch (err) {
    console.error('[AddCustomer] Error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
};

/**
 * GET /api/customers/:id/transactions
 * Get customer transaction history with filters
 */
exports.getCustomerTransactions = async (req, res) => {
  const { id } = req.params;
  const { date_from, date_to, transaction_type } = req.query;
  
  try {
    // First check if customer exists
    const customer = await customerModel.getCustomerBasicInfo(id);
    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found.' });
    }
    
    // Get transactions
    const transactions = await customerModel.getCustomerTransactions(id, {
      date_from,
      date_to,
      transaction_type
    });
    
    // Get summary
    const summary = await customerModel.getCustomerTransactionSummary(id, {
      date_from,
      date_to
    });
    
    // Calculate net balance (credits - debits) - positive means customer owes us
    const netBalance = summary.total_credits - summary.total_debits;
    
    return res.json({
      success: true,
      customer: {
        id: customer.id,
        name: customer.customer_name,
        code: customer.customer_code,
        contact: customer.contact_number,
        dueAmount: customer.due_amount || 0,
        currentBalance: customer.current_balance || 0,
        openingBalance: customer.opening_balance || 0,
        openingBalanceType: customer.opening_balance_type || 'credit',
        creditLimit: customer.credit_limit || 0
      },
      summary: {
        totalDebits: summary.total_debits,
        totalCredits: summary.total_credits,
        netBalance: netBalance,
        debitCount: summary.debit_count,
        creditCount: summary.credit_count,
        breakdown: {
          invoices: {
            total: summary.invoice_total,
            count: summary.invoice_count
          },
          deposits: {
            total: summary.deposit_total,
            count: summary.deposit_count
          },
          cheques: {
            total: summary.cheque_total,
            count: summary.cheque_count
          },
          oilSales: {
            total: summary.oil_sale_total,
            count: summary.oil_sale_count
          }
        }
      },
      transactions: transactions.map(t => ({
        id: t.id,
        date: t.transaction_date,
        type: t.type,
        sourceType: t.source_type,
        transactionType: t.transaction_type,
        amount: t.amount,
        description: t.description || this.getTransactionDescription(t),
        referenceNumber: t.reference_number,
        invoiceCode: t.invoice_code,
        chequeNumber: t.cheque_number,
        chequeStatus: t.cheque_status,
        performedBy: t.performed_by,
        createdAt: t.created_at
      }))
    });
  } catch (err) {
    console.error('[GetCustomerTransactions] Error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
};

/**
 * Helper to generate description if not available
 */
getTransactionDescription = (transaction) => {
  if (transaction.description) return transaction.description;
  
  if (transaction.source_type === 'customer_invoice') {
    return `Invoice ${transaction.invoice_code || ''} - ${transaction.type === 'credit' ? 'Credit Bill' : 'Debit Note'}`;
  }
  if (transaction.source_type === 'customer_deposit') {
    return `Customer Deposit - ${transaction.type === 'credit' ? 'Payment Received' : 'Refund Given'}`;
  }
  if (transaction.source_type === 'cheque') {
    return `Cheque ${transaction.cheque_number || ''} - ${transaction.status || 'Transaction'}`;
  }
  if (transaction.source_type === 'oil_sale') {
    return `Oil Sale Transaction`;
  }
  
  return `${transaction.source_type || 'Transaction'} - ${transaction.type}`;
};

/**
 * GET /api/customers/:id/transaction-detail/:transactionId
 * Get single transaction details
 */
exports.getTransactionDetail = async (req, res) => {
  const { id, transactionId } = req.params;
  
  try {
    const transaction = await customerModel.getTransactionById(transactionId, id);
    if (!transaction) {
      return res.status(404).json({ success: false, error: 'Transaction not found.' });
    }
    
    // Get additional details based on source type
    let details = null;
    if (transaction.source_type === 'customer_invoice') {
      details = await customerModel.getInvoiceDetails(transaction.source_id);
    } else if (transaction.source_type === 'cheque') {
      details = await customerModel.getChequeDetails(transaction.source_id);
    }
    
    return res.json({
      success: true,
      transaction,
      details
    });
  } catch (err) {
    console.error('[GetTransactionDetail] Error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
};
