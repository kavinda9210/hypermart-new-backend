// backend/routes/uploadRoutes.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { requireAuth } = require('../middleware/authMiddleware');
const { requireAllPermissions } = require('../middleware/permissionMiddleware');

const router = express.Router();

// Ensure the upload directory exists
const uploadDir = path.join(__dirname, '..', 'public', 'images', 'upload', 'items');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
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
  // Always return the web-accessible relative path (for DB and frontend)
  // e.g., upload/items/filename.jpg (since /upload is mapped in app.js)
  const relPath = `upload/items/${req.file.filename}`;
  res.json({ image_path: relPath });
  }
);

module.exports = router;
