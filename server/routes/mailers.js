import express from 'express';
import pool from '../config/database.js';
import axios from 'axios';
import { authenticateToken, isActive } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication middleware
router.use(authenticateToken, isActive);

// Job queue for sync operations
const syncQueue = {
  jobs: [],
  processing: false
};

// Helper function to calculate cost based on campaign steps
const calculateCost = async (mailDesignLabel, mailSequenceValue, userId) => {
  try {
    // Get mailer_campaign_id from api_configs
    const [configs] = await pool.query(
      'SELECT mailer_campaign_id FROM api_configs WHERE user_id = ?',
      [userId]
    );

    if (!configs.length || !configs[0].mailer_campaign_id) {
      return 0;
    }

    const campaignId = configs[0].mailer_campaign_id;

    // Get all campaign steps for this sequence
    const [campaigns] = await pool.query(
      'SELECT step, mail_cost, mail_design_label FROM campaigns WHERE mail_sequence_value = ? ORDER BY step ASC',
      [mailSequenceValue]
    );

    if (!campaigns.length) {
      return 0;
    }

    // Find which step we're at based on mail_design_label
    let currentStep = 0;
    for (const campaign of campaigns) {
      if (campaign.mail_design_label === mailDesignLabel) {
        currentStep = campaign.step;
        break;
      }
    }

    // Calculate cumulative cost up to current step (excluding current step since it's in progress)
    let totalCost = 0;
    for (const campaign of campaigns) {
      if (campaign.step < currentStep) {
        totalCost += parseFloat(campaign.mail_cost);
      }
    }

    return totalCost;
  } catch (error) {
    console.error('Error calculating cost:', error);
    return 0;
  }
};

// Helper function to get DealMachine API config
const getDealMachineConfig = async (userId) => {
  const [configs] = await pool.query(
    `SELECT dealmachine_bearer_token, dealmachine_get_lead,
            dealmachine_start_mail, dealmachine_pause_mail,
            dealmachine_end_mail, mailer_campaign_id
     FROM api_configs WHERE user_id = ?`,
    [userId]
  );

  if (!configs.length) {
    throw new Error('DealMachine configuration not found');
  }

  const config = configs[0];

  if (!config.dealmachine_bearer_token) {
    throw new Error('DealMachine bearer token not configured');
  }

  return config;
};

