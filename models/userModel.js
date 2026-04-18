/**
 * Create a new role.
 * @param {{role_name: string}} payload
 * @returns {Promise<object>} The created role row
 */
exports.createRole = (payload) =>
  new Promise((resolve, reject) => {
    const now = new Date().toISOString();
    // Insert the new role
    const sql = `INSERT INTO roles (role_name, created_at, updated_at) VALUES (?, ?, ?)`;
    db.run(sql, [payload.role_name, now, now], function (err) {
      if (err) return reject(err);
      // Return the created role (with id)
      db.get('SELECT * FROM roles WHERE id = ?', [this.lastID], (err2, row) => {
        if (err2) return reject(err2);
        resolve(row);
      });
    });
  });
/*
 * models/userModel.js
 * Data-access layer for users/roles tables.
 */

// Import the shared SQLite DB connection.
const db = require('../config/db');

/**
 * Get a user row by email.
 * @param {string} email
 * @returns {Promise<object|null>}
 */
exports.getUserByEmail = (email) =>
  new Promise((resolve, reject) => {
    // Query a single user by email.
    db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });

/**
 * Get a user row by mobile/number.
 * @param {string} mobile
 * @returns {Promise<object|null>}
 */
exports.getUserByMobile = (mobile) =>
  new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE number = ?', [mobile], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });

/**
 * Get a role row by id.
 * @param {number|string} id
 * @returns {Promise<object|null>}
 */
exports.getRoleById = (id) =>
  new Promise((resolve, reject) => {
    // Query a single role by primary key.
    db.get('SELECT * FROM roles WHERE id = ?', [id], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });

/**
 * Get a role row by id, including permission count.
 * @param {number|string} id
 * @returns {Promise<object|null>}
 */
exports.getRoleWithPermissionCount = (id) =>
  new Promise((resolve, reject) => {
    db.get(
      `
      SELECT
        r.*,
        COUNT(rhp.permissions_id) AS permission_count
      FROM roles r
      LEFT JOIN roles_has_permissions rhp ON rhp.roles_id = r.id
      WHERE r.id = ?
      GROUP BY r.id
      `,
      [id],
      (err, row) => {
        if (err) return reject(err);
        resolve(row || null);
      }
    );
  });

/**
 * Update role salary settings.
 * @param {number|string} id
 * @param {{salary_type:string,hourly_wage:number,monthly_salary?:number|null,daily_rate?:number|null,no_pay_rate:number,allowance:number,ot_included:0|1,ot_rate?:number|null,double_ot_rate?:number|null,triple_ot_rate?:number|null,epf_enabled:0|1}} payload
 * @returns {Promise<number>} number of updated rows
 */
exports.updateRole = (id, payload) =>
  new Promise((resolve, reject) => {
    const now = new Date().toISOString();

    db.run(
      `
      UPDATE roles
      SET
        salary_type = ?,
        hourly_wage = ?,
        monthly_salary = ?,
        daily_rate = ?,
        no_pay_rate = ?,
        allowance = ?,
        ot_included = ?,
        ot_rate = ?,
        double_ot_rate = ?,
        triple_ot_rate = ?,
        epf_enabled = ?,
        updated_at = ?
      WHERE id = ?
      `,
      [
        payload.salary_type,
        payload.hourly_wage,
        payload.monthly_salary ?? null,
        payload.daily_rate ?? null,
        payload.no_pay_rate,
        payload.allowance,
        payload.ot_included,
        payload.ot_rate ?? null,
        payload.double_ot_rate ?? null,
        payload.triple_ot_rate ?? null,
        payload.epf_enabled,
        now,
        id,
      ],
      function (err) {
        if (err) return reject(err);
        resolve(this.changes || 0);
      }
    );
  });

/**
 * Update role name.
 * @param {number|string} id
 * @param {string} roleName
 * @returns {Promise<number>} number of updated rows
 */
exports.updateRoleName = (id, roleName) =>
  new Promise((resolve, reject) => {
    const now = new Date().toISOString();

    db.run(
      'UPDATE roles SET role_name = ?, updated_at = ? WHERE id = ?',
      [roleName, now, id],
      function (err) {
        if (err) return reject(err);
        resolve(this.changes || 0);
      }
    );
  });

/**
 * Get a user row by id.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
exports.getUserById = (id) =>
  new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });

/**
 * List users with display fields used by the UI.
 * @returns {Promise<Array<{id:string,name:string,email:string,role:string|null,mobile:string|null,gender:string|null,branch:string|null,status:string|null}>>}
 */
exports.listUsers = () =>
  new Promise((resolve, reject) => {
    // Join related tables to get friendly names for role/branch.
    db.all(
      `
      SELECT
        u.id,
        u.name,
        u.email,
        r.role_name AS role,
        u.number AS mobile,
        u.gender,
        b.name AS branch,
        COALESCE(u.status_id, 1) AS status_id,
        CASE
          WHEN COALESCE(u.status_id, 1) = 1 THEN 'Active'
          ELSE 'Inactive'
        END AS status
      FROM users u
      LEFT JOIN roles r ON r.id = u.roles_id
      LEFT JOIN branches b ON b.id = u.branch_id
      ORDER BY u.name
      `,
      [],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      }
    );
  });

