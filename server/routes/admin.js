import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, isAdmin, isActive } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for logo upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      // Use the same logic as server/index.js for production reliability
      const publicPath = process.env.PUBLIC_PATH || path.join(process.cwd(), 'public');
      const uploadDir = path.join(publicPath, 'uploads', 'logos');
      console.log('📂 Upload directory path:', uploadDir);
      console.log('📂 Absolute upload path:', path.resolve(uploadDir));

      // Create directory if it doesn't exist
      if (!fs.existsSync(uploadDir)) {
        console.log('📁 Creating upload directory...');
        fs.mkdirSync(uploadDir, { recursive: true });
        console.log('✅ Upload directory created');
      } else {
        console.log('✅ Upload directory exists');
      }

      // Verify directory is writable
      try {
        fs.accessSync(uploadDir, fs.constants.W_OK);
        console.log('✅ Upload directory is writable');
      } catch (err) {
        console.error('❌ Upload directory is not writable:', err);
        return cb(new Error('Upload directory is not writable'));
      }

      cb(null, uploadDir);
    } catch (error) {
      console.error('❌ Error setting up upload destination:', error);
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    try {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const filename = 'logo-' + uniqueSuffix + path.extname(file.originalname);
      console.log('📝 Generated filename:', filename);
      cb(null, filename);
    } catch (error) {
      console.error('❌ Error generating filename:', error);
      cb(error);
    }
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    console.log('🔍 Validating file:', file.originalname, 'Type:', file.mimetype);
    const allowedTypes = /jpeg|jpg|png|gif|svg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      console.log('✅ File type validation passed');
      return cb(null, true);
    } else {
      console.error('❌ File type validation failed');
      cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, svg)'));
    }
  }
});

// Apply authentication and admin middleware to all routes
router.use((req, res, next) => {
  console.log('📨 Admin route request:', req.method, req.path);
  next();
});
router.use(authenticateToken, isActive, isAdmin);

// Get all users (clients)
router.get('/users', async (req, res) => {
  try {
    const showDeleted = req.query.showDeleted === 'true';

    let query = `
      SELECT u.id, u.name, u.email, u.role, u.status, u.product_updates, u.logo_url_light, u.logo_url_dark, u.deleted_at, u.created_at,
             p.home, p.contacts, p.calls_texts, p.emails, p.mailers,
             p.contact_view, p.contact_add, p.contact_edit, p.contact_delete,
             p.contact_import, p.contact_export,
             p.mailer_import, p.mailer_add, p.mailer_sync_all, p.mailer_view,
             p.mailer_sync, p.mailer_start, p.mailer_pause, p.mailer_end, p.mailer_delete,
             p.email_sync_contacts, p.email_sync_campaigns, p.email_view_campaign,
             p.email_export_csv, p.email_archive_campaign, p.email_delete_campaign,
             p.brevo, p.brevo_view_dashboard, p.brevo_view_contacts, p.brevo_view_lists, p.brevo_view_campaigns,
             p.brevo_view_events, p.brevo_view_time_analysis, p.brevo_view_automations, p.brevo_view_stats, p.brevo_sync_data,
             p.brevo_export_csv, p.brevo_export_data,
             p.allowed_lead_types
      FROM users u
      LEFT JOIN permissions p ON u.id = p.user_id
      WHERE u.role = 'client'`;

    if (!showDeleted) {
      query += ` AND u.deleted_at IS NULL`;
    }

    query += ` ORDER BY u.created_at DESC`;

    const [users] = await pool.query(query);

    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Get all admin users
router.get('/admins', async (req, res) => {
  try {
    const showDeleted = req.query.showDeleted === 'true';

    let query = `
      SELECT u.id, u.name, u.email, u.role, u.status, u.created_at, u.deleted_at
      FROM users u
      WHERE u.role = 'admin'`;

    if (!showDeleted) {
      query += ` AND u.deleted_at IS NULL`;
    }

    query += ` ORDER BY u.created_at DESC`;

    const [admins] = await pool.query(query);

    res.json({ admins });
  } catch (error) {
    console.error('Get admins error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Create admin user
router.post('/admins', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    // Check if email already exists
    const [existingUsers] = await pool.query(
      'SELECT id FROM users WHERE email = ? AND deleted_at IS NULL',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'Email already exists.' });
    }

    // Hash password
    const bcrypt = await import('bcryptjs');
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Create admin user
    const [result] = await pool.query(
      `INSERT INTO users (name, email, password, role, status)
       VALUES (?, ?, ?, 'admin', 'active')`,
      [name, email, hashedPassword]
    );

    res.status(201).json({
      message: 'Admin user created successfully.',
      userId: result.insertId
    });
  } catch (error) {
    console.error('Create admin error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email already exists.' });
    }
    res.status(500).json({ error: 'Server error.' });
  }
});

// Update admin user
router.put('/admins/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, status } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required.' });
    }

    // Check if email is already taken by another user
    const [existingUsers] = await pool.query(
      'SELECT id FROM users WHERE email = ? AND id != ? AND deleted_at IS NULL',
      [email, id]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'Email already exists.' });
    }

    const [result] = await pool.query(
      'UPDATE users SET name = ?, email = ?, status = ? WHERE id = ? AND role = ?',
      [name, email, status || 'active', id, 'admin']
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Admin user not found.' });
    }

    res.json({ message: 'Admin user updated successfully.' });
  } catch (error) {
    console.error('Update admin error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email already exists.' });
    }
    res.status(500).json({ error: 'Server error.' });
  }
});

