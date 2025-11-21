import express from 'express';
import pool from '../config/database.js';
import { authenticateApiKey } from '../middleware/apiKeyAuth.js';

const router = express.Router();

// Webhook endpoint to insert contact(s)
// POST /api/webhook/:userId/:leadTypeId
// Accepts single contact object or array of contacts
router.post('/:userId/:leadTypeId', authenticateApiKey, async (req, res) => {
  try {
    const { userId, leadTypeId } = req.params;

    // Validate that the authenticated user matches the userId in the URL
    if (parseInt(userId) !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied. API key does not match the specified user ID.'
      });
    }

    // Validate lead type exists
    const [leadTypes] = await pool.query(
      'SELECT id, name FROM lead_types WHERE id = ?',
      [leadTypeId]
    );

    if (leadTypes.length === 0) {
      return res.status(400).json({
        error: `Invalid lead type ID: ${leadTypeId}. Please use a valid lead type ID.`
      });
    }

    // Check if request body is an array (bulk insert) or single object
    const isBulk = Array.isArray(req.body);
    const contacts = isBulk ? req.body : [req.body];

    // Log for monitoring (production-safe)
    console.log(`[Webhook] Processing ${isBulk ? 'bulk' : 'single'} request: ${contacts.length} contact(s) for user ${userId}`);

    if (contacts.length === 0) {
      return res.status(400).json({
        error: 'Request body cannot be empty. Provide a contact object or array of contacts.'
      });
    }

    if (contacts.length > 100) {
      return res.status(400).json({
        error: 'Bulk insert limit exceeded. Maximum 100 contacts per request.'
      });
    }

    const results = [];

    // Process each contact
    for (let i = 0; i < contacts.length; i++) {
      const contactData = contacts[i];
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
        status_id
      } = contactData;

      try {

        // Validate required fields
        if (!contact_1_name) {
          throw new Error('contact_1_name is required.');
        }

        // Validate email is not empty
        if (contact_1_email1 !== undefined && contact_1_email1 !== null && contact_1_email1.trim() === '') {
          throw new Error('contact_1_email1 cannot be empty. Either provide a valid email or omit the field.');
        }

        // Check for duplicates based on user_id, lead_id, and lead_type
        if (lead_id) {
          const [duplicates] = await pool.query(
            `SELECT id FROM contacts
             WHERE user_id = ? AND lead_id = ? AND lead_type = ? AND deleted_at IS NULL
             LIMIT 1`,
            [userId, lead_id, leadTypeId]
          );

          if (duplicates.length > 0) {
            throw new Error(`Duplicate contact detected. A contact with lead_id "${lead_id}" and lead_type ${leadTypeId} already exists for this user.`);
          }
        }

        // Parse contact name into first and last name
        const nameParts = contact_1_name.trim().split(/\s+/);
        const contact_first_name = nameParts[0] || '';
        const contact_last_name = nameParts.slice(1).join(' ') || '';

        // Default status_id to 1 if not provided
        const finalStatusId = status_id || 1;

        // Insert contact into database
        const [result] = await pool.query(
          `INSERT INTO contacts (
            user_id, lead_id, property_address_full, property_address_city,
            property_address_state, property_address_zipcode, property_address_county,
            estimated_value, property_type, sale_date, contact_1_name,
            contact_first_name, contact_last_name,
            contact_1_phone1, contact_1_email1, lead_type, status_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
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
            contact_first_name,
            contact_last_name,
            contact_1_phone1 || null,
            contact_1_email1 || null,
            leadTypeId,
            finalStatusId
          ]
        );

        // Fetch the created contact with lead type details
        const [createdContacts] = await pool.query(
          `SELECT c.*, lt.name as lead_type_name, lt.color as lead_type_color,
           s.name as status_name, s.color as status_color
           FROM contacts c
           LEFT JOIN lead_types lt ON c.lead_type = lt.id
           LEFT JOIN statuses s ON c.status_id = s.id
           WHERE c.id = ?`,
          [result.insertId]
        );

        results.push({
          success: true,
          contact: createdContacts[0],
          index: i
        });

      } catch (contactError) {
        console.error(`[Webhook] Error processing contact ${i} for user ${userId}:`, contactError.message);

        // Handle specific errors for this contact
        let errorMessage = 'Failed to create contact.';
        let errorDetails = contactError.message;

        if (contactError.message && contactError.message.includes('contact_1_name is required')) {
          errorMessage = contactError.message;
        } else if (contactError.message && contactError.message.includes('cannot be empty')) {
          errorMessage = contactError.message;
        } else if (contactError.message && contactError.message.includes('Duplicate contact')) {
          errorMessage = contactError.message;
        } else if (contactError.code === 'ER_DUP_ENTRY') {
          errorMessage = 'Duplicate contact. This contact may already exist.';
        }

        results.push({
          success: false,
          error: errorMessage,
          details: errorDetails,
          index: i,
          lead_id: lead_id || null
        });
      }
    }

    // Determine response status
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`[Webhook] Completed for user ${userId}: ${successCount} succeeded, ${failureCount} failed`);

    // If bulk insert, return detailed results
    if (isBulk) {
      const statusCode = failureCount === 0 ? 201 : (successCount === 0 ? 400 : 207); // 207 = Multi-Status
      return res.status(statusCode).json({
        success: failureCount === 0,
        message: `Processed ${contacts.length} contact(s): ${successCount} succeeded, ${failureCount} failed.`,
        total: contacts.length,
        successful: successCount,
        failed: failureCount,
        results: results
      });
    }

    // If single insert, return traditional response
    if (results[0].success) {
      return res.status(201).json({
        success: true,
        message: 'Contact created successfully.',
        contact: results[0].contact
      });
    } else {
      return res.status(400).json({
        success: false,
        error: results[0].error,
        details: results[0].details
      });
    }

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({
      error: 'Server error while processing request.',
      message: error.message
    });
  }
});

// Get available lead types (public endpoint for webhook users)
router.get('/lead-types', authenticateApiKey, async (req, res) => {
  try {
    const [leadTypes] = await pool.query(
      'SELECT id, name, color FROM lead_types ORDER BY name'
    );

    res.json({
      success: true,
      leadTypes
    });
  } catch (error) {
    console.error('Get lead types error:', error);
    res.status(500).json({ error: 'Failed to fetch lead types.' });
  }
});

// Health check for webhook endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Webhook API is operational',
    timestamp: new Date().toISOString()
  });
});

export default router;