/**
 * List roles (used by Role List page and dropdowns).
 * Includes salary settings columns plus a computed permission count.
 * @returns {Promise<Array<object>>}
 */
exports.listRoles = () =>
  new Promise((resolve, reject) => {
    db.all(
      `
      SELECT
        r.*,
        COUNT(rhp.permissions_id) AS permission_count
      FROM roles r
      LEFT JOIN roles_has_permissions rhp ON rhp.roles_id = r.id
      GROUP BY r.id
      ORDER BY r.id
      `,
      [],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      }
    );
  });

/**
 * List branches for dropdowns.
 * @returns {Promise<Array<{id:number, name:string}>>}
 */
exports.listBranches = () =>
  new Promise((resolve, reject) => {
    db.all('SELECT id, name FROM branches ORDER BY id', [], (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });

/**
 * List all permissions.
 * @returns {Promise<Array<{id:number, permissions_name:string}>>}
 */
exports.listPermissions = () =>
  new Promise((resolve, reject) => {
    db.all('SELECT id, permissions_name FROM permissions ORDER BY id', [], (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });

/**
 * Ensure the given permission names exist in the permissions table and return their ids.
 * Inserts missing permission rows.
 * @param {string[]} permissionNames
 * @returns {Promise<number[]>}
 */
exports.ensurePermissionIdsByNames = (permissionNames) =>
  new Promise((resolve, reject) => {
    const now = new Date().toISOString();
    const names = Array.isArray(permissionNames)
      ? Array.from(
          new Set(
            permissionNames
              .map((n) => (typeof n === 'string' ? n.trim() : ''))
              .filter(Boolean)
          )
        )
      : [];

    if (names.length === 0) return resolve([]);

    const placeholders = names.map(() => '?').join(',');
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      db.all(
        `SELECT id, permissions_name FROM permissions WHERE permissions_name IN (${placeholders})`,
        names,
        (selErr, rows) => {
          if (selErr) {
            db.run('ROLLBACK');
            return reject(selErr);
          }

          const existingMap = new Map((rows || []).map((r) => [String(r.permissions_name), Number(r.id)]));
          const missing = names.filter((n) => !existingMap.has(n));

          if (missing.length === 0) {
            db.run('COMMIT', (commitErr) => {
              if (commitErr) return reject(commitErr);
              resolve(names.map((n) => existingMap.get(n)).filter((id) => Number.isFinite(id)));
            });
            return;
          }

          const stmt = db.prepare(
            'INSERT INTO permissions (permissions_name, created_at, updated_at) VALUES (?, ?, ?)'
          );

          for (const n of missing) {
            stmt.run([n, now, now]);
          }

          stmt.finalize((insErr) => {
            if (insErr) {
              db.run('ROLLBACK');
              return reject(insErr);
            }

            db.all(
              `SELECT id, permissions_name FROM permissions WHERE permissions_name IN (${placeholders})`,
              names,
              (sel2Err, rows2) => {
                if (sel2Err) {
                  db.run('ROLLBACK');
                  return reject(sel2Err);
                }

                const map2 = new Map((rows2 || []).map((r) => [String(r.permissions_name), Number(r.id)]));
                db.run('COMMIT', (commitErr) => {
                  if (commitErr) return reject(commitErr);
                  resolve(names.map((n) => map2.get(n)).filter((id) => Number.isFinite(id)));
                });
              }
            );
          });
        }
      );
    });
  });

/**
 * Add permissions to a role without removing existing ones.
 * @param {number|string} roleId
 * @param {number[]} permissionIds
 * @returns {Promise<number[]>} ids that were newly added
 */
exports.addMissingRolePermissions = async (roleId, permissionIds) => {
  const now = new Date().toISOString();
  const rolePerms = await exports.getRolePermissionIds(roleId);
  const existing = new Set(rolePerms.map((n) => Number(n)));

  const ids = Array.isArray(permissionIds)
    ? Array.from(
        new Set(
          permissionIds
            .map((n) => Number(n))
            .filter((n) => Number.isFinite(n))
        )
      )
    : [];

  const missing = ids.filter((id) => !existing.has(id));
  if (missing.length === 0) return [];

  await new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      const stmt = db.prepare(
        'INSERT INTO roles_has_permissions (roles_id, permissions_id, created_at, updated_at) VALUES (?, ?, ?, ?)'
      );

      for (const pid of missing) {
        stmt.run([roleId, pid, now, now]);
      }

      stmt.finalize((finalizeErr) => {
        if (finalizeErr) {
          db.run('ROLLBACK');
          return reject(finalizeErr);
        }

        db.run('COMMIT', (commitErr) => {
          if (commitErr) return reject(commitErr);
          resolve();
        });
      });
    });
  });

  return missing;
};