// Soft delete admin user
router.delete('/admins/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting yourself
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own account.' });
    }

    const [result] = await pool.query(
      'UPDATE users SET deleted_at = NOW() WHERE id = ? AND role = ? AND deleted_at IS NULL',
      [id, 'admin']
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Admin user not found.' });
    }

    res.json({ message: 'Admin user deleted successfully.' });
  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Restore deleted admin user
router.post('/admins/:id/restore', async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query(
      'UPDATE users SET deleted_at = NULL WHERE id = ? AND role = ? AND deleted_at IS NOT NULL',
      [id, 'admin']
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Deleted admin user not found.' });
    }

    res.json({ message: 'Admin user restored successfully.' });
  } catch (error) {
    console.error('Restore admin error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Change admin password
router.post('/admins/:id/change-password', async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ error: 'New password is required.' });
    }

    // Hash password
    const bcrypt = await import('bcryptjs');
    const hashedPassword = bcrypt.hashSync(newPassword, 10);

    const [result] = await pool.query(
      'UPDATE users SET password = ? WHERE id = ? AND role = ?',
      [hashedPassword, id, 'admin']
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Admin user not found.' });
    }

    res.json({ message: 'Password changed successfully.' });
  } catch (error) {
    console.error('Change admin password error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Create client user
router.post('/users', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    // Check if email already exists
    const [existingUsers] = await pool.query(
      'SELECT id FROM users WHERE email = ? AND deleted_at IS NULL',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'Email already exists.' });
    }

    // Hash password
    const bcrypt = await import('bcryptjs');
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Create client user
    const [result] = await pool.query(
      `INSERT INTO users (name, email, password, role, status)
       VALUES (?, ?, ?, 'client', 'active')`,
      [name, email, hashedPassword]
    );

    // Create default permissions
    await pool.query(
      `INSERT INTO permissions (user_id, home, contacts, calls_texts, emails, mailers)
       VALUES (?, 1, 1, 1, 1, 1)`,
      [result.insertId]
    );

    res.status(201).json({
      message: 'Client user created successfully.',
      userId: result.insertId
    });
  } catch (error) {
    console.error('Create client error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email already exists.' });
    }
    res.status(500).json({ error: 'Server error.' });
  }
});

