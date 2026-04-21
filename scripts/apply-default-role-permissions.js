/*
  One-time helper: apply the default permission set to ALL existing roles.
  - Does NOT remove existing permissions
  - Ensures the permission names exist in the permissions table

  Usage:
    node scripts/apply-default-role-permissions.js
*/

const userModel = require('../models/userModel');

const DEFAULT_PERMISSION_NAMES = [
  'dashboards',
  'Access_Dashbord',
  'Access_Billing',
  'Access_Items',
  'Access_Stock',
  'Access_Sales',
  'Access_Users',
  'Access_Customers',
  'Access_Suppliers',
  'Access_Expenses',
  'Access_Finance',
  'Access_Reports',
  'Access_Settings',
  'Add new Item',
  'Add New User',
  'Add New Role',
  'Add New Permission',
  'User List View',
  'Role List View',
  'Permission List View',
  'User Status Control',
  'User Update',
  'Role Update',
  'Permission Update',
  'Add New Customers',
  'View Customer List',
  'Add New Customer Transaction',
];

async function main() {
  const roles = await userModel.listRoles();
  const defaultIds = await userModel.ensurePermissionIdsByNames(DEFAULT_PERMISSION_NAMES);

  let totalAdded = 0;
  for (const role of roles) {
    const added = await userModel.addMissingRolePermissions(role.id, defaultIds);
    totalAdded += added.length;
    // eslint-disable-next-line no-console
    console.log(`Role ${role.id} (${role.role_name}): added ${added.length}`);
  }

  // eslint-disable-next-line no-console
  console.log(`Done. Total newly added role-permission rows: ${totalAdded}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed:', err);
  process.exitCode = 1;
});
