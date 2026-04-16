/*
 * routes/userRoutes.js
 * Auth HTTP routes mounted under /api/auth.
 */

// Import Express to create a router.
const express = require('express');

// Create a router instance for grouping endpoints.
const router = express.Router();

// Import controller handlers for each endpoint.
const userController = require('../controllers/userController');

// POST /api/auth/login
// Handles user login and returns a JWT.
router.post('/login', userController.login);

// POST /api/auth/logout
// Stateless logout: endpoint exists for consistency; client clears token.
router.post('/logout', userController.logout);

// Export the router for mounting in app.js.
module.exports = router;
