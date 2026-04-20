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
