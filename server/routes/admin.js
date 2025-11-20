import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, isAdmin, isActive } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication and admin middleware to all routes
router.use(authenticateToken, isActive, isAdmin);

// Get all users (clients)
router.get('/users', async (req, res) => {
  try {
    const [users] = await pool.query(`
      SELECT u.id, u.name, u.email, u.role, u.status, u.product_updates, u.created_at,
             p.home, p.contacts, p.calls_texts, p.emails, p.mailers,
             p.contact_view, p.contact_add, p.contact_edit, p.contact_delete,
             p.contact_import, p.contact_export, p.allowed_lead_types
      FROM users u
      LEFT JOIN permissions p ON u.id = p.user_id
      WHERE u.role = 'client'
      ORDER BY u.created_at DESC
    `);

    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
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
      contact_import, contact_export, allowed_lead_types
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
           contact_import = ?, contact_export = ?, allowed_lead_types = ?
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
  try {
    const { id } = req.params;
    const {
      aloware_api_key,
      aloware_account_id,
      mailchimp_api_key,
      mailchimp_server_prefix,
      dealmachine_api_key,
      dealmachine_account_id,
      landing_page_url
    } = req.body;

    // Check if config exists
    const [configs] = await pool.query('SELECT id FROM api_configs WHERE user_id = ?', [id]);

    if (configs.length === 0) {
      // Create new config
      await pool.query(
        `INSERT INTO api_configs (
          user_id, aloware_api_key, aloware_account_id,
          mailchimp_api_key, mailchimp_server_prefix,
          dealmachine_api_key, dealmachine_account_id,
          landing_page_url
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, aloware_api_key, aloware_account_id,
          mailchimp_api_key, mailchimp_server_prefix,
          dealmachine_api_key, dealmachine_account_id,
          landing_page_url
        ]
      );
    } else {
      // Update existing config
      await pool.query(
        `UPDATE api_configs
         SET aloware_api_key = ?,
             aloware_account_id = ?,
             mailchimp_api_key = ?,
             mailchimp_server_prefix = ?,
             dealmachine_api_key = ?,
             dealmachine_account_id = ?,
             landing_page_url = ?
         WHERE user_id = ?`,
        [
          aloware_api_key, aloware_account_id,
          mailchimp_api_key, mailchimp_server_prefix,
          dealmachine_api_key, dealmachine_account_id,
          landing_page_url, id
        ]
      );
    }

    res.json({ message: 'API configuration updated successfully.' });
  } catch (error) {
    console.error('Update API config error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query(
      'DELETE FROM users WHERE id = ? AND role = ?',
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

export default router;
