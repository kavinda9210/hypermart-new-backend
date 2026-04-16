/*
 * config/db.js
 * SQLite connection (single shared DB instance for the app).
 */

// Import sqlite3 driver (verbose mode prints more useful debugging info).
const sqlite3 = require('sqlite3').verbose();

// Import path utilities for cross-platform path building.
const path = require('path');

// Build the absolute path to the SQLite database file.
const dbPath = path.resolve(__dirname, '..', 'database', 'hypermart.db');

// Create and open the database connection.
const db = new sqlite3.Database(dbPath, (err) => {
  // This callback runs once when the DB connection opens (or fails).
  if (err) {
    console.error('Could not connect to database:', err.message);
  } else {
    console.log('Connected to SQLite database at', dbPath);
  }
});

// Export the shared DB instance.
module.exports = db;
