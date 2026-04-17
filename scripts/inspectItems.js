const db = require('../config/db');

db.all("SELECT name, sql FROM sqlite_master WHERE type='table' AND name='items'", [], (err, tables) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log('tables:', tables);

  db.all('PRAGMA table_info(items)', [], (err2, cols) => {
    if (err2) {
      console.error(err2);
      process.exit(1);
    }
    console.log('columns:', cols);

    db.get('SELECT * FROM items LIMIT 1', [], (err3, row) => {
      if (err3) {
        console.error(err3);
        process.exit(1);
      }
      console.log('sample row:', row);
      process.exit(0);
    });
  });
});
