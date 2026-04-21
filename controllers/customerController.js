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
 * GET /api/customers/transactions
 * Get transactions across ALL customers (supports same filters)
 */
exports.getAllCustomerTransactions = async (req, res) => {
  const { date_from, date_to, transaction_type } = req.query;

  try {
    const transactions = await customerModel.getAllCustomerTransactions({
      date_from,
      date_to,
      transaction_type,
    });

    const summaryRaw = await customerModel.getAllCustomerTransactionSummary({
      date_from,
      date_to,
    });

    const netBalance = summaryRaw.total_credits - summaryRaw.total_debits;

    return res.json({
      success: true,
      summary: {
        totalDebits: summaryRaw.total_debits,
        totalCredits: summaryRaw.total_credits,
        netBalance: netBalance,
        debitCount: summaryRaw.debit_count,
        creditCount: summaryRaw.credit_count,
        breakdown: {
          invoices: {
            total: summaryRaw.invoice_total,
            count: summaryRaw.invoice_count,
          },
          deposits: {
            total: summaryRaw.deposit_total,
            count: summaryRaw.deposit_count,
          },
          cheques: {
            total: summaryRaw.cheque_total,
            count: summaryRaw.cheque_count,
          },
          oilSales: {
            total: summaryRaw.oil_sale_total,
            count: summaryRaw.oil_sale_count,
          },
        },
      },
      transactions: transactions.map((t) => ({
        id: t.id,
        customerId: t.customer_id,
        customerName: t.customer_name,
        customerCode: t.customer_code,
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
        createdAt: t.created_at,
      })),
    });
  } catch (err) {
    console.error('[GetAllCustomerTransactions] Error:', err);
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

/**
 * POST /api/customers/transactions
 * Create a new customer transaction
 * Note: File upload is handled separately via /api/upload/bank-slip
 */
exports.createTransaction = async (req, res) => {
  const {
    customer_id,
    vehicle_id,
    type,
    amount,
    source_from,
    split_enabled,
    split_sources,
    split_amounts,
    transaction_date,
    reference_number,
    description,
    performed_by,
    branch_id,
    bank_slip_path // This will come from the frontend after upload
  } = req.body;

  // Validation
  if (!customer_id) {
    return res.status(400).json({ error: 'Customer is required.' });
  }
  if (!type || !['debit', 'credit'].includes(type)) {
    return res.status(400).json({ error: 'Valid transaction type is required.' });
  }
  if (!transaction_date) {
    return res.status(400).json({ error: 'Transaction date is required.' });
  }
  if (!performed_by) {
    return res.status(400).json({ error: 'Performed by is required.' });
  }

  try {
    // Check if customer exists
    const customer = await customerModel.getCustomerBasicInfo(customer_id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    // Get current balance before transaction
    const balanceBefore = await customerModel.getCustomerBalance(customer_id);
    const currentBalance = balanceBefore.current_balance || 0;

    let transactionAmount = 0;
    let splitData = null;
    let sourceTransactions = [];

    if (split_enabled === '1' || split_enabled === true) {
      // Handle split payment
      if (!split_sources || !split_amounts) {
        return res.status(400).json({ error: 'Split payment requires at least one source and amount.' });
      }

      // Ensure arrays
      const sources = Array.isArray(split_sources) ? split_sources : [split_sources];
      const amounts = Array.isArray(split_amounts) ? split_amounts : [split_amounts];

      transactionAmount = amounts.reduce((sum, amt) => sum + (parseFloat(amt) || 0), 0);
      
      // Validate total amount
      if (transactionAmount <= 0) {
        return res.status(400).json({ error: 'Total transaction amount must be greater than 0.' });
      }

      splitData = sources.map((source, index) => ({
        source: source,
        amount: parseFloat(amounts[index]) || 0
      }));

      // Process each split source
      for (let i = 0; i < sources.length; i++) {
        const source = sources[i];
        const splitAmount = parseFloat(amounts[i]) || 0;
        
        if (splitAmount > 0) {
          let sourceType, sourceId;
          
          if (source === 'cashbook') {
            sourceType = 'cashbook';
            sourceId = null;
          } else if (source === 'petty-cash') {
            sourceType = 'petty_cash';
            sourceId = null;
          } else if (source.startsWith('bank-')) {
            sourceType = 'bank';
            sourceId = source.replace('bank-', '');
          } else if (source.startsWith('card-') || source.startsWith('machine-')) {
            sourceType = 'machine';
            sourceId = source.replace(/^(card-|machine-)/, '');
          } else if (source.startsWith('cheque-')) {
            sourceType = 'cheque';
            sourceId = source.replace('cheque-', '');
          } else {
            continue;
          }

          // Update source balance (decrease for debit, increase for credit)
          const direction = type === 'debit' ? 'decrease' : 'increase';
          await customerModel.updateSourceBalance(sourceType, sourceId, splitAmount, direction);
          
          sourceTransactions.push({ sourceType, sourceId, amount: splitAmount });
        }
      }
    } else {
      // Single source transaction
      if (!source_from) {
        return res.status(400).json({ error: 'Source is required.' });
      }
      if (!amount || parseFloat(amount) <= 0) {
        return res.status(400).json({ error: 'Valid amount is required.' });
      }

      transactionAmount = parseFloat(amount);

      let sourceType, sourceId;
      if (source_from === 'cashbook' || source_from === 'petty-cash') {
        sourceType = source_from;
        sourceId = null;
      } else if (source_from.startsWith('bank-')) {
        sourceType = 'bank';
        sourceId = source_from.replace('bank-', '');
      } else if (source_from.startsWith('card-') || source_from.startsWith('machine-')) {
        sourceType = 'machine';
        sourceId = source_from.replace(/^(card-|machine-)/, '');
      } else if (source_from.startsWith('cheque-')) {
        sourceType = 'cheque';
        sourceId = source_from.replace('cheque-', '');
      } else {
        sourceType = source_from;
        sourceId = null;
      }

      // Update source balance
      const direction = type === 'debit' ? 'decrease' : 'increase';
      await customerModel.updateSourceBalance(sourceType, sourceId, transactionAmount, direction);
      
      sourceTransactions.push({ sourceType, sourceId, amount: transactionAmount });
    }

    // Create main transaction record
    const transactionId = await customerModel.createCustomerTransaction({
      customer_id,
      vehicle_id: vehicle_id || null,
      type,
      amount: transactionAmount,
      source_type: split_enabled ? 'split' : source_from,
      source_id: null,
      split_data: splitData,
      transaction_date,
      reference_number: reference_number || null,
      description: description || null,
      performed_by,
      bank_slip_path: bank_slip_path || null, // Store the relative path
      branch_id: branch_id || null
    });

    // Create transaction log
    await customerModel.createTransactionLog({
      customer_id,
      action_type: type === 'debit' ? 'payment_received' : 'payment_made',
      related_id: transactionId,
      related_type: 'customer_transaction',
      amount: transactionAmount,
      debit_credit: type,
      description: description || `${type === 'debit' ? 'Payment received from' : 'Payment made to'} customer`,
      performed_by
    });

    // Get balance after transaction
    const balanceAfter = await customerModel.getCustomerBalance(customer_id);
    
    // Create balance log
    await customerModel.createBalanceLog({
      customer_id,
      amount: transactionAmount,
      direction: type === 'debit' ? 'credit' : 'debit',
      balance_before: currentBalance,
      balance_after: balanceAfter.current_balance,
      reason: `Customer ${type === 'debit' ? 'payment received' : 'payment made'}`,
      source_type: 'customer_transaction',
      source_id: transactionId,
      reference: reference_number,
      notes: description,
      performed_by,
      branch_id: branch_id || null
    });

    return res.status(201).json({
      success: true,
      message: 'Transaction created successfully.',
      transaction_id: transactionId,
      bank_slip_path: bank_slip_path,
      transaction: {
        id: transactionId,
        customer_id,
        amount: transactionAmount,
        type,
        date: transaction_date,
        reference: reference_number,
        balance_after: balanceAfter.current_balance
      }
    });

  } catch (err) {
    console.error('[CreateTransaction] Error:', err);
    return res.status(500).json({ error: 'Server error. Failed to create transaction.' });
  }
};

/**
 * GET /api/customers/sources
 * Get available sources for transactions
 */
exports.getSources = async (req, res) => {
  try {
    console.log('[getSources] ===== START =====');
    console.log('[getSources] User:', req.user?.id);
    console.log('[getSources] Fetching sources...');
    const sources = await customerModel.getAvailableSources();
    console.log('[getSources] Sources fetched successfully');
    console.log('[getSources] SystemCash:', sources.systemCash.length);
    console.log('[getSources] BankAccounts:', sources.bankAccounts.length);
    console.log('[getSources] PaymentMachines:', sources.paymentMachines.length);
    console.log('[getSources] Cheques:', sources.cheques.length);
    
    return res.json({
      success: true,
      sources
    });
  } catch (err) {
    console.error('[GetSources] Error:', err);
    return res.json({
      success: true,
      sources: {
        systemCash: [
          { id: 'cashbook', name: 'Cash Book', balance: 0 },
          { id: 'petty_cash', name: 'Petty Cash', balance: 0 }
        ],
        bankAccounts: [],
        paymentMachines: [],
        cheques: []
      }
    });
  }
};

/**
 * GET /api/customers/vehicles/:customerId
 * Get vehicles for a customer (if applicable)
 */
exports.getCustomerVehicles = async (req, res) => {
  const { customerId } = req.params;
  
  try {
    // Return empty array for now - implement if you have vehicles table
    return res.json({
      success: true,
      vehicles: []
    });
  } catch (err) {
    console.error('[GetCustomerVehicles] Error:', err);
    return res.json({
      success: true,
      vehicles: []
    });
  }
};
