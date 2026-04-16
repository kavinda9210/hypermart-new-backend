/*
 * routes/usersRoutes.js
 * User management endpoints mounted under /api/users.
 */

// Import Express to create a router.
const express = require('express');

// Create a router instance for grouping endpoints.
const router = express.Router();

// Import middleware for JWT-protected endpoints.
const { requireAuth } = require('../middleware/authMiddleware');

// Import controller handlers.
const userController = require('../controllers/userController');

// GET /api/users
// Returns users from the database (requires a valid JWT).
router.get('/', requireAuth, userController.listUsers);

// Export the router for mounting in app.js.
module.exports = router;
