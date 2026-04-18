// backend/controllers/customerController.js
const customerModel = require('../models/customerModel');

/**
 * POST /api/customers
 * Create a new customer.
 */
const userModel = require('../models/userModel');
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
  const data = req.body || {};
  // Basic validation
  if (!data.customer_name || !data.contact_number) {
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
