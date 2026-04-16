const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const userModel = require('../models/userModel');
const { getJwtSecret, normalizeBcryptHash } = require('../utils/helpers');

const SECRET = getJwtSecret();

exports.login = async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const user = await userModel.getUserByEmail(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials.' });

    // Laravel stores bcrypt hashes with $2y$ prefix; Node bcrypt expects $2a$/$2b$.
    const hash = normalizeBcryptHash(user.password);
    const match = await bcrypt.compare(password, hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials.' });

    const role = user.roles_id ? await userModel.getRoleById(user.roles_id) : null;

    const token = jwt.sign(
      { id: user.id, role: role ? role.role_name : null },
      SECRET,
      { expiresIn: '1d' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: role ? role.role_name : null,
      },
    });
  } catch {
    return res.status(500).json({ error: 'Server error.' });
  }
};

// Logout handler (JWT is stateless; client clears token)
exports.logout = (req, res) => {
  res.json({ success: true });
};
