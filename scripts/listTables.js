const db = require('../config/db');

db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", [], (err, rows) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(rows.map((r) => r.name).join('\n'));
  process.exit(0);
});