/**
 * Get permission ids assigned to a role.
 * @param {number|string} roleId
 * @returns {Promise<number[]>}
 */
exports.getRolePermissionIds = (roleId) =>
  new Promise((resolve, reject) => {
    db.all(
      'SELECT permissions_id FROM roles_has_permissions WHERE roles_id = ? ORDER BY permissions_id',
      [roleId],
      (err, rows) => {
        if (err) return reject(err);
        resolve((rows || []).map((r) => Number(r.permissions_id)));
      }
    );
  });

/**
 * Replace all permissions for a role.
 * @param {number|string} roleId
 * @param {number[]} permissionIds
 * @returns {Promise<void>}
 */
exports.replaceRolePermissions = (roleId, permissionIds) =>
  new Promise((resolve, reject) => {
    const now = new Date().toISOString();
    const ids = Array.isArray(permissionIds)
      ? Array.from(
          new Set(
            permissionIds
              .map((n) => Number(n))
              .filter((n) => Number.isFinite(n))
          )
        )
      : [];

    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      db.run('DELETE FROM roles_has_permissions WHERE roles_id = ?', [roleId], (delErr) => {
        if (delErr) {
          db.run('ROLLBACK');
          return reject(delErr);
        }

        if (ids.length === 0) {
          db.run('COMMIT', (commitErr) => {
            if (commitErr) return reject(commitErr);
            resolve();
          });
          return;
        }

        const stmt = db.prepare(
          'INSERT INTO roles_has_permissions (roles_id, permissions_id, created_at, updated_at) VALUES (?, ?, ?, ?)'
        );

        for (const pid of ids) {
          stmt.run([roleId, pid, now, now]);
        }

        stmt.finalize((finalizeErr) => {
          if (finalizeErr) {
            db.run('ROLLBACK');
            return reject(finalizeErr);
          }

          db.run('COMMIT', (commitErr) => {
            if (commitErr) return reject(commitErr);
            resolve();
          });
        });
      });
    });
  });

/**
 * List permissions for a user (via their role).
 * @param {string} userId
 * @returns {Promise<Array<{id:number, permissions_name:string}>>}
 */
exports.listPermissionsForUser = (userId) =>
  new Promise((resolve, reject) => {
    db.all(
      `
      SELECT p.id, p.permissions_name
      FROM users u
      INNER JOIN roles_has_permissions rhp ON rhp.roles_id = u.roles_id
      INNER JOIN permissions p ON p.id = rhp.permissions_id
      WHERE u.id = ?
      GROUP BY p.id
      ORDER BY p.id
      `,
      [userId],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      }
    );
  });

/**
 * Get next numeric user id as TEXT.
 * @returns {Promise<string>}
 */
