const express = require('express');
const db = require('./db');

// Auth routes
const authRoutes = require('./auth/authRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

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

// Mount auth routes
app.use('/api/auth', authRoutes);

// Example route to test DB connection
app.get('/test-db', (req, res) => {
  db.get('SELECT 1 as result', [], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true, result: row.result });
  });
});

app.get('/', (req, res) => {
  res.send('Hypermart backend server is running.');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
