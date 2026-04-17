/*
 * controllers/supplierController.js
 * Supplier endpoints.
 */

const supplierModel = require('../models/supplierModel');

exports.listSuppliers = async (req, res) => {
  const search = String(req.query?.search || '').trim();
  const limitRaw = req.query?.limit;
  const offsetRaw = req.query?.offset;

  const limit = limitRaw === undefined ? 30 : Number(limitRaw);
  const offset = offsetRaw === undefined ? 0 : Number(offsetRaw);

  const safeLimit = Number.isInteger(limit) && limit > 0 && limit <= 500 ? limit : 30;
  const safeOffset = Number.isInteger(offset) && offset >= 0 ? offset : 0;

  try {
    const suppliers = await supplierModel.listSuppliers({
      searchTerm: search,
      limit: safeLimit,
      offset: safeOffset,
    });
    return res.json({ suppliers });
  } catch {
    return res.status(500).json({ error: 'Server error.' });
  }
};

exports.toggleSupplierStatus = async (req, res) => {
  const id = Number(req.params?.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid supplier id.' });
  }

  try {
    const supplier = await supplierModel.getSupplierById(id);
    if (!supplier) return res.status(404).json({ error: 'Supplier not found.' });

    const current = Number(supplier.status_id) || 1;
    const next = current === 1 ? 2 : 1;

    await supplierModel.updateSupplierStatus(id, next);
    const updated = await supplierModel.getSupplierById(id);

    return res.json({ supplier: updated });
  } catch {
    return res.status(500).json({ error: 'Server error.' });
  }
};

exports.getSupplier = async (req, res) => {
  const id = Number(req.params?.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid supplier id.' });
  }

  try {
    const supplier = await supplierModel.getSupplierById(id);
    if (!supplier) return res.status(404).json({ error: 'Supplier not found.' });
    return res.json({ supplier });
  } catch {
    return res.status(500).json({ error: 'Server error.' });
  }
};

exports.updateSupplier = async (req, res) => {
  const id = Number(req.params?.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid supplier id.' });
  }

  const {
    supplier_name,
    contact_number,
    email,
    vat_no,
    address,
    city_id,
    city_name,
  } = req.body || {};

  const name = String(supplier_name || '').trim();
  const contact = String(contact_number || '').trim();
  const emailStr = String(email || '').trim();
  const vat = String(vat_no || '').trim();
  const addressStr = String(address || '').trim();
  const cityNameStr = String(city_name || '').trim();

  if (!name) return res.status(400).json({ error: 'Supplier name is required.' });
  if (!contact) return res.status(400).json({ error: 'Mobile number is required.' });
  if (!addressStr) return res.status(400).json({ error: 'Address is required.' });

  const cityIdNum = city_id === '' || city_id === undefined || city_id === null ? null : Number(city_id);
  if (cityIdNum !== null && (!Number.isInteger(cityIdNum) || cityIdNum <= 0)) {
    return res.status(400).json({ error: 'Invalid city.' });
  }

  if (emailStr && !/^\S+@\S+\.\S+$/.test(emailStr)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  try {
    const existing = await supplierModel.getSupplierById(id);
    if (!existing) return res.status(404).json({ error: 'Supplier not found.' });

    const dup = await supplierModel.getSupplierByNameAndContact(name, contact);
    if (dup && Number(dup.id) !== id) {
      return res.status(409).json({ error: 'Supplier already exists.' });
    }

    await supplierModel.updateSupplier(id, {
      supplier_name: name,
      contact_number: contact,
      email: emailStr || null,
      vat_no: vat || null,
      address: addressStr,
      city_id: cityIdNum,
      city_name: cityNameStr || null,
    });

    const updated = await supplierModel.getSupplierById(id);
    return res.json({ supplier: updated });
  } catch {
    return res.status(500).json({ error: 'Server error.' });
  }
};

exports.createSupplier = async (req, res) => {
  const {
    supplier_name,
    contact_number,
    email,
    vat_no,
    address,
    city_id,
    city_name,
    opening_balance,
    opening_balance_type,
  } = req.body || {};

  const name = String(supplier_name || '').trim();
  const contact = String(contact_number || '').trim();
  const emailStr = String(email || '').trim();
  const vat = String(vat_no || '').trim();
  const addressStr = String(address || '').trim();
  const cityNameStr = String(city_name || '').trim();

  if (!name) return res.status(400).json({ error: 'Supplier name is required.' });
  if (!contact) return res.status(400).json({ error: 'Mobile number is required.' });
  if (!addressStr) return res.status(400).json({ error: 'Address is required.' });

  const openingType = String(opening_balance_type || 'debit').toLowerCase();
  if (openingType !== 'debit' && openingType !== 'credit') {
    return res.status(400).json({ error: 'opening_balance_type must be debit or credit.' });
  }

  const openingNum = Number(opening_balance);
  if (!Number.isFinite(openingNum) || openingNum < 0) {
    return res.status(400).json({ error: 'Opening balance must be a non-negative number.' });
  }

  // DB has only numeric balances; represent Payable (credit) as a negative balance.
  const signedOpening = openingType === 'credit' ? -openingNum : openingNum;

  const cityIdNum = city_id === '' || city_id === undefined || city_id === null ? null : Number(city_id);
  if (cityIdNum !== null && (!Number.isInteger(cityIdNum) || cityIdNum <= 0)) {
    return res.status(400).json({ error: 'Invalid city.' });
  }

  // Very light email validation (optional).
  if (emailStr && !/^\S+@\S+\.\S+$/.test(emailStr)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  try {
    const dup = await supplierModel.getSupplierByNameAndContact(name, contact);
    if (dup) {
      return res.status(409).json({ error: 'Supplier already exists.' });
    }

    const created = await supplierModel.createSupplier({
      supplier_name: name,
      contact_number: contact,
      email: emailStr || null,
      vat_no: vat || null,
      address: addressStr,
      city_id: cityIdNum,
      city_name: cityNameStr || null,
      opening_balance: signedOpening,
      current_balance: signedOpening,
      user_id: req.user?.id ?? null,
      status_id: 1,
      branch_id: null,
    });

    return res.status(201).json({ supplier: created });
  } catch {
    return res.status(500).json({ error: 'Server error.' });
  }
};
