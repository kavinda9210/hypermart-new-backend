// backend/routes/uploadRoutes.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { requireAuth } = require('../middleware/authMiddleware');
const { requireAllPermissions } = require('../middleware/permissionMiddleware');

const router = express.Router();

// Ensure the upload directory for items exists
const uploadDir = path.join(__dirname, '..', 'public', 'images', 'upload', 'items');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Ensure the upload directory for bank slips exists
const bankSlipDir = path.join(__dirname, '..', 'public', 'images', 'upload', 'bank-slips');
if (!fs.existsSync(bankSlipDir)) {
  fs.mkdirSync(bankSlipDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Determine destination based on upload type
    if (req.path === '/item-image') {
      cb(null, uploadDir);
    } else if (req.path === '/bank-slip') {
      cb(null, bankSlipDir);
    } else {
      cb(null, uploadDir);
    }
  },
  filename: function (req, file, cb) {
    // Use original name with timestamp to avoid collisions
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    const unique = `${base}-${Date.now()}${ext}`;
    cb(null, unique);
  }
});

const upload = multer({ storage });

// POST /api/upload/item-image
router.post(
  '/item-image',
  requireAuth,
  requireAllPermissions(['Access_Items']),
  upload.single('image'),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }
    const relPath = `upload/items/${req.file.filename}`;
    res.json({ image_path: relPath });
  }
);

// POST /api/upload/bank-slip
router.post(
  '/bank-slip',
  requireAuth,
  upload.single('bank_slip'),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }
    const relPath = `upload/bank-slips/${req.file.filename}`;
    res.json({ 
      success: true, 
      bank_slip_path: relPath,
      filename: req.file.filename 
    });
  }
);

module.exports = router;