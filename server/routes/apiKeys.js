import express from 'express';
import crypto from 'crypto';
import pool from '../config/database.js';
import { authenticateToken, isActive } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication middleware
router.use(authenticateToken, isActive);

// Generate a secure random API key
const generateApiKey = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Get all API keys for the current user
router.get('/', async (req, res) => {
  try {
    const showDeleted = req.query.showDeleted === 'true';

    let query = `SELECT id, name, api_key, is_active, last_used_at, deleted_at, created_at, updated_at
       FROM api_keys
       WHERE user_id = ?`;

    if (!showDeleted) {
      query += ` AND deleted_at IS NULL`;
    }

    query += ` ORDER BY created_at DESC`;

    const [apiKeys] = await pool.query(query, [req.user.id]);

    res.json({ apiKeys });
  } catch (error) {
    console.error('Get API keys error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Create new API key
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'API key name is required.' });
    }

    const apiKey = generateApiKey();

    const [result] = await pool.query(
      `INSERT INTO api_keys (user_id, api_key, name)
       VALUES (?, ?, ?)`,
      [req.user.id, apiKey, name.trim()]
    );

    const [apiKeys] = await pool.query(
      `SELECT id, name, api_key, is_active, last_used_at, created_at, updated_at
       FROM api_keys
       WHERE id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      message: 'API key created successfully.',
      apiKey: apiKeys[0]
    });
  } catch (error) {
    console.error('Create API key error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Toggle API key active status
router.patch('/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;

    // Get current status
    const [apiKeys] = await pool.query(
      'SELECT is_active FROM api_keys WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (apiKeys.length === 0) {
      return res.status(404).json({ error: 'API key not found.' });
    }

    const newStatus = !apiKeys[0].is_active;

    await pool.query(
      'UPDATE api_keys SET is_active = ? WHERE id = ? AND user_id = ?',
      [newStatus, id, req.user.id]
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
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query(
      'UPDATE api_keys SET deleted_at = NOW() WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
      [id, req.user.id]
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
router.post('/:id/restore', async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query(
      'UPDATE api_keys SET deleted_at = NULL WHERE id = ? AND user_id = ? AND deleted_at IS NOT NULL',
      [id, req.user.id]
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

// Permanent delete API key (hard delete)
router.delete('/:id/permanent', async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query(
      'DELETE FROM api_keys WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'API key not found.' });
    }

    res.json({ message: 'API key permanently deleted.' });
  } catch (error) {
    console.error('Permanent delete API key error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

export default router;
