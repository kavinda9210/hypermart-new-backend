const express = require('express');

const db = require('./config/db');
const userRoutes = require('./routes/userRoutes');

const app = express();

// Basic CORS for local development
const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', allowedOrigin);
  res.header('Vary', 'Origin');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json());

// Mount routes (keeps existing frontend URLs)
app.use('/api/auth', userRoutes);

// Example route to test DB connection
app.get('/test-db', (req, res) => {
  db.get('SELECT 1 as result', [], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, result: row.result });
  });
});

app.get('/', (req, res) => {
  res.send('Hypermart backend server is running.');
});

module.exports = app;
