const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { findUserByEmail, createUser, listUsers } = require('../database');

const JWT_SECRET = process.env.JWT_SECRET || 'johnvilla_secret_key_2026';

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existingUser = await findUserByEmail(normalizedEmail);
    if (existingUser) {
      return res.status(400).json({ message: 'Email is already registered. Please log in.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = await createUser({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role: 'customer'
    });

    const token = jwt.sign({ id: newUser._id, role: newUser.role }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        memberSince: newUser.memberSince
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error during registration', error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    let user = await findUserByEmail(normalizedEmail);

    if (!user) {
      return res.status(404).json({ message: 'No account found with this email.' });
    }

    let isMatch = false;
    const storedPassword = String(user.password || '');

    // Use bcrypt.compare for hashed passwords (both admin and customer)
    if (storedPassword.startsWith('$2')) {
      isMatch = await bcrypt.compare(String(password), storedPassword);
    } else {
      // legacy plaintext password support (should be rare)
      isMatch = storedPassword === String(password);
    }

    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect password.' });
    }

    if (storedPassword && !storedPassword.startsWith('$2') && user.role !== 'admin') {
      const hashedPassword = await bcrypt.hash(String(password), 12);
      await User.findByIdAndUpdate(user._id, { password: hashedPassword });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        memberSince: user.memberSince
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error during login', error: err.message });
  }
});

// GET /api/auth/users
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
router.get('/users', verifyToken, requireAdmin, async (req, res) => {
  try {
    const users = await listUsers();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching users', error: err.message });
  }
});

module.exports = router;