const getNextUserId = () =>
  new Promise((resolve, reject) => {
    db.get(
      'SELECT COALESCE(MAX(CAST(id AS INTEGER)), 0) + 1 AS nextId FROM users',
      [],
      (err, row) => {
        if (err) return reject(err);
        resolve(String(row?.nextId ?? 1));
      }
    );
  });

/**
 * Create a new user.
 * @param {{name:string,email:string,mobile:string,gender?:string|null,roles_id?:number|null,branch_id?:number|null,passwordHash:string,yearly_leave_allowance?:number|null}} payload
 * @returns {Promise<{id:string,name:string,email:string,mobile:string,gender:string|null,roles_id:number|null,branch_id:number|null,yearly_leave_allowance:number|null}>}
 */
exports.createUser = async (payload) => {
  const id = await getNextUserId();
  const now = new Date().toISOString();

  const yearlyLeave =
    payload.yearly_leave_allowance === undefined || payload.yearly_leave_allowance === null
      ? 0
      : Number(payload.yearly_leave_allowance);

  await new Promise((resolve, reject) => {
    db.run(
      `
      INSERT INTO users (
        id,
        branch_id,
        name,
        email,
        number,
        password,
        yearly_leave_allowance,
        roles_id,
        status_id,
        gender,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        payload.branch_id ?? null,
        payload.name,
        payload.email,
        payload.mobile,
        payload.passwordHash,
        yearlyLeave,
        payload.roles_id ?? null,
        1,
        payload.gender ?? null,
        now,
        now,
      ],
      (err) => {
        if (err) return reject(err);
        resolve();
      }
    );
  });

  return {
    id,
    name: payload.name,
    email: payload.email,
    mobile: payload.mobile,
    gender: payload.gender ?? null,
    roles_id: payload.roles_id ?? null,
    branch_id: payload.branch_id ?? null,
    yearly_leave_allowance: yearlyLeave,
  };
};

/**
 * Update a user's active status.
 * @param {string} id
 * @param {0|1} statusId
 * @returns {Promise<number>} number of updated rows
 */
exports.updateUserStatus = (id, statusId) =>
  new Promise((resolve, reject) => {
    const now = new Date().toISOString();

    db.run(
      'UPDATE users SET status_id = ?, updated_at = ? WHERE id = ?',
      [statusId, now, id],
      function (err) {
        if (err) return reject(err);
        resolve(this.changes || 0);
      }
    );
  });

/**
 * Update a user (profile fields; optional password update).
 * @param {string} id
 * @param {{name:string,email:string,mobile:string,gender?:string|null,roles_id?:number|null,branch_id?:number|null,yearly_leave_allowance?:number|null,passwordHash?:string}} payload
 * @returns {Promise<number>} number of updated rows
 */
exports.updateUser = (id, payload) =>
  new Promise((resolve, reject) => {
    const now = new Date().toISOString();

    const yearlyLeave =
      payload.yearly_leave_allowance === undefined || payload.yearly_leave_allowance === null
        ? 0
        : Number(payload.yearly_leave_allowance);

    if (payload.passwordHash) {
      db.run(
        `
        UPDATE users
        SET
          branch_id = ?,
          name = ?,
          email = ?,
          number = ?,
          password = ?,
          yearly_leave_allowance = ?,
          roles_id = ?,
          gender = ?,
          updated_at = ?
        WHERE id = ?
        `,
        [
          payload.branch_id ?? null,
          payload.name,
          payload.email,
          payload.mobile,
          payload.passwordHash,
          yearlyLeave,
          payload.roles_id ?? null,
          payload.gender ?? null,
          now,
          id,
        ],
        function (err) {
          if (err) return reject(err);
          resolve(this.changes || 0);
        }
      );
      return;
    }

    db.run(
      `
      UPDATE users
      SET
        branch_id = ?,
        name = ?,
        email = ?,
        number = ?,
        yearly_leave_allowance = ?,
        roles_id = ?,
        gender = ?,
        updated_at = ?
      WHERE id = ?
      `,
      [
        payload.branch_id ?? null,
        payload.name,
        payload.email,
        payload.mobile,
        yearlyLeave,
        payload.roles_id ?? null,
        payload.gender ?? null,
        now,
        id,
      ],
      function (err) {
        if (err) return reject(err);
        resolve(this.changes || 0);
      }
    );
  });
