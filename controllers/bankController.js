const Bank = require('../models/bankModel');

// List all banks
exports.listBanks = (req, res) => {
  Bank.getAll((err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
};

// Get a bank by ID
exports.getBankById = (req, res) => {
  const { id } = req.params;
  Bank.getById(id, (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Bank not found' });
    res.json(row);
  });
};

// Create a new bank
exports.createBank = (req, res) => {
  const data = req.body;
  if (!data.bank_name) return res.status(400).json({ error: 'Bank name is required' });
  Bank.create(data, (err, bank) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(bank);
  });
};

// Update a bank by ID
exports.updateBankById = (req, res) => {
  const { id } = req.params;
  const data = req.body;
  if (!data.bank_name) return res.status(400).json({ error: 'Bank name is required' });
  Bank.updateById(id, data, (err, bank, changes) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!changes) return res.status(404).json({ error: 'Bank not found' });
    res.json(bank);
  });
};

// Delete a bank by ID
exports.deleteBankById = (req, res) => {
  const { id } = req.params;
  Bank.deleteById(id, (err, changes) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!changes) return res.status(404).json({ error: 'Bank not found' });
    res.json({ success: true });
  });
};
