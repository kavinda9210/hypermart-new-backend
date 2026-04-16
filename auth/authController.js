const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'hypermart_secret';

// Login handler
exports.login = (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err) return res.status(500).json({ error: 'Database error.' });
    if (!user) return res.status(401).json({ error: 'Invalid credentials.' });

    // Laravel stores bcrypt hashes with $2y$ prefix; Node bcrypt expects $2a$/$2b$.
    const hash = typeof user.password === 'string' ? user.password.replace(/^\$2y\$/, '$2a$') : '';

    // Compare password (bcrypt hash)
    bcrypt.compare(password, hash, (err, match) => {
      if (err) return res.status(500).json({ error: 'Auth error.' });
      if (!match) return res.status(401).json({ error: 'Invalid credentials.' });

      // Get role
      db.get('SELECT * FROM roles WHERE id = ?', [user.roles_id], (err, role) => {
        if (err) return res.status(500).json({ error: 'Role lookup error.' });

        // Create JWT
        const token = jwt.sign(
          { id: user.id, role: role ? role.role_name : null },
          SECRET,
          { expiresIn: '1d' }
        );

        res.json({
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: role ? role.role_name : null,
          },
        });
      });
    });
  });
};
