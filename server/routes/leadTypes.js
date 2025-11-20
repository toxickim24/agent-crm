import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all lead types
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [leadTypes] = await pool.query(
      'SELECT * FROM lead_types ORDER BY name ASC'
    );
    res.json(leadTypes);
  } catch (error) {
    console.error('Get lead types error:', error);
    res.status(500).json({ error: 'Failed to get lead types' });
  }
});

// Get single lead type
router.get('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const [leadTypes] = await pool.query(
      'SELECT * FROM lead_types WHERE id = ?',
      [req.params.id]
    );

    if (leadTypes.length === 0) {
      return res.status(404).json({ error: 'Lead type not found' });
    }

    res.json(leadTypes[0]);
  } catch (error) {
    console.error('Get lead type error:', error);
    res.status(500).json({ error: 'Failed to get lead type' });
  }
});

// Create new lead type (admin only)
router.post('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { name, color } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const [result] = await pool.query(
      'INSERT INTO lead_types (name, color) VALUES (?, ?)',
      [name, color || '#3B82F6']
    );

    const [newLeadType] = await pool.query(
      'SELECT * FROM lead_types WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json(newLeadType[0]);
  } catch (error) {
    console.error('Create lead type error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Lead type name already exists' });
    }
    res.status(500).json({ error: 'Failed to create lead type' });
  }
});

// Update lead type (admin only)
router.put('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { name, color } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const [result] = await pool.query(
      'UPDATE lead_types SET name = ?, color = ? WHERE id = ?',
      [name, color || '#3B82F6', req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Lead type not found' });
    }

    const [updatedLeadType] = await pool.query(
      'SELECT * FROM lead_types WHERE id = ?',
      [req.params.id]
    );

    res.json(updatedLeadType[0]);
  } catch (error) {
    console.error('Update lead type error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Lead type name already exists' });
    }
    res.status(500).json({ error: 'Failed to update lead type' });
  }
});

// Delete lead type (admin only)
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    // Check if lead type is in use
    const [contacts] = await pool.query(
      'SELECT COUNT(*) as count FROM contacts WHERE lead_type = ?',
      [req.params.id]
    );

    if (contacts[0].count > 0) {
      return res.status(400).json({
        error: `Cannot delete lead type. It is currently assigned to ${contacts[0].count} contact(s).`
      });
    }

    const [result] = await pool.query(
      'DELETE FROM lead_types WHERE id = ?',
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Lead type not found' });
    }

    res.json({ message: 'Lead type deleted successfully' });
  } catch (error) {
    console.error('Delete lead type error:', error);
    res.status(500).json({ error: 'Failed to delete lead type' });
  }
});

export default router;
