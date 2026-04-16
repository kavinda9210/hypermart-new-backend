const express = require('express');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

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
