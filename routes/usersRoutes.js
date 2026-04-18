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
const { requireAllPermissions } = require('../middleware/permissionMiddleware');

// Import controller handlers.
const userController = require('../controllers/userController');

// GET /api/users
// Returns users from the database (requires a valid JWT).
router.get('/', requireAuth, requireAllPermissions(['Access_Users', 'User List View']), userController.listUsers);

// GET /api/users/roles
// Returns roles from the database (requires a valid JWT).
router.get('/roles', requireAuth, requireAllPermissions(['Access_Users', 'Role List View']), userController.listRoles);
// GET /api/users/roles/:id
// Returns a single role (used by Salary Settings modal).
router.get('/roles/:id', requireAuth, requireAllPermissions(['Access_Users', 'Role Update']), userController.getRole);
// PUT /api/users/roles/:id
// Updates a single role's salary settings.
router.put('/roles/:id', requireAuth, requireAllPermissions(['Access_Users', 'Role Update']), userController.updateRole);
// POST /api/users/roles
// Creates a new role in the database (requires a valid JWT).
router.post('/roles', requireAuth, requireAllPermissions(['Access_Users', 'Add New Role']), userController.createRole);

// GET /api/users/permissions
// Returns all available permissions (requires a valid JWT).
router.get('/permissions', requireAuth, requireAllPermissions(['Access_Users', 'Permission List View']), userController.listPermissions);

// POST /api/users/permissions
// Creates a new permission (requires a valid JWT).
router.post(
	'/permissions',
	requireAuth,
	requireAllPermissions(['Access_Users', 'Add New Permission']),
	userController.createPermission
);

// GET /api/users/permissions/:id
// Returns a single permission (requires a valid JWT).
router.get(
	'/permissions/:id',
	requireAuth,
	requireAllPermissions(['Access_Users', 'Permission List View']),
	userController.getPermission
);

// PUT /api/users/permissions/:id
// Updates a single permission (requires a valid JWT).
router.put(
	'/permissions/:id',
	requireAuth,
	requireAllPermissions(['Access_Users', 'Permission Update']),
	userController.updatePermission
);

// GET /api/users/roles/:id/permissions
// Returns permission ids for a role (requires a valid JWT).
router.get('/roles/:id/permissions', requireAuth, requireAllPermissions(['Access_Users', 'Role Update']), userController.getRolePermissions);

// PUT /api/users/roles/:id/permissions
// Replaces permissions for a role (admin only).
router.put('/roles/:id/permissions', requireAuth, requireAllPermissions(['Access_Users', 'Role Update']), userController.updateRolePermissions);

// GET /api/users/me/permissions
// Returns permissions for current user (requires a valid JWT).
router.get('/me/permissions', requireAuth, userController.getMyPermissions);

// GET /api/users/branches
// Returns branches from the database (requires a valid JWT).
router.get('/branches', requireAuth, userController.listBranches);

// POST /api/users
// Creates a new user in the database (requires a valid JWT).
router.post('/', requireAuth, requireAllPermissions(['Access_Users', 'Add New User']), userController.createUser);

// GET /api/users/:id
// Returns a single user for editing (requires a valid JWT).
router.get('/:id', requireAuth, requireAllPermissions(['Access_Users', 'User Update']), userController.getUser);

// PUT /api/users/:id
// Updates a single user (requires a valid JWT).
router.put('/:id', requireAuth, requireAllPermissions(['Access_Users', 'User Update']), userController.updateUser);

// PATCH /api/users/:id/status
// Activates/deactivates a user (requires a valid JWT).
router.patch('/:id/status', requireAuth, requireAllPermissions(['Access_Users', 'User Status Control']), userController.updateUserStatus);

// Export the router for mounting in app.js.
module.exports = router;
