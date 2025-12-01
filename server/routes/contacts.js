import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, isActive } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication middleware
router.use(authenticateToken, isActive);

// Get all contacts for the current user with lead type details
router.get('/', async (req, res) => {
  try {
    const showDeleted = req.query.showDeleted === 'true';
    const leadType = req.query.lead_type;

    console.log(`📋 GET /contacts - user_id: ${req.user.id}, lead_type filter: ${leadType || 'none'}`);

    let query = `SELECT c.*, lt.name as lead_type_name, lt.color as lead_type_color,
       s.name as status_name, s.color as status_color
       FROM contacts c
       LEFT JOIN lead_types lt ON c.lead_type = lt.id
       LEFT JOIN statuses s ON c.status_id = s.id
       WHERE c.user_id = ?`;

    const params = [req.user.id];

    if (!showDeleted) {
      query += ` AND c.deleted_at IS NULL`;
    }

    if (leadType) {
      query += ` AND c.lead_type = ?`;
      params.push(leadType);
    }

    query += ` ORDER BY c.created_at DESC`;

    const [contacts] = await pool.query(query, params);

    console.log(`✅ Returned ${contacts.length} contacts`);

    res.json({ contacts });
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Get single contact with lead type details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [contacts] = await pool.query(
      `SELECT c.*, lt.name as lead_type_name, lt.color as lead_type_color,
       s.name as status_name, s.color as status_color
       FROM contacts c
       LEFT JOIN lead_types lt ON c.lead_type = lt.id
       LEFT JOIN statuses s ON c.status_id = s.id
       WHERE c.id = ? AND c.user_id = ?`,
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
    const {
      lead_id,
      property_address_full,
      property_address_city,
      property_address_state,
      property_address_zipcode,
      property_address_county,
      estimated_value,
      property_type,
      sale_date,
      contact_1_name,
      contact_1_phone1,
      contact_1_email1,
      lead_type,
      status_id
    } = req.body;

    if (!contact_1_name) {
      return res.status(400).json({ error: 'Contact name is required.' });
    }

    const [result] = await pool.query(
      `INSERT INTO contacts (
        user_id, lead_id, property_address_full, property_address_city,
        property_address_state, property_address_zipcode, property_address_county,
        estimated_value, property_type, sale_date, contact_1_name,
        contact_1_phone1, contact_1_email1, lead_type, status_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        lead_id || null,
        property_address_full || null,
        property_address_city || null,
        property_address_state || null,
        property_address_zipcode || null,
        property_address_county || null,
        estimated_value || null,
        property_type || null,
        sale_date || null,
        contact_1_name,
        contact_1_phone1 || null,
        contact_1_email1 || null,
        lead_type || null,
        status_id || null
      ]
    );

    const [contacts] = await pool.query(
      `SELECT c.*, lt.name as lead_type_name, lt.color as lead_type_color,
       s.name as status_name, s.color as status_color
       FROM contacts c
       LEFT JOIN lead_types lt ON c.lead_type = lt.id
       LEFT JOIN statuses s ON c.status_id = s.id
       WHERE c.id = ?`,
      [result.insertId]
    );

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
    const {
      lead_id,
      property_address_full,
      property_address_city,
      property_address_state,
      property_address_zipcode,
      property_address_county,
      estimated_value,
      property_type,
      sale_date,
      contact_1_name,
      contact_1_phone1,
      contact_1_email1,
      lead_type,
      status_id
    } = req.body;

    const [result] = await pool.query(
      `UPDATE contacts SET
        lead_id = ?,
        property_address_full = ?,
        property_address_city = ?,
        property_address_state = ?,
        property_address_zipcode = ?,
        property_address_county = ?,
        estimated_value = ?,
        property_type = ?,
        sale_date = ?,
        contact_1_name = ?,
        contact_1_phone1 = ?,
        contact_1_email1 = ?,
        lead_type = ?,
        status_id = ?
       WHERE id = ? AND user_id = ?`,
      [
        lead_id,
        property_address_full,
        property_address_city,
        property_address_state,
        property_address_zipcode,
        property_address_county,
        estimated_value,
        property_type,
        sale_date,
        contact_1_name,
        contact_1_phone1,
        contact_1_email1,
        lead_type,
        status_id,
        id,
        req.user.id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Contact not found.' });
    }

    const [contacts] = await pool.query(
      `SELECT c.*, lt.name as lead_type_name, lt.color as lead_type_color,
       s.name as status_name, s.color as status_color
       FROM contacts c
       LEFT JOIN lead_types lt ON c.lead_type = lt.id
       LEFT JOIN statuses s ON c.status_id = s.id
       WHERE c.id = ?`,
      [id]
    );

    res.json({ message: 'Contact updated successfully.', contact: contacts[0] });
  } catch (error) {
    console.error('Update contact error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Soft delete contact
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`🗑️  SOFT DELETE: Contact ID ${id} for user ${req.user.id}`);
    const [result] = await pool.query(
      'UPDATE contacts SET deleted_at = NOW() WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
      [id, req.user.id]
    );

    console.log(`✅ Soft delete result: ${result.affectedRows} row(s) updated`);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Contact not found.' });
    }

    res.json({ message: 'Contact deleted successfully.' });
  } catch (error) {
    console.error('Delete contact error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Restore deleted contact
router.post('/:id/restore', async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query(
      'UPDATE contacts SET deleted_at = NULL WHERE id = ? AND user_id = ? AND deleted_at IS NOT NULL',
      [id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Deleted contact not found.' });
    }

    res.json({ message: 'Contact restored successfully.' });
  } catch (error) {
    console.error('Restore contact error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Bulk delete contacts
router.post('/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Contact IDs array is required.' });
    }

    const placeholders = ids.map(() => '?').join(',');
    const [result] = await pool.query(
      `UPDATE contacts SET deleted_at = NOW()
       WHERE id IN (${placeholders}) AND user_id = ? AND deleted_at IS NULL`,
      [...ids, req.user.id]
    );

    res.json({
      message: `${result.affectedRows} contact(s) deleted successfully.`,
      deletedCount: result.affectedRows
    });
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Permanent delete contact (hard delete)
router.delete('/:id/permanent', async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query(
      'DELETE FROM contacts WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Contact not found.' });
    }

    res.json({ message: 'Contact permanently deleted.' });
  } catch (error) {
    console.error('Permanent delete error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Bulk import contacts
router.post('/import', async (req, res) => {
  try {
    const { contacts } = req.body;

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ error: 'Contacts array is required and must not be empty.' });
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      let imported = 0;
      let failed = 0;
      const errors = [];

      // Process in batches of 1000 for optimal performance
      const batchSize = 1000;
      for (let i = 0; i < contacts.length; i += batchSize) {
        const batch = contacts.slice(i, i + batchSize);

        for (const contact of batch) {
          try {
            await connection.query(
              `INSERT INTO contacts (
                user_id, lead_id, property_address_full, property_address_city,
                property_address_state, property_address_zipcode, property_address_county,
                estimated_value, property_type, sale_date, contact_1_name,
                contact_first_name, contact_last_name,
                contact_1_phone1, contact_1_email1, lead_type, status_id
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                req.user.id,
                contact.lead_id || null,
                contact.property_address_full || null,
                contact.property_address_city || null,
                contact.property_address_state || null,
                contact.property_address_zipcode || null,
                contact.property_address_county || null,
                contact.estimated_value || null,
                contact.property_type || null,
                contact.sale_date || null,
                contact.contact_1_name || null,
                contact.contact_first_name || null,
                contact.contact_last_name || null,
                contact.contact_1_phone1 || null,
                contact.contact_1_email1 || null,
                contact.lead_type || null,
                contact.status_id || null
              ]
            );
            imported++;
          } catch (err) {
            failed++;
            errors.push({
              row: i + batch.indexOf(contact) + 1,
              error: err.message,
              data: contact
            });
          }
        }
      }

      await connection.commit();
      connection.release();

      res.json({
        message: `Import completed. ${imported} contacts imported successfully.`,
        imported,
        failed,
        errors: errors.slice(0, 10) // Return first 10 errors only
      });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Import contacts error:', error);
    res.status(500).json({ error: 'Failed to import contacts.' });
  }
});

export default router;
