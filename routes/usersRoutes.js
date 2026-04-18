// ...existing code...
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

// GET /api/users/roles
// Returns roles from the database (requires a valid JWT).
router.get('/roles', requireAuth, userController.listRoles);
// GET /api/users/roles/:id
// Returns a single role (used by Salary Settings modal).
router.get('/roles/:id', requireAuth, userController.getRole);
// PUT /api/users/roles/:id
// Updates a single role's salary settings.
router.put('/roles/:id', requireAuth, userController.updateRole);
// POST /api/users/roles
// Creates a new role in the database (requires a valid JWT).
router.post('/roles', requireAuth, userController.createRole);

// GET /api/users/branches
// Returns branches from the database (requires a valid JWT).
router.get('/branches', requireAuth, userController.listBranches);

// POST /api/users
// Creates a new user in the database (requires a valid JWT).
router.post('/', requireAuth, userController.createUser);

// GET /api/users/:id
// Returns a single user for editing (requires a valid JWT).
router.get('/:id', requireAuth, userController.getUser);

// PUT /api/users/:id
// Updates a single user (requires a valid JWT).
router.put('/:id', requireAuth, userController.updateUser);

// PATCH /api/users/:id/status
// Activates/deactivates a user (requires a valid JWT).
router.patch('/:id/status', requireAuth, userController.updateUserStatus);

// Export the router for mounting in app.js.
module.exports = router;