// Get all mailers contacts for user
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const showDeleted = req.query.showDeleted === 'true';

    let query = `SELECT
        mc.*,
        c.contact_first_name as first_name,
        c.contact_last_name as last_name,
        c.property_address_full,
        c.lead_type
       FROM mailers_contacts mc
       JOIN contacts c ON mc.lead_id = c.lead_id AND c.user_id = mc.user_id
       WHERE mc.user_id = ?`;

    if (!showDeleted) {
      query += ' AND mc.deleted_at IS NULL';
    }

    query += ' ORDER BY mc.updated_at DESC';

    const [mailers] = await pool.query(query, [userId]);

    res.json(mailers);
  } catch (error) {
    console.error('Get mailers error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get mailers stats
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id;

    // Total mailers sent (exclude deleted)
    const [totalResult] = await pool.query(
      'SELECT SUM(total_times_mail_was_sent) as total FROM mailers_contacts WHERE user_id = ? AND deleted_at IS NULL',
      [userId]
    );

    // Mail sent today (exclude deleted)
    const [todayResult] = await pool.query(
      `SELECT SUM(total_times_mail_was_sent) as today
       FROM mailers_contacts
       WHERE user_id = ? AND DATE(last_mail_sent_date) = CURDATE() AND deleted_at IS NULL`,
      [userId]
    );

    // Pending delivery (campaigns in progress, exclude deleted)
    const [pendingResult] = await pool.query(
      `SELECT COUNT(*) as pending
       FROM mailers_contacts
       WHERE user_id = ? AND campaign_status_label LIKE '%In Progress%' AND deleted_at IS NULL`,
      [userId]
    );

    // Total cost (sum of all costs, exclude deleted)
    const [costResult] = await pool.query(
      'SELECT SUM(cost) as totalCost FROM mailers_contacts WHERE user_id = ? AND deleted_at IS NULL',
      [userId]
    );

    res.json({
      total: totalResult[0].total || 0,
      today: todayResult[0].today || 0,
      pending: pendingResult[0].pending || 0,
      totalCost: parseFloat(costResult[0].totalCost) || 0
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Import contacts by lead type
router.post('/import-by-lead-type', async (req, res) => {
  try {
    const userId = req.user.id;
    const { lead_type } = req.body;

    if (!lead_type) {
      return res.status(400).json({ error: 'Lead type is required' });
    }

    // Get contacts of specified lead type that aren't already in mailers (or were deleted from mailers)
    // Use contacts.lead_id (DealMachine ID) not contacts.id
    const [contacts] = await pool.query(
      `SELECT c.id, c.lead_id
       FROM contacts c
       LEFT JOIN mailers_contacts mc ON c.lead_id = mc.lead_id AND mc.user_id = ? AND mc.deleted_at IS NULL
       WHERE c.user_id = ? AND c.lead_type = ? AND mc.id IS NULL AND c.deleted_at IS NULL`,
      [userId, userId, lead_type]
    );

    if (contacts.length === 0) {
      return res.json({ message: 'No new contacts found to import', count: 0 });
    }

    // Insert contacts into mailers_contacts using DealMachine lead_id
    const values = contacts.map(c => [userId, c.lead_id]);
    await pool.query(
      `INSERT INTO mailers_contacts (user_id, lead_id, campaign_status_label)
       VALUES ?`,
      [values.map(v => [...v, 'Not Started'])]
    );

    res.json({ message: `${contacts.length} contacts imported successfully`, count: contacts.length });
  } catch (error) {
    console.error('Import contacts error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add single contact to mailers
router.post('/add-contact', async (req, res) => {
  try {
    const userId = req.user.id;
    const { contact_id } = req.body;

    if (!contact_id) {
      return res.status(400).json({ error: 'Contact ID is required' });
    }

    // Check if contact belongs to user and get the DealMachine lead_id
    const [contacts] = await pool.query(
      'SELECT id, lead_id FROM contacts WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
      [contact_id, userId]
    );

    if (contacts.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    const dealmachineLeadId = contacts[0].lead_id;

    // Check if already in mailers (not deleted) using DealMachine lead_id
    const [existing] = await pool.query(
      'SELECT id FROM mailers_contacts WHERE user_id = ? AND lead_id = ? AND deleted_at IS NULL',
      [userId, dealmachineLeadId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Contact already in mailers' });
    }

    // Add to mailers using DealMachine lead_id
    await pool.query(
      `INSERT INTO mailers_contacts (user_id, lead_id, campaign_status_label)
       VALUES (?, ?, ?)`,
      [userId, dealmachineLeadId, 'Not Started']
    );

    res.json({ message: 'Contact added to mailers successfully' });
  } catch (error) {
    console.error('Add contact error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Sync single contact with DealMachine
router.post('/sync/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const mailerId = req.params.id;

    // Get mailer contact
    const [mailers] = await pool.query(
      'SELECT lead_id FROM mailers_contacts WHERE id = ? AND user_id = ?',
      [mailerId, userId]
    );

    if (mailers.length === 0) {
      return res.status(404).json({ error: 'Mailer contact not found' });
    }

    const leadId = mailers[0].lead_id;

    // Get DealMachine config
    const config = await getDealMachineConfig(userId);

    // Call DealMachine API
    const apiUrl = config.dealmachine_get_lead.replace(':lead_id', leadId);
    const response = await axios.get(apiUrl, {
      headers: {
        'Authorization': `Bearer ${config.dealmachine_bearer_token}`
      }
    });

    // DealMachine API returns { error: null, data: {...} }
    const data = response.data.data || response.data;

    // Check if sync returned valid data
    const isValidSync = data.id !== null && data.id !== undefined;

    if (!isValidSync) {
      // Sync failed - no valid data returned
      await pool.query(
        `UPDATE mailers_contacts
         SET sync_status = 'Failed',
             sync_error = 'Lead not found or has no data in DealMachine',
             last_sync_date = NOW()
         WHERE id = ? AND user_id = ?`,
        [mailerId, userId]
      );

      return res.status(400).json({
        error: 'Lead not found or has no data in DealMachine',
        data
      });
    }

    // Extract campaign data
    const campaignStatus = data.campaign_status?.label || 'Not Started';
    const mailSequenceValue = data.mail_sequence?.value || null;
    const mailDesignLabel = data.mail_design?.label || null;
    const totalTimesSent = data.total_times_mail_was_sent || 0;
    const lastMailSentDate = data.last_mail_sent_date || null;
    const numberOfAddresses = data.number_of_mailing_addresses || 0;
    const hasUspsAddress = data.has_usps_address || false;

    // Calculate cost
    const cost = await calculateCost(mailDesignLabel, mailSequenceValue, userId);

    // Update mailers_contacts with sync success
    await pool.query(
      `UPDATE mailers_contacts
       SET campaign_status_label = ?,
           mail_sequence_value = ?,
           mail_design_label = ?,
           total_times_mail_was_sent = ?,
           last_mail_sent_date = ?,
           number_of_mailing_addresses = ?,
           has_usps_address = ?,
           cost = ?,
           sync_status = 'Success',
           sync_error = NULL,
           last_sync_date = NOW()
       WHERE id = ? AND user_id = ?`,
      [
        campaignStatus,
        mailSequenceValue,
        mailDesignLabel,
        totalTimesSent,
        lastMailSentDate,
        numberOfAddresses,
        hasUspsAddress,
        cost,
        mailerId,
        userId
      ]
    );

    res.json({ message: 'Contact synced successfully', data });
  } catch (error) {
    console.error('Sync contact error:', error);

    // Update sync status to Failed
    try {
      await pool.query(
        `UPDATE mailers_contacts
         SET sync_status = 'Failed',
             sync_error = ?,
             last_sync_date = NOW()
         WHERE id = ? AND user_id = ?`,
        [error.message || 'Failed to sync contact', req.params.id, req.user.id]
      );
    } catch (updateError) {
      console.error('Failed to update sync status:', updateError);
    }

    if (error.message.includes('DealMachine')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to sync contact' });
  }
});

// Process sync queue
const processSyncQueue = async () => {
  if (syncQueue.processing || syncQueue.jobs.length === 0) {
    return;
  }

  syncQueue.processing = true;

  while (syncQueue.jobs.length > 0) {
    const job = syncQueue.jobs.shift();

    try {
      const { userId, mailerId, leadId } = job;

      // Get DealMachine config
      const config = await getDealMachineConfig(userId);

      // Call DealMachine API with delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay between requests

      const apiUrl = config.dealmachine_get_lead.replace(':lead_id', leadId);
      const response = await axios.get(apiUrl, {
        headers: {
          'Authorization': `Bearer ${config.dealmachine_bearer_token}`
        },
        timeout: 10000
      });

      // DealMachine API returns { error: null, data: {...} }
      const data = response.data.data || response.data;

      // Check if sync returned valid data
      const isValidSync = data.id !== null && data.id !== undefined;

      if (!isValidSync) {
        // Sync failed - no valid data returned
        await pool.query(
          `UPDATE mailers_contacts
           SET sync_status = 'Failed',
               sync_error = 'Lead not found or has no data in DealMachine',
               last_sync_date = NOW()
           WHERE id = ? AND user_id = ?`,
          [mailerId, userId]
        );
        console.log(`❌ Failed to sync mailer ${mailerId}: No valid data`);
      } else {
        // Extract and update data
        const campaignStatus = data.campaign_status?.label || 'Not Started';
        const mailSequenceValue = data.mail_sequence?.value || null;
        const mailDesignLabel = data.mail_design?.label || null;
        const totalTimesSent = data.total_times_mail_was_sent || 0;
        const lastMailSentDate = data.last_mail_sent_date || null;
        const numberOfAddresses = data.number_of_mailing_addresses || 0;
        const hasUspsAddress = data.has_usps_address || false;

        const cost = await calculateCost(mailDesignLabel, mailSequenceValue, userId);

        await pool.query(
          `UPDATE mailers_contacts
           SET campaign_status_label = ?,
               mail_sequence_value = ?,
               mail_design_label = ?,
               total_times_mail_was_sent = ?,
               last_mail_sent_date = ?,
               number_of_mailing_addresses = ?,
               has_usps_address = ?,
               cost = ?,
               sync_status = 'Success',
               sync_error = NULL,
               last_sync_date = NOW()
           WHERE id = ? AND user_id = ?`,
          [
            campaignStatus,
            mailSequenceValue,
            mailDesignLabel,
            totalTimesSent,
            lastMailSentDate,
            numberOfAddresses,
            hasUspsAddress,
            cost,
            mailerId,
            userId
          ]
        );

        console.log(`✅ Synced mailer ${mailerId}`);
      }
    } catch (error) {
      console.error(`❌ Failed to sync mailer ${job.mailerId}:`, error.message);

      // Update sync status to Failed
      try {
        await pool.query(
          `UPDATE mailers_contacts
           SET sync_status = 'Failed',
               sync_error = ?,
               last_sync_date = NOW()
           WHERE id = ? AND user_id = ?`,
          [error.message || 'Failed to sync contact', job.mailerId, job.userId]
        );
      } catch (updateError) {
        console.error('Failed to update sync status:', updateError);
      }
    }
  }

  syncQueue.processing = false;
};

// Sync all contacts
router.post('/sync-all', async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if DealMachine is configured
    try {
      await getDealMachineConfig(userId);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    // Get all mailer contacts for user
    const [mailers] = await pool.query(
      'SELECT id, lead_id FROM mailers_contacts WHERE user_id = ?',
      [userId]
    );

    if (mailers.length === 0) {
      return res.json({ message: 'No contacts to sync', count: 0 });
    }

    // Add jobs to queue
    for (const mailer of mailers) {
      syncQueue.jobs.push({
        userId,
        mailerId: mailer.id,
        leadId: mailer.lead_id
      });
    }

    // Start processing queue
    processSyncQueue();

    res.json({
      message: `${mailers.length} contacts queued for syncing. This will run in the background.`,
      count: mailers.length
    });
  } catch (error) {
    console.error('Sync all error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Start mail sequence
router.post('/start/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const mailerId = req.params.id;

    // Get mailer contact
    const [mailers] = await pool.query(
      'SELECT lead_id FROM mailers_contacts WHERE id = ? AND user_id = ?',
      [mailerId, userId]
    );

    if (mailers.length === 0) {
      return res.status(404).json({ error: 'Mailer contact not found' });
    }

    const leadId = mailers[0].lead_id;

    // Get DealMachine config
    const config = await getDealMachineConfig(userId);

    if (!config.dealmachine_start_mail) {
      return res.status(400).json({ error: 'Start mail API URL not configured' });
    }

    if (!config.mailer_campaign_id) {
      return res.status(400).json({ error: 'Mailer campaign ID not configured' });
    }

    // Call DealMachine API
    const apiUrl = config.dealmachine_start_mail.replace(':lead_id', leadId);
    const formData = new URLSearchParams();
    formData.append('mailer_campaign_id', config.mailer_campaign_id);

    await axios.post(apiUrl, formData, {
      headers: {
        'Authorization': `Bearer ${config.dealmachine_bearer_token}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    // Update status
    await pool.query(
      `UPDATE mailers_contacts
       SET campaign_status_label = 'Mail Sequence In Progress'
       WHERE id = ? AND user_id = ?`,
      [mailerId, userId]
    );

    res.json({ message: 'Mail sequence started successfully' });
  } catch (error) {
    console.error('Start mail error:', error);
    if (error.message.includes('DealMachine')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to start mail sequence' });
  }
});

// Pause mail sequence
router.post('/pause/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const mailerId = req.params.id;

    // Get mailer contact
    const [mailers] = await pool.query(
      'SELECT lead_id FROM mailers_contacts WHERE id = ? AND user_id = ?',
      [mailerId, userId]
    );

    if (mailers.length === 0) {
      return res.status(404).json({ error: 'Mailer contact not found' });
    }

    const leadId = mailers[0].lead_id;

    // Get DealMachine config
    const config = await getDealMachineConfig(userId);

    if (!config.dealmachine_pause_mail) {
      return res.status(400).json({ error: 'Pause mail API URL not configured' });
    }

    if (!config.mailer_campaign_id) {
      return res.status(400).json({ error: 'Mailer campaign ID not configured' });
    }

    // Call DealMachine API
    const apiUrl = config.dealmachine_pause_mail.replace(':lead_id', leadId);
    const formData = new URLSearchParams();
    formData.append('mailer_campaign_id', config.mailer_campaign_id);

    await axios.post(apiUrl, formData, {
      headers: {
        'Authorization': `Bearer ${config.dealmachine_bearer_token}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    // Update status
    await pool.query(
      `UPDATE mailers_contacts
       SET campaign_status_label = 'Mail Sequence Paused'
       WHERE id = ? AND user_id = ?`,
      [mailerId, userId]
    );

    res.json({ message: 'Mail sequence paused successfully' });
  } catch (error) {
    console.error('Pause mail error:', error);
    if (error.message.includes('DealMachine')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to pause mail sequence' });
  }
});

// End mail sequence
router.post('/end/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const mailerId = req.params.id;

    // Get mailer contact
    const [mailers] = await pool.query(
      'SELECT lead_id FROM mailers_contacts WHERE id = ? AND user_id = ?',
      [mailerId, userId]
    );

    if (mailers.length === 0) {
      return res.status(404).json({ error: 'Mailer contact not found' });
    }

    const leadId = mailers[0].lead_id;

    // Get DealMachine config
    const config = await getDealMachineConfig(userId);

    if (!config.dealmachine_end_mail) {
      return res.status(400).json({ error: 'End mail API URL not configured' });
    }

    if (!config.mailer_campaign_id) {
      return res.status(400).json({ error: 'Mailer campaign ID not configured' });
    }

    // Call DealMachine API
    const apiUrl = config.dealmachine_end_mail.replace(':lead_id', leadId);
    const formData = new URLSearchParams();
    formData.append('mailer_campaign_id', config.mailer_campaign_id);

    await axios.post(apiUrl, formData, {
      headers: {
        'Authorization': `Bearer ${config.dealmachine_bearer_token}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    // Update status
    await pool.query(
      `UPDATE mailers_contacts
       SET campaign_status_label = 'Mail Sequence Ended'
       WHERE id = ? AND user_id = ?`,
      [mailerId, userId]
    );

    res.json({ message: 'Mail sequence ended successfully' });
  } catch (error) {
    console.error('End mail error:', error);
    if (error.message.includes('DealMachine')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to end mail sequence' });
  }
});

// Remove contact from mailers
// Soft delete mailer contact
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const mailerId = req.params.id;

    const [result] = await pool.query(
      'UPDATE mailers_contacts SET deleted_at = NOW() WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
      [mailerId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Mailer contact not found' });
    }

    res.json({ message: 'Contact removed from mailers successfully' });
  } catch (error) {
    console.error('Remove mailer error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Restore deleted mailer contact
router.post('/:id/restore', async (req, res) => {
  try {
    const userId = req.user.id;
    const mailerId = req.params.id;

    const [result] = await pool.query(
      'UPDATE mailers_contacts SET deleted_at = NULL WHERE id = ? AND user_id = ? AND deleted_at IS NOT NULL',
      [mailerId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Deleted mailer contact not found' });
    }

    res.json({ message: 'Mailer contact restored successfully' });
  } catch (error) {
    console.error('Restore mailer error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
