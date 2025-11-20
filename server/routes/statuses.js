import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all statuses
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [statuses] = await pool.query(
      'SELECT * FROM statuses ORDER BY name ASC'
    );
    res.json(statuses);
  } catch (error) {
    console.error('Get statuses error:', error);
    res.status(500).json({ error: 'Failed to get statuses' });
  }
});

// Get single status
router.get('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const [statuses] = await pool.query(
      'SELECT * FROM statuses WHERE id = ?',
      [req.params.id]
    );

    if (statuses.length === 0) {
      return res.status(404).json({ error: 'Status not found' });
    }

    res.json(statuses[0]);
  } catch (error) {
    console.error('Get status error:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// Create new status (admin only)
router.post('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { name, color } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const [result] = await pool.query(
      'INSERT INTO statuses (name, color) VALUES (?, ?)',
      [name, color || '#3B82F6']
    );

    const [newStatus] = await pool.query(
      'SELECT * FROM statuses WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json(newStatus[0]);
  } catch (error) {
    console.error('Create status error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Status name already exists' });
    }
    res.status(500).json({ error: 'Failed to create status' });
  }
});

// Update status (admin only)
router.put('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { name, color } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const [result] = await pool.query(
      'UPDATE statuses SET name = ?, color = ? WHERE id = ?',
      [name, color || '#3B82F6', req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Status not found' });
    }

    const [updatedStatus] = await pool.query(
      'SELECT * FROM statuses WHERE id = ?',
      [req.params.id]
    );

    res.json(updatedStatus[0]);
  } catch (error) {
    console.error('Update status error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Status name already exists' });
    }
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Delete status (admin only)
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    // Check if status is in use
    const [contacts] = await pool.query(
      'SELECT COUNT(*) as count FROM contacts WHERE status_id = ?',
      [req.params.id]
    );

    if (contacts[0].count > 0) {
      return res.status(400).json({
        error: `Cannot delete status. It is currently assigned to ${contacts[0].count} contact(s).`
      });
    }

    const [result] = await pool.query(
      'DELETE FROM statuses WHERE id = ?',
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Status not found' });
    }

    res.json({ message: 'Status deleted successfully' });
  } catch (error) {
    console.error('Delete status error:', error);
    res.status(500).json({ error: 'Failed to delete status' });
  }
});

export default router;
