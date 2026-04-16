/*
 * server.js
 * Process entry: starts the HTTP server using the configured Express app.
 */

// Import the configured Express app.
const app = require('./app');

// Read port from environment (defaults to 3000).
const PORT = process.env.PORT || 3000;

// Start listening for incoming HTTP requests.
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
