import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, productUpdates, agreeToTerms } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    if (!agreeToTerms) {
      return res.status(400).json({ error: 'You must agree to the Terms of Use & Privacy Policy.' });
    }

    // Check if user already exists (only check non-deleted users)
    const [existingUsers] = await pool.query('SELECT id FROM users WHERE email = ? AND deleted_at IS NULL', [email]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'Email already registered.' });
    }

    // Hash password
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Create user (status: pending by default)
    const [result] = await pool.query(
      `INSERT INTO users (name, email, password, role, status, product_updates)
       VALUES (?, ?, ?, 'client', 'pending', ?)`,
      [name, email, hashedPassword, productUpdates ? 1 : 0]
    );

    // Create default permissions
    await pool.query(
      `INSERT INTO permissions (user_id, home, contacts, calls_texts, emails, mailers)
       VALUES (?, 1, 1, 1, 1, 1)`,
      [result.insertId]
    );

    res.status(201).json({
      message: 'Registration successful! Your account is pending admin approval.',
      userId: result.insertId
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // Find user
    const [users] = await pool.query(
      `SELECT u.*, p.home, p.contacts, p.calls_texts, p.emails, p.mailers
       FROM users u
       LEFT JOIN permissions p ON u.id = p.user_id
       WHERE u.email = ? AND u.deleted_at IS NULL`,
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = users[0];

    // Check password
    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Check if account is approved
    if (user.status === 'pending') {
      return res.status(403).json({ error: 'Your account is pending admin approval.' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'Your account has been suspended.' });
    }

    // Generate token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      message: 'Login successful',
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.status, u.product_updates, u.logo_url_light, u.logo_url_dark, u.created_at,
              p.home, p.contacts, p.calls_texts, p.emails, p.mailers,
              p.contact_view, p.contact_add, p.contact_edit, p.contact_delete,
              p.contact_import, p.contact_export,
              p.mailer_import, p.mailer_add, p.mailer_sync_all, p.mailer_view,
              p.mailer_sync, p.mailer_start, p.mailer_pause, p.mailer_end, p.mailer_delete,
              p.email_sync_contacts, p.email_sync_campaigns, p.email_view_campaign,
              p.email_export_csv, p.email_archive_campaign, p.email_delete_campaign,
              p.allowed_lead_types
       FROM users u
       LEFT JOIN permissions p ON u.id = p.user_id
       WHERE u.id = ? AND u.deleted_at IS NULL`,
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ user: users[0] });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Update profile (name and email)
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required.' });
    }

    // Check if email is already taken by another user
    const [existingUsers] = await pool.query(
      'SELECT id FROM users WHERE email = ? AND id != ? AND deleted_at IS NULL',
      [email, req.user.id]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'Email already in use.' });
    }

    // Update user
    const [result] = await pool.query(
      'UPDATE users SET name = ?, email = ? WHERE id = ?',
      [name, email, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ message: 'Profile updated successfully.' });
  } catch (error) {
    console.error('Update profile error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email already in use.' });
    }
    res.status(500).json({ error: 'Server error.' });
  }
});

// Change password
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required.' });
    }

    // Get user
    const [users] = await pool.query('SELECT password FROM users WHERE id = ? AND deleted_at IS NULL', [req.user.id]);

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const user = users[0];

    // Verify current password
    const validPassword = bcrypt.compareSync(currentPassword, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    // Hash and update new password
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id]);

    res.json({ message: 'Password changed successfully.' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

export default router;
