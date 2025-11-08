import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, isActive } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication middleware
router.use(authenticateToken, isActive);

// Get all contacts for the current user
router.get('/', async (req, res) => {
  try {
    const [contacts] = await pool.query(
      `SELECT * FROM contacts
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    res.json({ contacts });
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Get single contact
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [contacts] = await pool.query(
      `SELECT * FROM contacts
       WHERE id = ? AND user_id = ?`,
      [id, req.user.id]
    );

    if (contacts.length === 0) {
      return res.status(404).json({ error: 'Contact not found.' });
    }

    res.json({ contact: contacts[0] });
  } catch (error) {
    console.error('Get contact error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Create contact
router.post('/', async (req, res) => {
  try {
    const { first_name, last_name, email, phone, lead_type, status } = req.body;

    if (!first_name || !last_name) {
      return res.status(400).json({ error: 'First name and last name are required.' });
    }

    const [result] = await pool.query(
      `INSERT INTO contacts (user_id, first_name, last_name, email, phone, lead_type, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        first_name,
        last_name,
        email || null,
        phone || null,
        lead_type || null,
        status || 'new'
      ]
    );

    const [contacts] = await pool.query('SELECT * FROM contacts WHERE id = ?', [result.insertId]);

    res.status(201).json({ message: 'Contact created successfully.', contact: contacts[0] });
  } catch (error) {
    console.error('Create contact error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Update contact
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, email, phone, lead_type, status } = req.body;

    const [result] = await pool.query(
      `UPDATE contacts
       SET first_name = ?, last_name = ?, email = ?, phone = ?, lead_type = ?, status = ?
       WHERE id = ? AND user_id = ?`,
      [first_name, last_name, email, phone, lead_type, status, id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Contact not found.' });
    }

    const [contacts] = await pool.query('SELECT * FROM contacts WHERE id = ?', [id]);

    res.json({ message: 'Contact updated successfully.', contact: contacts[0] });
  } catch (error) {
    console.error('Update contact error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Delete contact
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query(
      'DELETE FROM contacts WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Contact not found.' });
    }

    res.json({ message: 'Contact deleted successfully.' });
  } catch (error) {
    console.error('Delete contact error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

export default router;
