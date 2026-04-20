/*
 * app.js
 * Express app setup: middleware, CORS, routes, and health/test endpoints.
 */

// Import the Express web framework.
const express = require('express');
const path = require('path');

// Import the shared SQLite connection (single DB instance for the app).
const db = require('./config/db');

// Import auth routes (mounted under /api/auth).
const userRoutes = require('./routes/userRoutes');

// Import users list routes (mounted under /api/users).
const usersRoutes = require('./routes/usersRoutes');

// Import item categories routes (mounted under /api/item-categories).
const itemCategoriesRoutes = require('./routes/itemCategoriesRoutes');
const suppliersRoutes = require('./routes/suppliersRoutes');

const supplierInvoiceRoutes = require('./routes/supplierInvoiceRoutes');
const supplierChequeRoutes = require('./routes/supplierChequeRoutes');
const itemsRoutes = require('./routes/itemsRoutes');

const uploadRoutes = require('./routes/uploadRoutes');
const stockRoutes = require('./routes/stockRoutes');
const salesRoutes = require('./routes/salesRoutes');
const customersRoutes = require('./routes/customersRoutes');

// Create the Express application instance.
const app = express();

// Read allowed frontend origin for dev CORS (Vite default is http://localhost:5173).
const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';

// CORS middleware for local development.
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', allowedOrigin);
  res.header('Vary', 'Origin');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Short-circuit CORS preflight requests.
  if (req.method === 'OPTIONS') return res.sendStatus(204);

  // Continue to the next middleware/route.
  next();
});

// Parse JSON request bodies.
app.use(express.json());

// Serve uploaded files locally (e.g., item images).
// Configure directory via UPLOAD_DIR, defaulting to <backend>/upload
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, 'upload');
app.use('/upload', express.static(path.join(__dirname, 'public', 'images', 'upload')));
// Mount auth routes (keeps existing frontend URLs like /api/auth/login).
app.use('/api/auth', userRoutes);
app.use('/api/supplier-cheques', supplierChequeRoutes);

// Mount user management routes.
app.use('/api/users', usersRoutes);

// Mount item categories routes.
app.use('/api/item-categories', itemCategoriesRoutes);
app.use('/api/suppliers', suppliersRoutes);
app.use('/api/items', itemsRoutes);
app.use('/api/supplier-invoices', supplierInvoiceRoutes);
app.use('/api/upload', uploadRoutes);


app.use('/api/customers', customersRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/sales', salesRoutes);

// GET /test-db
// Quick health check to confirm the SQLite connection works.
app.get('/test-db', (req, res) => {
  // Run a minimal query.
  db.get('SELECT 1 as result', [], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, result: row.result });
  });
});

// GET /
// Basic root endpoint.
app.get('/', (req, res) => {
  res.send('Hypermart backend server is running.');
});

// Export the configured Express app (server.js calls app.listen()).
module.exports = app;