// Get pending users
router.get('/users/pending', async (req, res) => {
  try {
    const [users] = await pool.query(`
      SELECT id, name, email, created_at
      FROM users
      WHERE status = 'pending' AND role = 'client'
      ORDER BY created_at DESC
    `);

    res.json({ users });
  } catch (error) {
    console.error('Get pending users error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ========== Admin API Key Management ==========
// IMPORTANT: These routes must come BEFORE /users/:id routes
// because Express matches routes in order

// Get all API keys for a specific user
router.get('/apikeyslist/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const showDeleted = req.query.showDeleted === 'true';

    let query = `SELECT id, name, api_key, is_active, last_used_at, deleted_at, created_at, updated_at
       FROM api_keys
       WHERE user_id = ?`;

    if (!showDeleted) {
      query += ` AND deleted_at IS NULL`;
    }

    query += ` ORDER BY created_at DESC`;

    const [apiKeys] = await pool.query(query, [userId]);

    res.json({ apiKeys });
  } catch (error) {
    console.error('Get API keys error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Create API key for a specific user
router.post('/apikeyslist/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { name } = req.body;

    console.log('🔑 Creating API key for user:', userId, 'name:', name);

    if (!name || name.trim() === '') {
      console.log('❌ API key name is empty');
      return res.status(400).json({ error: 'API key name is required.' });
    }

    // Check if user exists and is a client
    console.log('👤 Checking if user exists...');
    const [users] = await pool.query('SELECT id, role FROM users WHERE id = ?', [userId]);
    console.log('👤 User query result:', users);

    if (users.length === 0) {
      console.log('❌ User not found');
      return res.status(404).json({ error: 'User not found.' });
    }
    if (users[0].role !== 'client') {
      console.log('❌ User is not a client, role:', users[0].role);
      return res.status(400).json({ error: 'API keys can only be created for clients.' });
    }

    // Generate API key
    console.log('🔐 Generating API key...');
    const crypto = await import('crypto');
    const apiKey = crypto.randomBytes(32).toString('hex');
    console.log('✅ API key generated');

    console.log('💾 Inserting API key into database...');
    const [result] = await pool.query(
      `INSERT INTO api_keys (user_id, api_key, name)
       VALUES (?, ?, ?)`,
      [userId, apiKey, name.trim()]
    );
    console.log('✅ API key inserted, ID:', result.insertId);

    console.log('📋 Fetching created API key...');
    const [apiKeys] = await pool.query(
      `SELECT id, name, api_key, is_active, last_used_at, deleted_at, created_at, updated_at
       FROM api_keys
       WHERE id = ?`,
      [result.insertId]
    );
    console.log('✅ API key fetched:', apiKeys[0]);

    res.status(201).json({
      message: 'API key created successfully.',
      apiKey: apiKeys[0]
    });
  } catch (error) {
    console.error('❌ Create API key error:', error);
    console.error('❌ Error details:', error.message);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ error: error.message || 'Server error.' });
  }
});

// Toggle API key active status
router.patch('/apikeyslist/:userId/:keyId/toggle', async (req, res) => {
  try {
    const { userId, keyId } = req.params;

    // Get current status
    const [apiKeys] = await pool.query(
      'SELECT is_active FROM api_keys WHERE id = ? AND user_id = ?',
      [keyId, userId]
    );

    if (apiKeys.length === 0) {
      return res.status(404).json({ error: 'API key not found.' });
    }

    const newStatus = !apiKeys[0].is_active;

    await pool.query(
      'UPDATE api_keys SET is_active = ? WHERE id = ? AND user_id = ?',
      [newStatus, keyId, userId]
    );

    res.json({
      message: `API key ${newStatus ? 'activated' : 'deactivated'} successfully.`,
      is_active: newStatus
    });
  } catch (error) {
    console.error('Toggle API key error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Soft delete API key
router.delete('/apikeyslist/:userId/:keyId', async (req, res) => {
  try {
    const { userId, keyId } = req.params;

    const [result] = await pool.query(
      'UPDATE api_keys SET deleted_at = NOW() WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
      [keyId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'API key not found.' });
    }

    res.json({ message: 'API key deleted successfully.' });
  } catch (error) {
    console.error('Delete API key error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Restore deleted API key
router.post('/apikeyslist/:userId/:keyId/restore', async (req, res) => {
  try {
    const { userId, keyId } = req.params;

    const [result] = await pool.query(
      'UPDATE api_keys SET deleted_at = NULL WHERE id = ? AND user_id = ? AND deleted_at IS NOT NULL',
      [keyId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Deleted API key not found.' });
    }

    res.json({ message: 'API key restored successfully.' });
  } catch (error) {
    console.error('Restore API key error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ========== User Management Routes ==========

// Upload user logo (light or dark mode)
router.post('/users/:id/logo', upload.single('logo'), async (req, res) => {
  console.log('📸 Logo upload request received');
  console.log('📋 User ID:', req.params.id);
  console.log('📋 Mode:', req.body.mode);
  console.log('📋 File received:', req.file ? 'Yes' : 'No');

  try {
    const { id } = req.params;
    const { mode } = req.body; // 'light' or 'dark'

    if (!req.file) {
      console.error('❌ No file uploaded in request');
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    console.log('📁 File details:', {
      filename: req.file.filename,
      originalname: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      path: req.file.path
    });

    if (!mode || !['light', 'dark'].includes(mode)) {
      console.error('❌ Invalid mode:', mode);
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Mode must be either "light" or "dark".' });
    }

    // Verify the file exists
    if (!fs.existsSync(req.file.path)) {
      console.error('❌ File was not saved to disk:', req.file.path);
      return res.status(500).json({ error: 'File upload failed - file not saved to disk.' });
    }

    console.log('✅ File saved successfully to:', req.file.path);

    // Create the logo URL path
    const logoUrl = `/uploads/logos/${req.file.filename}`;
    console.log('🔗 Logo URL to be saved in DB:', logoUrl);

    // Update user's logo_url_light or logo_url_dark in database
    const column = mode === 'light' ? 'logo_url_light' : 'logo_url_dark';
    console.log('💾 Updating database column:', column);

    const [result] = await pool.query(
      `UPDATE users SET ${column} = ? WHERE id = ? AND role = ?`,
      [logoUrl, id, 'client']
    );

    console.log('📊 Database update result:', {
      affectedRows: result.affectedRows,
      changedRows: result.changedRows
    });

    if (result.affectedRows === 0) {
      console.error('❌ User not found or not a client. ID:', id);
      // Delete the uploaded file if user not found
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'User not found.' });
    }

    console.log('✅ Logo uploaded successfully!');
    console.log('📍 Absolute file path:', path.resolve(req.file.path));
    console.log('🌐 URL path:', logoUrl);

    res.json({
      message: `${mode.charAt(0).toUpperCase() + mode.slice(1)} mode logo uploaded successfully.`,
      logo_url: logoUrl,
      mode,
      debug: {
        filename: req.file.filename,
        size: req.file.size,
        savedPath: req.file.path,
        absolutePath: path.resolve(req.file.path),
        fileExists: fs.existsSync(req.file.path)
      }
    });
  } catch (error) {
    console.error('❌ Upload logo error:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      errno: error.errno
    });

    // Delete the uploaded file if there was an error
    if (req.file && req.file.path) {
      try {
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
          console.log('🗑️ Cleaned up failed upload file');
        }
      } catch (cleanupError) {
        console.error('❌ Failed to clean up file:', cleanupError);
      }
    }

    res.status(500).json({
      error: error.message || 'Server error during logo upload.',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Delete user logo (light or dark mode)
router.delete('/users/:id/logo', async (req, res) => {
  try {
    const { id } = req.params;
    const { mode } = req.query; // 'light' or 'dark'

    if (!mode || !['light', 'dark'].includes(mode)) {
      return res.status(400).json({ error: 'Mode must be either "light" or "dark".' });
    }

    const column = mode === 'light' ? 'logo_url_light' : 'logo_url_dark';

    // Get current logo URL
    const [users] = await pool.query(
      `SELECT ${column} as logo_url FROM users WHERE id = ? AND role = ?`,
      [id, 'client']
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const logoUrl = users[0].logo_url;

    // Update user's logo to null
    await pool.query(
      `UPDATE users SET ${column} = NULL WHERE id = ? AND role = ?`,
      [id, 'client']
    );

    // Delete the file if it exists
    if (logoUrl) {
      const publicPath = process.env.PUBLIC_PATH || path.join(process.cwd(), 'public');
      const filePath = path.join(publicPath, logoUrl);
      console.log('🗑️ Attempting to delete file:', filePath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('✅ File deleted successfully');
      } else {
        console.log('⚠️ File not found, nothing to delete');
      }
    }

    res.json({ message: `${mode.charAt(0).toUpperCase() + mode.slice(1)} mode logo deleted successfully.` });
  } catch (error) {
    console.error('Delete logo error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Approve user
router.post('/users/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query(
      'UPDATE users SET status = ? WHERE id = ? AND role = ?',
      ['active', id, 'client']
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ message: 'User approved successfully.' });
  } catch (error) {
    console.error('Approve user error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Suspend user
router.post('/users/:id/suspend', async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query(
      'UPDATE users SET status = ? WHERE id = ? AND role = ?',
      ['suspended', id, 'client']
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ message: 'User suspended successfully.' });
  } catch (error) {
    console.error('Suspend user error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Update user permissions
router.put('/users/:id/permissions', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      home, contacts, calls_texts, emails, mailers,
      contact_view, contact_add, contact_edit, contact_delete,
      contact_import, contact_export,
      mailer_import, mailer_add, mailer_sync_all, mailer_view,
      mailer_sync, mailer_start, mailer_pause, mailer_end, mailer_delete,
      email_sync_contacts, email_sync_campaigns, email_view_campaign,
      email_export_csv, email_archive_campaign, email_delete_campaign,
      brevo, brevo_view_dashboard, brevo_view_contacts, brevo_view_lists, brevo_view_campaigns,
      brevo_view_events, brevo_view_time_analysis, brevo_view_automations, brevo_view_stats, brevo_sync_data,
      brevo_export_csv, brevo_export_data,
      allowed_lead_types
    } = req.body;

    console.log('📝 Updating permissions for user:', id);
    console.log('📦 Received permissions:', req.body);

    // Check if user exists
    const [users] = await pool.query('SELECT id FROM users WHERE id = ? AND role = ?', [id, 'client']);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Prepare allowed_lead_types JSON
    const allowedLeadTypesJson = allowed_lead_types ? JSON.stringify(allowed_lead_types) : null;
    console.log('🔧 Prepared allowed_lead_types JSON:', allowedLeadTypesJson);

    // Update permissions
    const [result] = await pool.query(
      `UPDATE permissions
       SET home = ?, contacts = ?, calls_texts = ?, emails = ?, mailers = ?,
           contact_view = ?, contact_add = ?, contact_edit = ?, contact_delete = ?,
           contact_import = ?, contact_export = ?,
           mailer_import = ?, mailer_add = ?, mailer_sync_all = ?, mailer_view = ?,
           mailer_sync = ?, mailer_start = ?, mailer_pause = ?, mailer_end = ?, mailer_delete = ?,
           email_sync_contacts = ?, email_sync_campaigns = ?, email_view_campaign = ?,
           email_export_csv = ?, email_archive_campaign = ?, email_delete_campaign = ?,
           brevo = ?, brevo_view_dashboard = ?, brevo_view_contacts = ?, brevo_view_lists = ?, brevo_view_campaigns = ?,
           brevo_view_events = ?, brevo_view_time_analysis = ?, brevo_view_automations = ?, brevo_view_stats = ?, brevo_sync_data = ?,
           brevo_export_csv = ?, brevo_export_data = ?,
           allowed_lead_types = ?
       WHERE user_id = ?`,
      [
        home ? 1 : 0,
        contacts ? 1 : 0,
        calls_texts ? 1 : 0,
        emails ? 1 : 0,
        mailers ? 1 : 0,
        contact_view ? 1 : 0,
        contact_add ? 1 : 0,
        contact_edit ? 1 : 0,
        contact_delete ? 1 : 0,
        contact_import ? 1 : 0,
        contact_export ? 1 : 0,
        mailer_import ? 1 : 0,
        mailer_add ? 1 : 0,
        mailer_sync_all ? 1 : 0,
        mailer_view ? 1 : 0,
        mailer_sync ? 1 : 0,
        mailer_start ? 1 : 0,
        mailer_pause ? 1 : 0,
        mailer_end ? 1 : 0,
        mailer_delete ? 1 : 0,
        email_sync_contacts ? 1 : 0,
        email_sync_campaigns ? 1 : 0,
        email_view_campaign ? 1 : 0,
        email_export_csv ? 1 : 0,
        email_archive_campaign ? 1 : 0,
        email_delete_campaign ? 1 : 0,
        brevo ? 1 : 0,
        brevo_view_dashboard ? 1 : 0,
        brevo_view_contacts ? 1 : 0,
        brevo_view_lists ? 1 : 0,
        brevo_view_campaigns ? 1 : 0,
        brevo_view_events ? 1 : 0,
        brevo_view_time_analysis ? 1 : 0,
        brevo_view_automations ? 1 : 0,
        brevo_view_stats ? 1 : 0,
        brevo_sync_data ? 1 : 0,
        brevo_export_csv ? 1 : 0,
        brevo_export_data ? 1 : 0,
        allowedLeadTypesJson,
        id
      ]
    );

    console.log('✅ Update result:', result.affectedRows, 'row(s) updated');

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Permissions not found.' });
    }

    res.json({ message: 'Permissions updated successfully.' });
  } catch (error) {
    console.error('Update permissions error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Get user API configuration
router.get('/users/:id/api-config', async (req, res) => {
  try {
    const { id } = req.params;

    const [configs] = await pool.query('SELECT * FROM api_configs WHERE user_id = ?', [id]);
    let config = configs[0];

    // If no config exists, create default one
    if (!config) {
      const [result] = await pool.query(
        'INSERT INTO api_configs (user_id) VALUES (?)',
        [id]
      );
      const [newConfigs] = await pool.query('SELECT * FROM api_configs WHERE id = ?', [result.insertId]);
      config = newConfigs[0];
    }

    res.json({ config });
  } catch (error) {
    console.error('Get API config error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Update user API configuration
router.put('/users/:id/api-config', async (req, res) => {
  console.log('🔵 API Config PUT request received');
  console.log('🔵 User ID:', req.params.id);
  console.log('🔵 Request body:', req.body);
  try {
    const { id } = req.params;
    const {
      aloware_api_key,
      aloware_account_id,
      dealmachine_bearer_token,
      dealmachine_get_lead,
      mailer_campaign_id,
      dealmachine_start_mail,
      dealmachine_pause_mail,
      dealmachine_end_mail,
      landing_page_url,
      brevo_api_key,
      brevo_account_email
    } = req.body;

    // Check if config exists
    const [configs] = await pool.query('SELECT id FROM api_configs WHERE user_id = ?', [id]);

    if (configs.length === 0) {
      // Create new config
      await pool.query(
        `INSERT INTO api_configs (
          user_id, aloware_api_key, aloware_account_id,
          dealmachine_bearer_token, dealmachine_get_lead,
          mailer_campaign_id, dealmachine_start_mail,
          dealmachine_pause_mail, dealmachine_end_mail,
          landing_page_url, brevo_api_key, brevo_account_email
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, aloware_api_key, aloware_account_id,
          dealmachine_bearer_token, dealmachine_get_lead,
          mailer_campaign_id, dealmachine_start_mail,
          dealmachine_pause_mail, dealmachine_end_mail,
          landing_page_url, brevo_api_key, brevo_account_email
        ]
      );
    } else {
      // Update existing config
      await pool.query(
        `UPDATE api_configs
         SET aloware_api_key = ?,
             aloware_account_id = ?,
             dealmachine_bearer_token = ?,
             dealmachine_get_lead = ?,
             mailer_campaign_id = ?,
             dealmachine_start_mail = ?,
             dealmachine_pause_mail = ?,
             dealmachine_end_mail = ?,
             landing_page_url = ?,
             brevo_api_key = ?,
             brevo_account_email = ?
         WHERE user_id = ?`,
        [
          aloware_api_key, aloware_account_id,
          dealmachine_bearer_token, dealmachine_get_lead,
          mailer_campaign_id, dealmachine_start_mail,
          dealmachine_pause_mail, dealmachine_end_mail,
          landing_page_url, brevo_api_key, brevo_account_email, id
        ]
      );
    }

    res.json({ message: 'API configuration updated successfully.' });
  } catch (error) {
    console.error('❌ Update API config error:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    if (error.sql) {
      console.error('❌ SQL Query:', error.sql);
      console.error('❌ SQL Error:', error.sqlMessage);
    }
    res.status(500).json({ error: error.message || 'Server error.' });
  }
});

// Update user details (edit user)
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, status, logo_url_light, logo_url_dark } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required.' });
    }

    const [result] = await pool.query(
      'UPDATE users SET name = ?, email = ?, status = ?, logo_url_light = ?, logo_url_dark = ? WHERE id = ? AND role = ?',
      [name, email, status || 'active', logo_url_light || null, logo_url_dark || null, id, 'client']
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ message: 'User updated successfully.' });
  } catch (error) {
    console.error('Update user error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email already exists.' });
    }
    res.status(500).json({ error: 'Server error.' });
  }
});

// Soft delete user
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query(
      'UPDATE users SET deleted_at = NOW() WHERE id = ? AND role = ? AND deleted_at IS NULL',
      [id, 'client']
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ message: 'User deleted successfully.' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Restore deleted user
router.post('/users/:id/restore', async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query(
      'UPDATE users SET deleted_at = NULL WHERE id = ? AND role = ? AND deleted_at IS NOT NULL',
      [id, 'client']
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Deleted user not found.' });
    }

    res.json({ message: 'User restored successfully.' });
  } catch (error) {
    console.error('Restore user error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Permanent delete user
router.delete('/users/:id/permanent', async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query(
      'DELETE FROM users WHERE id = ? AND role = ?',
      [id, 'client']
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ message: 'User permanently deleted.' });
  } catch (error) {
    console.error('Permanent delete user error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// =====================
// Campaign Routes
// =====================

// Get all campaigns
router.get('/campaigns', async (req, res) => {
  try {
    console.log('📨 Admin route request: GET /campaigns');
    const { showDeleted } = req.query;

    let query = 'SELECT * FROM campaigns';
    if (showDeleted !== 'true') {
      query += ' WHERE deleted_at IS NULL';
    }
    query += ' ORDER BY step ASC, mail_sequence_value ASC';

    const [campaigns] = await pool.query(query);
    res.json(campaigns);
  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Create new campaign
router.post('/campaigns', async (req, res) => {
  try {
    console.log('📨 Admin route request: POST /campaigns');
    const { mail_sequence_value, step, mail_design_label, mail_cost } = req.body;

    // Validate required fields
    if (!mail_sequence_value || !step || !mail_design_label || mail_cost === undefined) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const [result] = await pool.query(
      `INSERT INTO campaigns (mail_sequence_value, step, mail_design_label, mail_cost)
       VALUES (?, ?, ?, ?)`,
      [mail_sequence_value, step, mail_design_label, mail_cost]
    );

    res.status(201).json({
      message: 'Campaign created successfully.',
      id: result.insertId
    });
  } catch (error) {
    console.error('Create campaign error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Update campaign
router.put('/campaigns/:id', async (req, res) => {
  try {
    console.log('📨 Admin route request: PUT /campaigns/:id');
    const { id } = req.params;
    const { mail_sequence_value, step, mail_design_label, mail_cost } = req.body;

    // Validate required fields
    if (!mail_sequence_value || !step || !mail_design_label || mail_cost === undefined) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const [result] = await pool.query(
      `UPDATE campaigns
       SET mail_sequence_value = ?,
           step = ?,
           mail_design_label = ?,
           mail_cost = ?
       WHERE id = ?`,
      [mail_sequence_value, step, mail_design_label, mail_cost, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Campaign not found.' });
    }

    res.json({ message: 'Campaign updated successfully.' });
  } catch (error) {
    console.error('Update campaign error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Soft delete campaign
router.delete('/campaigns/:id', async (req, res) => {
  try {
    console.log('📨 Admin route request: DELETE /campaigns/:id');
    const { id } = req.params;

    const [result] = await pool.query(
      'UPDATE campaigns SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Campaign not found or already deleted.' });
    }

    res.json({ message: 'Campaign deleted successfully.' });
  } catch (error) {
    console.error('Delete campaign error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Restore deleted campaign
router.put('/campaigns/:id/restore', async (req, res) => {
  try {
    console.log('📨 Admin route request: PUT /campaigns/:id/restore');
    const { id } = req.params;

    const [result] = await pool.query(
      'UPDATE campaigns SET deleted_at = NULL WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Campaign not found.' });
    }

    res.json({ message: 'Campaign restored successfully.' });
  } catch (error) {
    console.error('Restore campaign error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ============================================
// BREVO WEBHOOK CONFIGURATION ROUTES
// ============================================

/**
 * GET /api/admin/brevo-webhooks
 * Get all user Brevo webhook configurations and users without webhooks
 */
router.get('/brevo-webhooks', async (req, res) => {
  try {
    console.log('📨 Admin route request: GET /brevo-webhooks');

    const [webhooks] = await pool.query(`
      SELECT
        bw.id,
        bw.user_id,
        bw.webhook_token,
        bw.webhook_url,
        bw.is_active,
        bw.events_received,
        bw.last_event_at,
        bw.created_at,
        bw.updated_at,
        u.name as user_name,
        u.email as user_email,
        ac.brevo_api_key,
        ac.brevo_account_email
      FROM brevo_webhooks bw
      INNER JOIN users u ON bw.user_id = u.id
      LEFT JOIN api_configs ac ON bw.user_id = ac.user_id
      WHERE u.deleted_at IS NULL
      ORDER BY u.email ASC
    `);

    // Get users with Brevo API keys but no webhooks
    const [usersWithoutWebhooks] = await pool.query(`
      SELECT
        u.id as user_id,
        u.name as user_name,
        u.email as user_email,
        ac.brevo_api_key,
        ac.brevo_account_email
      FROM users u
      INNER JOIN api_configs ac ON u.id = ac.user_id
      WHERE ac.brevo_api_key IS NOT NULL
      AND ac.brevo_api_key != ''
      AND u.deleted_at IS NULL
      AND u.id NOT IN (SELECT user_id FROM brevo_webhooks)
      ORDER BY u.email ASC
    `);

    res.json({ webhooks, usersWithoutWebhooks });
  } catch (error) {
    console.error('Get brevo webhooks error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/admin/brevo-webhooks/:userId
 * Get Brevo webhook configuration for specific user
 */
router.get('/brevo-webhooks/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`📨 Admin route request: GET /brevo-webhooks/${userId}`);

    const [webhooks] = await pool.query(`
      SELECT
        bw.*,
        u.name as user_name,
        u.email as user_email,
        ac.brevo_api_key,
        ac.brevo_account_email
      FROM brevo_webhooks bw
      INNER JOIN users u ON bw.user_id = u.id
      LEFT JOIN api_configs ac ON bw.user_id = ac.user_id
      WHERE bw.user_id = ? AND u.deleted_at IS NULL
    `, [userId]);

    if (webhooks.length === 0) {
      return res.status(404).json({ error: 'Webhook configuration not found' });
    }

    res.json({ webhook: webhooks[0] });
  } catch (error) {
    console.error('Get user brevo webhook error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/admin/brevo-webhooks/:userId/generate
 * Generate or regenerate webhook token for user
 */
router.post('/brevo-webhooks/:userId/generate', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`📨 Admin route request: POST /brevo-webhooks/${userId}/generate`);

    // Check if user exists and has Brevo API key
    const [users] = await pool.query(`
      SELECT u.id, u.email, ac.brevo_api_key
      FROM users u
      LEFT JOIN api_configs ac ON u.id = ac.user_id
      WHERE u.id = ? AND u.deleted_at IS NULL
    `, [userId]);

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate new webhook token
    const token = crypto.randomBytes(32).toString('hex');
    const webhookUrl = `${req.protocol}://${req.get('host')}/api/webhooks/brevo/${token}`;

    // Insert or update webhook configuration
    await pool.query(`
      INSERT INTO brevo_webhooks (user_id, webhook_token, webhook_url)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        webhook_token = VALUES(webhook_token),
        webhook_url = VALUES(webhook_url),
        updated_at = CURRENT_TIMESTAMP
    `, [userId, token, webhookUrl]);

    // Fetch the updated webhook configuration
    const [webhooks] = await pool.query(`
      SELECT * FROM brevo_webhooks WHERE user_id = ?
    `, [userId]);

    res.json({
      message: 'Webhook generated successfully',
      webhook: webhooks[0]
    });
  } catch (error) {
    console.error('Generate brevo webhook error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * PUT /api/admin/brevo-webhooks/:userId/toggle
 * Toggle webhook active status
 */
router.put('/brevo-webhooks/:userId/toggle', async (req, res) => {
  try {
    const { userId } = req.params;
    const { is_active } = req.body;
    console.log(`📨 Admin route request: PUT /brevo-webhooks/${userId}/toggle`);

    const [result] = await pool.query(`
      UPDATE brevo_webhooks
      SET is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `, [is_active ? 1 : 0, userId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Webhook configuration not found' });
    }

    res.json({ message: 'Webhook status updated successfully' });
  } catch (error) {
    console.error('Toggle brevo webhook error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * DELETE /api/admin/brevo-webhooks/:userId
 * Delete webhook configuration for user
 */
router.delete('/brevo-webhooks/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`📨 Admin route request: DELETE /brevo-webhooks/${userId}`);

    const [result] = await pool.query(
      'DELETE FROM brevo_webhooks WHERE user_id = ?',
      [userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Webhook configuration not found' });
    }

    res.json({ message: 'Webhook configuration deleted successfully' });
  } catch (error) {
    console.error('Delete brevo webhook error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

