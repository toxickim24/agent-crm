import express from 'express';
import pool from '../config/database.js';
import axios from 'axios';
import crypto from 'crypto';
import { authenticateToken, isActive, getUserPermissions } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication middleware
router.use(authenticateToken, isActive);

// Helper function to test Mailchimp connection
const testMailchimpConnection = async (apiKey, serverPrefix) => {
  try {
    const response = await axios.get(`https://${serverPrefix}.api.mailchimp.com/3.0/ping`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      timeout: 10000
    });
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.detail || error.message || 'Failed to connect to Mailchimp'
    };
  }
};

// Helper function to fetch Mailchimp audiences (lists)
const fetchMailchimpAudiences = async (apiKey, serverPrefix) => {
  try {
    const response = await axios.get(`https://${serverPrefix}.api.mailchimp.com/3.0/lists`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      params: {
        count: 100
      },
      timeout: 10000
    });
    return { success: true, lists: response.data.lists || [] };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.detail || error.message || 'Failed to fetch audiences'
    };
  }
};

// ==================== ADMIN ROUTES ====================

// Get all Mailchimp configs for a user (admin only)
router.get('/admin/configs/:userId', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const userId = req.params.userId;

    const [configs] = await pool.query(
      `SELECT mc.*, lt.name as lead_type_name, lt.color as lead_type_color
       FROM mailchimp_configs mc
       JOIN lead_types lt ON mc.lead_type_id = lt.id
       WHERE mc.user_id = ?
       ORDER BY lt.name ASC`,
      [userId]
    );

    res.json({ configs });
  } catch (error) {
    console.error('Get Mailchimp configs error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get Mailchimp config for specific lead type (admin only)
router.get('/admin/configs/:userId/:leadTypeId', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { userId, leadTypeId } = req.params;

    const [configs] = await pool.query(
      `SELECT mc.*, lt.name as lead_type_name, lt.color as lead_type_color
       FROM mailchimp_configs mc
       JOIN lead_types lt ON mc.lead_type_id = lt.id
       WHERE mc.user_id = ? AND mc.lead_type_id = ?`,
      [userId, leadTypeId]
    );

    if (configs.length === 0) {
      return res.json({ config: null });
    }

    res.json({ config: configs[0] });
  } catch (error) {
    console.error('Get Mailchimp config error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create or update Mailchimp config (admin only)
router.post('/admin/configs', async (req, res) => {
  console.log('📥 POST /api/mailchimp/admin/configs - REQUEST RECEIVED');
  console.log('User:', req.user);
  console.log('Body:', req.body);

  try {
    if (req.user.role !== 'admin') {
      console.log('❌ Access denied - user is not admin');
      return res.status(403).json({ error: 'Admin access required' });
    }

    const {
      user_id,
      lead_type_id,
      api_key,
      server_prefix,
      default_audience_id,
      default_from_name,
      default_from_email,
      default_reply_to,
      auto_sync_enabled,
      sync_frequency_minutes,
      enable_campaigns,
      enable_automations,
      enable_transactional,
      enable_ab_testing
    } = req.body;

    if (!user_id || !lead_type_id) {
      return res.status(400).json({ error: 'User ID and Lead Type ID are required' });
    }

    // Check if config already exists
    const [existing] = await pool.query(
      'SELECT id FROM mailchimp_configs WHERE user_id = ? AND lead_type_id = ?',
      [user_id, lead_type_id]
    );

    if (existing.length > 0) {
      // Update existing config
      await pool.query(
        `UPDATE mailchimp_configs
         SET api_key = ?,
             server_prefix = ?,
             default_audience_id = ?,
             default_from_name = ?,
             default_from_email = ?,
             default_reply_to = ?,
             auto_sync_enabled = ?,
             sync_frequency_minutes = ?,
             enable_campaigns = ?,
             enable_automations = ?,
             enable_transactional = ?,
             enable_ab_testing = ?,
             updated_at = NOW()
         WHERE user_id = ? AND lead_type_id = ?`,
        [
          api_key || null,
          server_prefix || null,
          default_audience_id || null,
          default_from_name || null,
          default_from_email || null,
          default_reply_to || null,
          auto_sync_enabled !== undefined ? auto_sync_enabled : 0,
          sync_frequency_minutes || 60,
          enable_campaigns !== undefined ? enable_campaigns : 1,
          enable_automations !== undefined ? enable_automations : 1,
          enable_transactional !== undefined ? enable_transactional : 0,
          enable_ab_testing !== undefined ? enable_ab_testing : 1,
          user_id,
          lead_type_id
        ]
      );

      // Test connection after update
      const testResult = await testMailchimpConnection(api_key, server_prefix);
      const newStatus = testResult.success ? 'connected' : 'error';

      await pool.query(
        'UPDATE mailchimp_configs SET connection_status = ?, last_connection_check = NOW() WHERE id = ?',
        [newStatus, existing[0].id]
      );

      res.json({ message: 'Mailchimp configuration updated successfully', configId: existing[0].id, connectionStatus: newStatus });
    } else {
      // Create new config
      const [result] = await pool.query(
        `INSERT INTO mailchimp_configs (
          user_id, lead_type_id, api_key, server_prefix,
          default_audience_id, default_from_name, default_from_email, default_reply_to,
          auto_sync_enabled, sync_frequency_minutes,
          enable_campaigns, enable_automations, enable_transactional, enable_ab_testing
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user_id,
          lead_type_id,
          api_key || null,
          server_prefix || null,
          default_audience_id || null,
          default_from_name || null,
          default_from_email || null,
          default_reply_to || null,
          auto_sync_enabled !== undefined ? auto_sync_enabled : 0,
          sync_frequency_minutes || 60,
          enable_campaigns !== undefined ? enable_campaigns : 1,
          enable_automations !== undefined ? enable_automations : 1,
          enable_transactional !== undefined ? enable_transactional : 0,
          enable_ab_testing !== undefined ? enable_ab_testing : 1
        ]
      );

      // Test connection after creation
      const testResult = await testMailchimpConnection(api_key, server_prefix);
      const newStatus = testResult.success ? 'connected' : 'error';

      await pool.query(
        'UPDATE mailchimp_configs SET connection_status = ?, last_connection_check = NOW() WHERE id = ?',
        [newStatus, result.insertId]
      );

      res.json({ message: 'Mailchimp configuration created successfully', configId: result.insertId, connectionStatus: newStatus });
    }
  } catch (error) {
    console.error('Create/Update Mailchimp config error:', error);
    console.error('Error details:', error.message);
    console.error('SQL Error code:', error.code);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Test Mailchimp connection (admin only)
router.post('/admin/configs/test', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { api_key, server_prefix } = req.body;

    if (!api_key || !server_prefix) {
      return res.status(400).json({ error: 'API key and server prefix are required' });
    }

    // Test connection
    const testResult = await testMailchimpConnection(api_key, server_prefix);

    if (!testResult.success) {
      return res.status(400).json({ error: testResult.error });
    }

    // Fetch audiences if connection successful
    const audiencesResult = await fetchMailchimpAudiences(api_key, server_prefix);

    if (!audiencesResult.success) {
      return res.json({
        connected: true,
        message: 'Connection successful but failed to fetch audiences',
        audiences: []
      });
    }

    res.json({
      connected: true,
      message: 'Connection successful',
      audiences: audiencesResult.lists.map(list => ({
        id: list.id,
        name: list.name,
        member_count: list.stats?.member_count || 0
      }))
    });
  } catch (error) {
    console.error('Test connection error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update connection status (admin only)
router.post('/admin/configs/:configId/update-status', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const configId = req.params.configId;

    // Get config
    const [configs] = await pool.query(
      'SELECT api_key, server_prefix FROM mailchimp_configs WHERE id = ?',
      [configId]
    );

    if (configs.length === 0) {
      return res.status(404).json({ error: 'Configuration not found' });
    }

    const config = configs[0];

    if (!config.api_key || !config.server_prefix) {
      await pool.query(
        `UPDATE mailchimp_configs
         SET connection_status = 'disconnected',
             last_connection_check = NOW()
         WHERE id = ?`,
        [configId]
      );
      return res.json({ status: 'disconnected', message: 'API key or server prefix not configured' });
    }

    // Test connection
    const testResult = await testMailchimpConnection(config.api_key, config.server_prefix);

    const newStatus = testResult.success ? 'connected' : 'error';

    await pool.query(
      `UPDATE mailchimp_configs
       SET connection_status = ?,
           last_connection_check = NOW()
       WHERE id = ?`,
      [newStatus, configId]
    );

    res.json({
      status: newStatus,
      message: testResult.success ? 'Connected' : testResult.error
    });
  } catch (error) {
    console.error('Update connection status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete Mailchimp config (admin only)
router.delete('/admin/configs/:configId', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const configId = req.params.configId;

    const [result] = await pool.query(
      'DELETE FROM mailchimp_configs WHERE id = ?',
      [configId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Configuration not found' });
    }

    res.json({ message: 'Mailchimp configuration deleted successfully' });
  } catch (error) {
    console.error('Delete Mailchimp config error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== CLIENT ROUTES ====================

// Get user's Mailchimp configurations
router.get('/configs', getUserPermissions, async (req, res) => {
  try {
    const userId = req.user.id;

    let query = `
      SELECT mc.*, lt.name as lead_type_name, lt.color as lead_type_color
      FROM mailchimp_configs mc
      JOIN lead_types lt ON mc.lead_type_id = lt.id
      WHERE mc.user_id = ?`;

    const params = [userId];

    // Apply lead type filter if user has restricted access
    if (req.permissions.allowed_lead_types && req.permissions.allowed_lead_types.length > 0) {
      query += ` AND mc.lead_type_id IN (${req.permissions.allowed_lead_types.map(() => '?').join(',')})`;
      params.push(...req.permissions.allowed_lead_types);
    }

    query += ' ORDER BY lt.name ASC';

    const [configs] = await pool.query(query, params);

    // Hide sensitive data from client
    const sanitizedConfigs = configs.map(config => ({
      id: config.id,
      lead_type_id: config.lead_type_id,
      lead_type_name: config.lead_type_name,
      lead_type_color: config.lead_type_color,
      server_prefix: config.server_prefix,
      default_audience_id: config.default_audience_id,
      default_from_name: config.default_from_name,
      default_from_email: config.default_from_email,
      connection_status: config.connection_status,
      last_connection_check: config.last_connection_check,
      enable_campaigns: config.enable_campaigns,
      enable_automations: config.enable_automations,
      enable_ab_testing: config.enable_ab_testing
    }));

    res.json({ configs: sanitizedConfigs });
  } catch (error) {
    console.error('Get user Mailchimp configs error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get dashboard stats
router.get('/stats', getUserPermissions, async (req, res) => {
  try {
    const userId = req.user.id;
    const leadTypeId = req.query.lead_type_id;

    let campaignQuery = `
      SELECT
        SUM(emails_sent) as total_sent,
        SUM(CASE WHEN DATE(send_time) = CURDATE() THEN emails_sent ELSE 0 END) as sent_today,
        SUM(opens_total) as total_opens,
        SUM(CASE WHEN DATE(send_time) = CURDATE() THEN opens_total ELSE 0 END) as opens_today,
        SUM(clicks_total) as total_clicks,
        SUM(CASE WHEN DATE(send_time) = CURDATE() THEN clicks_total ELSE 0 END) as clicks_today,
        AVG(open_rate) as avg_open_rate,
        AVG(click_rate) as avg_click_rate
      FROM mailchimp_campaigns
      WHERE user_id = ? AND deleted_at IS NULL`;

    const params = [userId];

    if (leadTypeId) {
      campaignQuery += ' AND lead_type_id = ?';
      params.push(leadTypeId);
    } else if (req.permissions.allowed_lead_types && req.permissions.allowed_lead_types.length > 0) {
      campaignQuery += ` AND lead_type_id IN (${req.permissions.allowed_lead_types.map(() => '?').join(',')})`;
      params.push(...req.permissions.allowed_lead_types);
    }

    const [stats] = await pool.query(campaignQuery, params);

    res.json({
      total_sent: stats[0].total_sent || 0,
      sent_today: stats[0].sent_today || 0,
      total_opens: stats[0].total_opens || 0,
      opens_today: stats[0].opens_today || 0,
      total_clicks: stats[0].total_clicks || 0,
      clicks_today: stats[0].clicks_today || 0,
      avg_open_rate: parseFloat(stats[0].avg_open_rate) || 0,
      avg_click_rate: parseFloat(stats[0].avg_click_rate) || 0
    });
  } catch (error) {
    console.error('Get Mailchimp stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get daily email stats for charts (last 30 days)
router.get('/stats/daily', getUserPermissions, async (req, res) => {
  try {
    const userId = req.user.id;
    const leadTypeId = req.query.lead_type_id;
    const days = parseInt(req.query.days) || 30;

    let query = `
      SELECT
        DATE(send_time) as date,
        SUM(emails_sent) as emails_sent,
        SUM(opens_total) as opens,
        SUM(clicks_total) as clicks
      FROM mailchimp_campaigns
      WHERE user_id = ?
        AND deleted_at IS NULL
        AND send_time IS NOT NULL
        AND send_time >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        AND send_time <= CURDATE()`;

    const params = [userId, days];

    if (leadTypeId) {
      query += ' AND lead_type_id = ?';
      params.push(leadTypeId);
    } else if (req.permissions.allowed_lead_types && req.permissions.allowed_lead_types.length > 0) {
      query += ` AND lead_type_id IN (${req.permissions.allowed_lead_types.map(() => '?').join(',')})`;
      params.push(...req.permissions.allowed_lead_types);
    }

    query += ' GROUP BY DATE(send_time) ORDER BY date ASC';

    const [dailyStats] = await pool.query(query, params);

    res.json({ dailyStats });
  } catch (error) {
    console.error('Get daily Mailchimp stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get campaigns
router.get('/campaigns', getUserPermissions, async (req, res) => {
  try {
    const userId = req.user.id;
    const leadTypeId = req.query.lead_type_id;
    const status = req.query.status;

    let query = `
      SELECT mc.*, lt.name as lead_type_name, lt.color as lead_type_color
      FROM mailchimp_campaigns mc
      JOIN lead_types lt ON mc.lead_type_id = lt.id
      WHERE mc.user_id = ? AND mc.deleted_at IS NULL`;

    const params = [userId];

    if (leadTypeId) {
      query += ' AND mc.lead_type_id = ?';
      params.push(leadTypeId);
    } else if (req.permissions.allowed_lead_types && req.permissions.allowed_lead_types.length > 0) {
      query += ` AND mc.lead_type_id IN (${req.permissions.allowed_lead_types.map(() => '?').join(',')})`;
      params.push(...req.permissions.allowed_lead_types);
    }

    if (status) {
      query += ' AND mc.status = ?';
      params.push(status);
    }

    query += ' ORDER BY mc.created_at DESC LIMIT 100';

    const [campaigns] = await pool.query(query, params);

    res.json({ campaigns });
  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get campaign by ID
router.get('/campaigns/:campaignId', getUserPermissions, async (req, res) => {
  try {
    const userId = req.user.id;
    const campaignId = req.params.campaignId;

    let query = `
      SELECT mc.*, lt.name as lead_type_name, lt.color as lead_type_color
      FROM mailchimp_campaigns mc
      JOIN lead_types lt ON mc.lead_type_id = lt.id
      WHERE mc.campaign_id = ? AND mc.user_id = ?`;

    const params = [campaignId, userId];

    // Apply lead type filter if user has restricted access
    if (req.permissions.allowed_lead_types && req.permissions.allowed_lead_types.length > 0) {
      query += ` AND mc.lead_type_id IN (${req.permissions.allowed_lead_types.map(() => '?').join(',')})`;
      params.push(...req.permissions.allowed_lead_types);
    }

    const [campaigns] = await pool.query(query, params);

    if (campaigns.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json({ campaign: campaigns[0] });
  } catch (error) {
    console.error('Get campaign error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Sync campaigns from Mailchimp
router.post('/campaigns/sync', getUserPermissions, async (req, res) => {
  try {
    console.log('📥 Campaign sync requested');
    const userId = req.user.id;
    const leadTypeId = req.body.lead_type_id;
    console.log('User ID:', userId, 'Lead Type ID:', leadTypeId);

    if (!leadTypeId) {
      return res.status(400).json({ error: 'Lead type ID is required' });
    }

    // Check permission
    if (req.permissions.allowed_lead_types && req.permissions.allowed_lead_types.length > 0) {
      if (!req.permissions.allowed_lead_types.includes(parseInt(leadTypeId))) {
        return res.status(403).json({ error: 'You do not have permission to access this lead type' });
      }
    }

    // Get Mailchimp config
    const [configs] = await pool.query(
      'SELECT * FROM mailchimp_configs WHERE user_id = ? AND lead_type_id = ?',
      [userId, leadTypeId]
    );

    console.log('Found configs:', configs.length);

    if (configs.length === 0) {
      return res.status(400).json({ error: 'Mailchimp not configured for this lead type' });
    }

    const config = configs[0];

    if (!config.api_key || !config.server_prefix) {
      return res.status(400).json({ error: 'Mailchimp API key or server prefix not configured' });
    }

    console.log('Fetching campaigns from Mailchimp API...');

    // Fetch campaigns from Mailchimp (all statuses)
    const response = await axios.get(`https://${config.server_prefix}.api.mailchimp.com/3.0/campaigns`, {
      headers: {
        'Authorization': `Bearer ${config.api_key}`
      },
      params: {
        count: 100
        // Removed status filter to get all campaigns (sent, sending, scheduled, etc.)
      },
      timeout: 30000
    });

    const campaigns = response.data.campaigns || [];
    console.log(`📧 Found ${campaigns.length} campaigns from Mailchimp`);
    let syncedCount = 0;

    // Sync each campaign
    for (const campaign of campaigns) {
      // Check if campaign already exists
      const [existing] = await pool.query(
        'SELECT id FROM mailchimp_campaigns WHERE campaign_id = ? AND user_id = ?',
        [campaign.id, userId]
      );

      const campaignData = {
        user_id: userId,
        lead_type_id: leadTypeId,
        mailchimp_config_id: config.id,
        campaign_id: campaign.id,
        web_id: campaign.web_id,
        type: campaign.type,
        status: campaign.status,
        subject_line: campaign.settings?.subject_line,
        preview_text: campaign.settings?.preview_text,
        title: campaign.settings?.title,
        from_name: campaign.settings?.from_name,
        reply_to: campaign.settings?.reply_to,
        list_id: campaign.recipients?.list_id,
        emails_sent: campaign.emails_sent || 0,
        abuse_reports: campaign.report_summary?.abuse_reports || 0,
        unsubscribed: campaign.report_summary?.unsubscribed || 0,
        hard_bounces: campaign.report_summary?.hard_bounces || 0,
        soft_bounces: campaign.report_summary?.soft_bounces || 0,
        opens_total: campaign.report_summary?.opens || 0,
        unique_opens: campaign.report_summary?.unique_opens || 0,
        open_rate: campaign.report_summary?.open_rate ? campaign.report_summary.open_rate * 100 : 0,
        clicks_total: campaign.report_summary?.clicks || 0,
        unique_clicks: campaign.report_summary?.unique_clicks || 0,
        unique_subscriber_clicks: campaign.report_summary?.subscriber_clicks || 0,
        click_rate: campaign.report_summary?.click_rate ? campaign.report_summary.click_rate * 100 : 0,
        send_time: campaign.send_time || null,
        last_synced_at: new Date()
      };

      if (existing.length > 0) {
        // Update existing campaign
        await pool.query(
          `UPDATE mailchimp_campaigns
           SET status = ?, send_time = ?,
               emails_sent = ?, abuse_reports = ?, unsubscribed = ?,
               hard_bounces = ?, soft_bounces = ?,
               opens_total = ?, unique_opens = ?, open_rate = ?,
               clicks_total = ?, unique_clicks = ?, unique_subscriber_clicks = ?, click_rate = ?,
               last_synced_at = NOW()
           WHERE campaign_id = ? AND user_id = ?`,
          [
            campaignData.status, campaignData.send_time,
            campaignData.emails_sent, campaignData.abuse_reports, campaignData.unsubscribed,
            campaignData.hard_bounces, campaignData.soft_bounces,
            campaignData.opens_total, campaignData.unique_opens, campaignData.open_rate,
            campaignData.clicks_total, campaignData.unique_clicks, campaignData.unique_subscriber_clicks, campaignData.click_rate,
            campaign.id, userId
          ]
        );
      } else {
        // Insert new campaign
        await pool.query(
          `INSERT INTO mailchimp_campaigns (
            user_id, lead_type_id, mailchimp_config_id, campaign_id, web_id, type, status,
            subject_line, preview_text, title, from_name, reply_to, list_id,
            emails_sent, abuse_reports, unsubscribed, hard_bounces, soft_bounces,
            opens_total, unique_opens, open_rate,
            clicks_total, unique_clicks, unique_subscriber_clicks, click_rate,
            send_time, last_synced_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            campaignData.user_id, campaignData.lead_type_id, campaignData.mailchimp_config_id,
            campaignData.campaign_id, campaignData.web_id, campaignData.type, campaignData.status,
            campaignData.subject_line, campaignData.preview_text, campaignData.title,
            campaignData.from_name, campaignData.reply_to, campaignData.list_id,
            campaignData.emails_sent, campaignData.abuse_reports, campaignData.unsubscribed,
            campaignData.hard_bounces, campaignData.soft_bounces,
            campaignData.opens_total, campaignData.unique_opens, campaignData.open_rate,
            campaignData.clicks_total, campaignData.unique_clicks, campaignData.unique_subscriber_clicks, campaignData.click_rate,
            campaignData.send_time, campaignData.last_synced_at
          ]
        );
      }

      syncedCount++;
    }

    res.json({ message: `Synced ${syncedCount} campaigns successfully`, count: syncedCount });
  } catch (error) {
    console.error('Sync campaigns error:', error);
    res.status(500).json({ error: error.response?.data?.detail || 'Failed to sync campaigns' });
  }
});

// ==================== CONTACT SYNC ENDPOINTS ====================

// Get synced contacts
router.get('/contacts', getUserPermissions, async (req, res) => {
  try {
    const userId = req.user.id;
    const leadTypeId = req.query.lead_type_id;

    let query = `
      SELECT mc.*, c.contact_first_name, c.contact_last_name, c.property_address_full,
             lt.name as lead_type_name, lt.color as lead_type_color
      FROM mailchimp_contacts mc
      JOIN contacts c ON mc.contact_id = c.id
      LEFT JOIN lead_types lt ON mc.lead_type_id = lt.id
      WHERE mc.user_id = ? AND mc.deleted_at IS NULL`;

    const params = [userId];

    if (leadTypeId) {
      query += ' AND mc.lead_type_id = ?';
      params.push(leadTypeId);
    } else if (req.permissions.allowed_lead_types && req.permissions.allowed_lead_types.length > 0) {
      query += ` AND mc.lead_type_id IN (${req.permissions.allowed_lead_types.map(() => '?').join(',')})`;
      params.push(...req.permissions.allowed_lead_types);
    }

    query += ' ORDER BY mc.created_at DESC';

    const [contacts] = await pool.query(query, params);

    res.json({ contacts });
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Sync contacts to Mailchimp
router.post('/contacts/sync', getUserPermissions, async (req, res) => {
  try {
    const userId = req.user.id;
    const { lead_type_id, contact_ids } = req.body;

    if (!lead_type_id) {
      return res.status(400).json({ error: 'Lead type ID is required' });
    }

    // Check permission
    if (req.permissions.allowed_lead_types && req.permissions.allowed_lead_types.length > 0) {
      if (!req.permissions.allowed_lead_types.includes(parseInt(lead_type_id))) {
        return res.status(403).json({ error: 'You do not have permission to access this lead type' });
      }
    }

    // Get Mailchimp config
    const [configs] = await pool.query(
      'SELECT * FROM mailchimp_configs WHERE user_id = ? AND lead_type_id = ?',
      [userId, lead_type_id]
    );

    if (configs.length === 0) {
      return res.status(400).json({ error: 'Mailchimp not configured for this lead type' });
    }

    const config = configs[0];

    if (!config.api_key || !config.server_prefix || !config.default_audience_id) {
      return res.status(400).json({ error: 'Mailchimp configuration incomplete' });
    }

    // Get contacts to sync
    let contactQuery = `
      SELECT c.id, c.contact_first_name, c.contact_last_name, c.contact_1_email1, c.property_address_full
      FROM contacts c
      WHERE c.user_id = ? AND c.lead_type = ? AND c.deleted_at IS NULL`;

    const queryParams = [userId, lead_type_id];

    if (contact_ids && contact_ids.length > 0) {
      contactQuery += ` AND c.id IN (${contact_ids.map(() => '?').join(',')})`;
      queryParams.push(...contact_ids);
    }

    const [contacts] = await pool.query(contactQuery, queryParams);

    if (contacts.length === 0) {
      return res.json({ message: 'No contacts to sync', count: 0 });
    }

    let syncedCount = 0;
    let errorCount = 0;

    // Sync each contact to Mailchimp
    for (const contact of contacts) {
      if (!contact.contact_1_email1) {
        errorCount++;
        continue;
      }

      try {
        // Create MD5 hash of email (Mailchimp subscriber hash)
        const crypto = await import('crypto');
        const subscriberHash = crypto.createHash('md5').update(contact.contact_1_email1.toLowerCase()).digest('hex');

        // Fetch subscriber data from Mailchimp (READ-ONLY - does not create)
        const response = await axios.get(
          `https://${config.server_prefix}.api.mailchimp.com/3.0/lists/${config.default_audience_id}/members/${subscriberHash}`,
          {
            headers: {
              'Authorization': `Bearer ${config.api_key}`,
              'Content-Type': 'application/json'
            },
            timeout: 10000
          }
        );

        // Extract all important fields from Mailchimp response
        const mergeFields = response.data.merge_fields || {};
        const memberRating = response.data.member_rating || 0;
        const lastChanged = response.data.last_changed ? new Date(response.data.last_changed) : null;
        const timestampSignup = response.data.timestamp_signup ? new Date(response.data.timestamp_signup) : null;
        const timestampOpt = response.data.timestamp_opt ? new Date(response.data.timestamp_opt) : null;
        const uniqueEmailId = response.data.unique_email_id || null;
        const webId = response.data.web_id || null;
        const emailType = response.data.email_type || 'html';
        const ipSignup = response.data.ip_signup || null;
        const ipOpt = response.data.ip_opt || null;

        // Store in mailchimp_contacts table
        const [existing] = await pool.query(
          'SELECT id FROM mailchimp_contacts WHERE contact_id = ? AND list_id = ?',
          [contact.id, config.default_audience_id]
        );

        if (existing.length > 0) {
          // Update existing
          await pool.query(
            `UPDATE mailchimp_contacts
             SET email_address = ?,
                 status = ?,
                 subscriber_hash = ?,
                 unique_email_id = ?,
                 web_id = ?,
                 email_type = ?,
                 merge_fields = ?,
                 member_rating = ?,
                 last_changed = ?,
                 timestamp_signup = ?,
                 ip_signup = ?,
                 timestamp_opt = ?,
                 ip_opt = ?,
                 sync_status = 'synced',
                 sync_error = NULL,
                 last_synced_at = NOW()
             WHERE contact_id = ? AND list_id = ?`,
            [
              contact.contact_1_email1,
              response.data.status,
              subscriberHash,
              uniqueEmailId,
              webId,
              emailType,
              JSON.stringify(mergeFields),
              memberRating,
              lastChanged,
              timestampSignup,
              ipSignup,
              timestampOpt,
              ipOpt,
              contact.id,
              config.default_audience_id
            ]
          );
        } else {
          // Insert new
          await pool.query(
            `INSERT INTO mailchimp_contacts (
              user_id, contact_id, lead_type_id, mailchimp_config_id,
              subscriber_hash, list_id, unique_email_id, web_id,
              email_address, status, email_type,
              merge_fields, member_rating, last_changed,
              timestamp_signup, ip_signup, timestamp_opt, ip_opt,
              sync_status, last_synced_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', NOW())`,
            [
              userId,
              contact.id,
              lead_type_id,
              config.id,
              subscriberHash,
              config.default_audience_id,
              uniqueEmailId,
              webId,
              contact.contact_1_email1,
              response.data.status,
              emailType,
              JSON.stringify(mergeFields),
              memberRating,
              lastChanged,
              timestampSignup,
              ipSignup,
              timestampOpt,
              ipOpt
            ]
          );
        }

        syncedCount++;
      } catch (error) {
        // If contact doesn't exist in Mailchimp (404), skip it - don't create or log error
        if (error.response?.status === 404) {
          console.log(`Contact ${contact.id} (${contact.contact_1_email1}) not found in Mailchimp - skipping (no insert)`);
          errorCount++;
          continue;
        }

        // For other errors (authentication, rate limit, etc.), log the error
        console.error(`Failed to sync contact ${contact.id}:`, error.response?.data || error.message);

        // Record sync error - insert or update
        const [existingError] = await pool.query(
          'SELECT id FROM mailchimp_contacts WHERE contact_id = ? AND list_id = ?',
          [contact.id, config.default_audience_id]
        );

        if (existingError.length > 0) {
          // Update existing record with error
          await pool.query(
            `UPDATE mailchimp_contacts
             SET sync_status = 'error',
                 sync_error = ?,
                 last_synced_at = NOW()
             WHERE contact_id = ? AND list_id = ?`,
            [error.response?.data?.detail || error.message, contact.id, config.default_audience_id]
          );
        } else {
          // Insert new record with error status (for actual errors, not 404s)
          await pool.query(
            `INSERT INTO mailchimp_contacts (
              user_id, contact_id, lead_type_id, mailchimp_config_id,
              list_id, email_address, sync_status, sync_error, last_synced_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'error', ?, NOW())`,
            [
              userId,
              contact.id,
              lead_type_id,
              config.id,
              config.default_audience_id,
              contact.contact_1_email1,
              error.response?.data?.detail || error.message
            ]
          );
        }

        errorCount++;
      }

      // Rate limiting - wait 100ms between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    res.json({
      message: `Synced ${syncedCount} contacts successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
      synced: syncedCount,
      failed: errorCount
    });
  } catch (error) {
    console.error('Sync contacts error:', error);
    res.status(500).json({ error: error.response?.data?.detail || 'Failed to sync contacts' });
  }
});

// Get contact sync stats
router.get('/contacts/stats', getUserPermissions, async (req, res) => {
  try {
    const userId = req.user.id;
    const leadTypeId = req.query.lead_type_id;

    let query = 'SELECT COUNT(*) as total, SUM(CASE WHEN sync_status = "synced" THEN 1 ELSE 0 END) as synced, SUM(CASE WHEN sync_status = "error" THEN 1 ELSE 0 END) as errors FROM mailchimp_contacts WHERE user_id = ? AND deleted_at IS NULL';
    const params = [userId];

    if (leadTypeId) {
      query += ' AND lead_type_id = ?';
      params.push(leadTypeId);
    }

    const [stats] = await pool.query(query, params);

    res.json({
      total: stats[0].total || 0,
      synced: stats[0].synced || 0,
      errors: stats[0].errors || 0
    });
  } catch (error) {
    console.error('Get contact stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Resync individual contact
router.post('/contacts/:id/resync', getUserPermissions, async (req, res) => {
  try {
    const userId = req.user.id;
    const contactId = req.params.id;

    console.log(`🔄 Resyncing contact ${contactId} for user ${userId}`);

    // Get contact from mailchimp_contacts
    const [contacts] = await pool.query(
      'SELECT * FROM mailchimp_contacts WHERE id = ? AND user_id = ?',
      [contactId, userId]
    );

    if (contacts.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    const contact = contacts[0];

    // Get Mailchimp config for this lead type
    const [configs] = await pool.query(
      'SELECT * FROM mailchimp_configs WHERE user_id = ? AND lead_type_id = ?',
      [userId, contact.lead_type_id]
    );

    if (configs.length === 0) {
      return res.status(404).json({ error: 'Mailchimp configuration not found for this lead type' });
    }

    const config = configs[0];

    // Fetch updated contact data from Mailchimp
    const subscriberHash = crypto.createHash('md5').update(contact.email_address.toLowerCase()).digest('hex');
    const apiUrl = `https://${config.server_prefix}.api.mailchimp.com/3.0/lists/${config.default_audience_id}/members/${subscriberHash}`;

    const response = await axios.get(apiUrl, {
      headers: {
        'Authorization': `Bearer ${config.api_key}`,
        'Content-Type': 'application/json'
      }
    });

    const member = response.data;

    // Update mailchimp_contacts record
    await pool.query(
      `UPDATE mailchimp_contacts
       SET subscriber_hash = ?,
           list_id = ?,
           web_id = ?,
           email_address = ?,
           unique_email_id = ?,
           email_type = ?,
           status = ?,
           member_rating = ?,
           timestamp_signup = ?,
           last_changed = ?,
           sync_status = 'synced',
           sync_error = NULL,
           last_synced_at = NOW()
       WHERE id = ? AND user_id = ?`,
      [
        member.id,
        member.list_id,
        member.web_id,
        member.email_address,
        member.unique_email_id,
        member.email_type,
        member.status,
        member.member_rating || 0,
        member.timestamp_signup || null,
        member.last_changed || null,
        contactId,
        userId
      ]
    );

    console.log(`✅ Contact ${contactId} resynced successfully`);

    res.json({
      message: 'Contact resynced successfully',
      contact: member
    });
  } catch (error) {
    console.error('Resync contact error:', error);

    // Update contact with error status
    if (req.params.id) {
      await pool.query(
        'UPDATE mailchimp_contacts SET sync_status = "error", sync_error = ?, last_synced_at = NOW() WHERE id = ? AND user_id = ?',
        [error.response?.data?.detail || error.message, req.params.id, req.user.id]
      );
    }

    res.status(500).json({ error: error.response?.data?.detail || 'Failed to resync contact' });
  }
});

// Archive individual contact (soft delete)
router.delete('/contacts/:id', getUserPermissions, async (req, res) => {
  try {
    const userId = req.user.id;
    const contactId = req.params.id;

    console.log(`🗑️ Archiving contact ${contactId} for user ${userId}`);

    // Verify contact belongs to user
    const [contacts] = await pool.query(
      'SELECT * FROM mailchimp_contacts WHERE id = ? AND user_id = ?',
      [contactId, userId]
    );

    if (contacts.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Soft delete by setting deleted_at timestamp
    await pool.query(
      'UPDATE mailchimp_contacts SET deleted_at = NOW() WHERE id = ? AND user_id = ?',
      [contactId, userId]
    );

    console.log(`✅ Contact ${contactId} archived successfully`);

    res.json({
      message: 'Contact archived successfully'
    });
  } catch (error) {
    console.error('Archive contact error:', error);
    res.status(500).json({ error: 'Failed to archive contact' });
  }
});

// Archive individual campaign (soft delete)
router.delete('/campaigns/:id', getUserPermissions, async (req, res) => {
  try {
    const userId = req.user.id;
    const campaignId = req.params.id;

    console.log(`🗑️ Archiving campaign ${campaignId} for user ${userId}`);

    // Verify campaign belongs to user
    const [campaigns] = await pool.query(
      'SELECT * FROM mailchimp_campaigns WHERE id = ? AND user_id = ?',
      [campaignId, userId]
    );

    if (campaigns.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Soft delete by setting deleted_at timestamp
    await pool.query(
      'UPDATE mailchimp_campaigns SET deleted_at = NOW() WHERE id = ? AND user_id = ?',
      [campaignId, userId]
    );

    console.log(`✅ Campaign ${campaignId} archived successfully`);

    res.json({
      message: 'Campaign archived successfully'
    });
  } catch (error) {
    console.error('Archive campaign error:', error);
    res.status(500).json({ error: 'Failed to archive campaign' });
  }
});

// Resync individual campaign
router.post('/campaigns/:id/resync', getUserPermissions, async (req, res) => {
  try {
    const userId = req.user.id;
    const campaignId = req.params.id;

    console.log(`🔄 Resyncing campaign ${campaignId} for user ${userId}`);

    // Get campaign from database
    const [campaigns] = await pool.query(
      'SELECT * FROM mailchimp_campaigns WHERE id = ? AND user_id = ?',
      [campaignId, userId]
    );

    if (campaigns.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const dbCampaign = campaigns[0];

    // Get Mailchimp config for this lead type
    const [configs] = await pool.query(
      'SELECT * FROM mailchimp_configs WHERE user_id = ? AND lead_type_id = ?',
      [userId, dbCampaign.lead_type_id]
    );

    if (configs.length === 0) {
      return res.status(404).json({ error: 'Mailchimp configuration not found for this lead type' });
    }

    const config = configs[0];

    // Fetch updated campaign data from Mailchimp
    const apiUrl = `https://${config.server_prefix}.api.mailchimp.com/3.0/campaigns/${dbCampaign.campaign_id}`;

    const response = await axios.get(apiUrl, {
      headers: {
        'Authorization': `Bearer ${config.api_key}`,
        'Content-Type': 'application/json'
      }
    });

    const campaign = response.data;

    // Get report data if campaign was sent
    let reportData = null;
    if (campaign.status === 'sent') {
      const reportUrl = `https://${config.server_prefix}.api.mailchimp.com/3.0/reports/${campaign.id}`;
      try {
        const reportResponse = await axios.get(reportUrl, {
          headers: {
            'Authorization': `Bearer ${config.api_key}`,
            'Content-Type': 'application/json'
          }
        });
        reportData = reportResponse.data;
      } catch (error) {
        console.log('No report data available for campaign:', campaign.id);
      }
    }

    // Prepare campaign data
    const campaignData = {
      status: campaign.status,
      send_time: campaign.send_time || null,
      emails_sent: reportData?.emails_sent || 0,
      abuse_reports: reportData?.abuse_reports || 0,
      unsubscribed: reportData?.unsubscribed || 0,
      hard_bounces: reportData?.bounces?.hard_bounces || 0,
      soft_bounces: reportData?.bounces?.soft_bounces || 0,
      opens_total: reportData?.opens?.opens_total || 0,
      unique_opens: reportData?.opens?.unique_opens || 0,
      open_rate: reportData?.opens?.open_rate ? (reportData.opens.open_rate * 100) : 0,
      clicks_total: reportData?.clicks?.clicks_total || 0,
      unique_clicks: reportData?.clicks?.unique_clicks || 0,
      unique_subscriber_clicks: reportData?.clicks?.unique_subscriber_clicks || 0,
      click_rate: reportData?.clicks?.click_rate ? (reportData.clicks.click_rate * 100) : 0
    };

    // Update campaign
    await pool.query(
      `UPDATE mailchimp_campaigns
       SET status = ?, send_time = ?,
           emails_sent = ?, abuse_reports = ?, unsubscribed = ?,
           hard_bounces = ?, soft_bounces = ?,
           opens_total = ?, unique_opens = ?, open_rate = ?,
           clicks_total = ?, unique_clicks = ?, unique_subscriber_clicks = ?, click_rate = ?,
           last_synced_at = NOW()
       WHERE id = ? AND user_id = ?`,
      [
        campaignData.status, campaignData.send_time,
        campaignData.emails_sent, campaignData.abuse_reports, campaignData.unsubscribed,
        campaignData.hard_bounces, campaignData.soft_bounces,
        campaignData.opens_total, campaignData.unique_opens, campaignData.open_rate,
        campaignData.clicks_total, campaignData.unique_clicks, campaignData.unique_subscriber_clicks, campaignData.click_rate,
        campaignId, userId
      ]
    );

    console.log(`✅ Campaign ${campaignId} resynced successfully`);

    res.json({
      message: 'Campaign resynced successfully',
      campaign: campaignData
    });
  } catch (error) {
    console.error('Resync campaign error:', error);
    res.status(500).json({ error: error.response?.data?.detail || 'Failed to resync campaign' });
  }
});

export default router;
