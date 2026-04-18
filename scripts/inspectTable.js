const db = require('../config/db');

const table = process.argv[2];
if (!table) {
  console.error('Usage: node scripts/inspectTable.js <tableName>');
  process.exit(1);
}

db.all(
  "SELECT name, sql FROM sqlite_master WHERE type='table' AND name=?",
  [table],
  (err, tables) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log('table:', tables);

    db.all(`PRAGMA table_info(${table})`, [], (err2, cols) => {
      if (err2) {
        console.error(err2);
        process.exit(1);
      }
      console.log('columns:', cols);

      db.get(`SELECT * FROM ${table} ORDER BY rowid DESC LIMIT 1`, [], (err3, row) => {
        if (err3) {
          console.error(err3);
          process.exit(1);
        }
        console.log('sample row:', row);
        process.exit(0);
      });
    });
  }
);
