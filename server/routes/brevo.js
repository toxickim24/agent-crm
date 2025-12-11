import express from 'express';
import { authenticateToken, isActive, isAdmin } from '../middleware/auth.js';
import pool from '../config/database.js';
import BrevoService from '../services/brevoService.js';
import BrevoAnalyticsService from '../services/brevoAnalyticsService.js';
import BrevoScoringService from '../services/brevoScoringService.js';

const router = express.Router();

/**
 * Brevo Routes - READ-ONLY Integration
 *
 * All endpoints are protected by authentication and permissions
 * NO data is ever pushed TO Brevo - only pulled FROM Brevo
 */

// Apply authentication to all Brevo routes
router.use(authenticateToken, isActive);

// =====================================================
// PERMISSION MIDDLEWARE
// =====================================================

/**
 * Check if user has specific Brevo permission
 */
const checkBrevoPermission = (permissionKey) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.id;

      const [permissions] = await pool.query(
        `SELECT ${permissionKey} FROM permissions WHERE user_id = ?`,
        [userId]
      );

      if (!permissions || permissions.length === 0) {
        return res.status(403).json({ error: 'Permissions not configured' });
      }

      if (!permissions[0][permissionKey]) {
        return res.status(403).json({
          error: `You don't have permission to ${permissionKey.replace('brevo_', '').replace('_', ' ')}`,
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Failed to check permissions' });
    }
  };
};

// =====================================================
// ACCOUNT & SETTINGS
// =====================================================

/**
 * GET /api/brevo/account
 * Get Brevo account information
 */
router.get('/account', checkBrevoPermission('brevo'), async (req, res) => {
  try {
    const userId = req.user.id;

    // Get API key
    const [configs] = await pool.query(
      'SELECT brevo_api_key, brevo_account_email FROM api_configs WHERE user_id = ?',
      [userId]
    );

    if (!configs || configs.length === 0 || !configs[0].brevo_api_key) {
      return res.status(200).json({
        configured: false,
        message: 'Brevo API key not configured',
      });
    }

    // Test API key and get account info
    const accountInfo = await BrevoService.testApiKey(configs[0].brevo_api_key);

    res.json({
      configured: true,
      valid: accountInfo.valid,
      email: accountInfo.email,
      companyName: accountInfo.companyName,
      plan: accountInfo.plan,
      storedEmail: configs[0].brevo_account_email,
    });
  } catch (error) {
    console.error('Get Brevo account error:', error);
    res.status(500).json({ error: 'Failed to get account information' });
  }
});

/**
 * POST /api/brevo/settings
 * Save Brevo API key (Admin only)
 */
router.post('/settings', isAdmin, async (req, res) => {
  try {
    const userId = req.user.id;
    const { brevo_api_key, brevo_account_email } = req.body;

    if (!brevo_api_key) {
      return res.status(400).json({ error: 'Brevo API key is required' });
    }

    // Test API key validity
    const test = await BrevoService.testApiKey(brevo_api_key);
    if (!test.valid) {
      return res.status(400).json({
        error: 'Invalid Brevo API key',
        details: test.error,
      });
    }

    // Check if config exists
    const [configs] = await pool.query(
      'SELECT id FROM api_configs WHERE user_id = ?',
      [userId]
    );

    if (configs.length === 0) {
      // Create new config
      await pool.query(
        'INSERT INTO api_configs (user_id, brevo_api_key, brevo_account_email) VALUES (?, ?, ?)',
        [userId, brevo_api_key, brevo_account_email || test.email]
      );
    } else {
      // Update existing config
      await pool.query(
        'UPDATE api_configs SET brevo_api_key = ?, brevo_account_email = ? WHERE user_id = ?',
        [brevo_api_key, brevo_account_email || test.email, userId]
      );
    }

    res.json({
      message: 'Brevo API key saved successfully',
      email: test.email,
      companyName: test.companyName,
      plan: test.plan,
    });
  } catch (error) {
    console.error('Save Brevo settings error:', error);
    res.status(500).json({ error: error.message || 'Failed to save Brevo settings' });
  }
});

// =====================================================
// LISTS
// =====================================================

/**
 * GET /api/brevo/lists
 * Get cached lists or fetch from Brevo
 */
router.get('/lists', checkBrevoPermission('brevo_view_lists'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { refresh } = req.query;

    if (refresh === 'true') {
      // Fetch fresh data from Brevo
      const startTime = Date.now();
      const lists = await BrevoService.fetchLists(userId);
      const duration = Date.now() - startTime;

      await BrevoService.logSync(userId, 'lists', 'success', lists.length, null, duration);

      res.json({
        lists,
        cached: false,
        syncedAt: new Date(),
      });
    } else {
      // Return cached data
      const lists = await BrevoService.getCachedLists(userId);
      res.json({
        lists,
        cached: true,
        message: lists.length === 0 ? 'No cached lists. Click "Sync" to fetch from Brevo.' : null,
      });
    }
  } catch (error) {
    console.error('Get Brevo lists error:', error);
    await BrevoService.logSync(req.user.id, 'lists', 'failed', 0, error.message);
    res.status(500).json({ error: error.message || 'Failed to get Brevo lists' });
  }
});

// =====================================================
// CONTACTS
// =====================================================

/**
 * GET /api/brevo/contacts
 * Get cached contacts or fetch from Brevo
 */
router.get('/contacts', checkBrevoPermission('brevo_view_contacts'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { refresh, listId, search, limit } = req.query;

    if (refresh === 'true') {
      // Fetch fresh data from Brevo
      const startTime = Date.now();
      let contacts;

      if (listId) {
        contacts = await BrevoService.fetchContactsFromList(userId, listId);
      } else {
        contacts = await BrevoService.fetchAllContacts(userId);
      }

      const duration = Date.now() - startTime;
      await BrevoService.logSync(userId, 'contacts', 'success', contacts.length, null, duration);

      res.json({
        contacts,
        count: contacts.length,
        cached: false,
        syncedAt: new Date(),
      });
    } else {
      // Return cached data
      const contacts = await BrevoService.getCachedContacts(userId, { listId, search, limit });
      res.json({
        contacts,
        count: contacts.length,
        cached: true,
        message: contacts.length === 0 ? 'No cached contacts. Click "Sync" to fetch from Brevo.' : null,
      });
    }
  } catch (error) {
    console.error('Get Brevo contacts error:', error);
    await BrevoService.logSync(req.user.id, 'contacts', 'failed', 0, error.message);
    res.status(500).json({ error: error.message || 'Failed to get Brevo contacts' });
  }
});

/**
 * GET /api/brevo/contacts/count
 * Get contact count by list
 */
router.get('/contacts/count', checkBrevoPermission('brevo_view_contacts'), async (req, res) => {
  try {
    const userId = req.user.id;

    const [result] = await pool.query(
      'SELECT COUNT(*) as total FROM brevo_contacts WHERE user_id = ?',
      [userId]
    );

    res.json({
      total: result[0].total,
    });
  } catch (error) {
    console.error('Get Brevo contact count error:', error);
    res.status(500).json({ error: 'Failed to get contact count' });
  }
});

/**
 * GET /api/brevo/contacts/paginated
 * Get paginated contacts with scores, tiers, and filtering
 */
router.get('/contacts/paginated', checkBrevoPermission('brevo_view_contacts'), async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const search = req.query.search || '';
    const tier = req.query.tier || ''; // 'Champion', 'Warm', 'Cold', or '' for all
    const offset = (page - 1) * limit;

    // Build query with search
    let whereClause = 'WHERE user_id = ?';
    const params = [userId];

    if (search) {
      whereClause += ' AND email LIKE ?';
      params.push(`%${search}%`);
    }

    // Get ALL contacts (for filtering by tier after scoring)
    const [allContacts] = await pool.query(
      `SELECT * FROM brevo_contacts
       ${whereClause}
       ORDER BY email ASC`,
      params
    );

    // Calculate score and tier for each contact
    const scoredContacts = allContacts.map(contact => {
      const score = BrevoScoringService.calculateContactScore(contact);
      const contactTier = BrevoScoringService.getEngagementTier(score);
      return {
        ...contact,
        score,
        tier: contactTier,
      };
    });

    // Filter by tier if specified
    const filteredContacts = tier
      ? scoredContacts.filter(c => c.tier === tier)
      : scoredContacts;

    // Apply pagination to filtered results
    const total = filteredContacts.length;
    const paginatedContacts = filteredContacts.slice(offset, offset + limit);

    res.json({
      contacts: paginatedContacts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('Get paginated Brevo contacts error:', error);
    res.status(500).json({ error: 'Failed to get contacts' });
  }
});

/**
 * GET /api/brevo/contacts/export
 * Get ALL contacts (no pagination) for CSV export with scores, tiers, and filtering
 */
router.get('/contacts/export', checkBrevoPermission('brevo_export_data'), async (req, res) => {
  try {
    const userId = req.user.id;
    const search = req.query.search || '';
    const tier = req.query.tier || ''; // 'Champion', 'Warm', 'Cold', or '' for all

    // Build query with search
    let whereClause = 'WHERE user_id = ?';
    const params = [userId];

    if (search) {
      whereClause += ' AND email LIKE ?';
      params.push(`%${search}%`);
    }

    // Get ALL contacts
    const [allContacts] = await pool.query(
      `SELECT * FROM brevo_contacts
       ${whereClause}
       ORDER BY email ASC`,
      params
    );

    // Calculate score and tier for each contact
    const scoredContacts = allContacts.map(contact => {
      const score = BrevoScoringService.calculateContactScore(contact);
      const contactTier = BrevoScoringService.getEngagementTier(score);
      return {
        ...contact,
        score,
        tier: contactTier,
      };
    });

    // Filter by tier if specified
    const filteredContacts = tier
      ? scoredContacts.filter(c => c.tier === tier)
      : scoredContacts;

    res.json({
      contacts: filteredContacts,
      total: filteredContacts.length,
    });
  } catch (error) {
    console.error('Get export Brevo contacts error:', error);
    res.status(500).json({ error: 'Failed to export contacts' });
  }
});

// =====================================================
// CAMPAIGNS
// =====================================================

/**
 * GET /api/brevo/campaigns
 * Get cached campaigns or fetch from Brevo
 */
router.get('/campaigns', checkBrevoPermission('brevo_view_campaigns'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { refresh, status, limit } = req.query;

    if (refresh === 'true') {
      // Fetch fresh data from Brevo
      const startTime = Date.now();
      const campaigns = await BrevoService.fetchCampaigns(userId);
      const duration = Date.now() - startTime;

      await BrevoService.logSync(userId, 'campaigns', 'success', campaigns.length, null, duration);

      res.json({
        campaigns,
        count: campaigns.length,
        cached: false,
        syncedAt: new Date(),
      });
    } else {
      // Return cached data
      const campaigns = await BrevoService.getCachedCampaigns(userId, { status, limit });
      res.json({
        campaigns,
        count: campaigns.length,
        cached: true,
        message: campaigns.length === 0 ? 'No cached campaigns. Click "Sync" to fetch from Brevo.' : null,
      });
    }
  } catch (error) {
    console.error('Get Brevo campaigns error:', error);
    await BrevoService.logSync(req.user.id, 'campaigns', 'failed', 0, error.message);
    res.status(500).json({ error: error.message || 'Failed to get Brevo campaigns' });
  }
});

/**
 * GET /api/brevo/campaigns/:id
 * Get single campaign details
 */
router.get('/campaigns/:id', checkBrevoPermission('brevo_view_campaigns'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const campaign = await BrevoService.getCampaignDetails(userId, id);

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json({ campaign });
  } catch (error) {
    console.error('Get Brevo campaign details error:', error);
    res.status(500).json({ error: 'Failed to get campaign details' });
  }
});

// =====================================================
// STATISTICS & ANALYTICS
// =====================================================

/**
 * GET /api/brevo/stats/overview
 * Get overall statistics from cached data
 */
router.get('/stats/overview', checkBrevoPermission('brevo_view_stats'), async (req, res) => {
  try {
    const userId = req.user.id;

    // Get aggregated campaign statistics
    const [stats] = await pool.query(
      `SELECT
         COUNT(*) as total_campaigns,
         SUM(stats_sent) as total_sent,
         SUM(stats_delivered) as total_delivered,
         SUM(stats_opens) as total_opens,
         SUM(stats_unique_opens) as total_unique_opens,
         SUM(stats_clicks) as total_clicks,
         SUM(stats_unique_clicks) as total_unique_clicks,
         SUM(stats_bounces) as total_bounces,
         SUM(stats_hard_bounces) as total_hard_bounces,
         SUM(stats_soft_bounces) as total_soft_bounces,
         SUM(stats_unsubscribes) as total_unsubscribes,
         SUM(stats_spam_reports) as total_spam_reports,
         AVG(open_rate) as avg_open_rate,
         AVG(click_rate) as avg_click_rate,
         AVG(bounce_rate) as avg_bounce_rate
       FROM brevo_campaigns
       WHERE user_id = ? AND campaign_status = 'sent'`,
      [userId]
    );

    // Get list count
    const [listCount] = await pool.query(
      'SELECT COUNT(*) as total FROM brevo_lists WHERE user_id = ?',
      [userId]
    );

    // Get contact count
    const [contactCount] = await pool.query(
      'SELECT COUNT(*) as total FROM brevo_contacts WHERE user_id = ?',
      [userId]
    );

    res.json({
      campaigns: stats[0],
      totalLists: listCount[0].total,
      totalContacts: contactCount[0].total,
    });
  } catch (error) {
    console.error('Get Brevo statistics error:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

/**
 * GET /api/brevo/stats/recent
 * Get recent campaign performance
 */
router.get('/stats/recent', checkBrevoPermission('brevo_view_stats'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10 } = req.query;

    const [campaigns] = await pool.query(
      `SELECT
         brevo_campaign_id,
         campaign_name,
         subject,
         sent_date,
         stats_sent,
         stats_delivered,
         stats_unique_opens,
         stats_unique_clicks,
         open_rate,
         click_rate
       FROM brevo_campaigns
       WHERE user_id = ? AND campaign_status = 'sent'
       ORDER BY sent_date DESC
       LIMIT ?`,
      [userId, parseInt(limit)]
    );

    res.json({ campaigns });
  } catch (error) {
    console.error('Get recent Brevo campaigns error:', error);
    res.status(500).json({ error: 'Failed to get recent campaigns' });
  }
});

// =====================================================
// SYNC HISTORY
// =====================================================

/**
 * GET /api/brevo/sync-history
 * Get sync operation history
 */
router.get('/sync-history', checkBrevoPermission('brevo'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50 } = req.query;

    const history = await BrevoService.getSyncHistory(userId, parseInt(limit));

    res.json({ history });
  } catch (error) {
    console.error('Get Brevo sync history error:', error);
    res.status(500).json({ error: 'Failed to get sync history' });
  }
});

// =====================================================
// EXPORT
// =====================================================

/**
 * GET /api/brevo/export/contacts/csv
 * Export contacts to CSV
 */
router.get('/export/contacts/csv', checkBrevoPermission('brevo_export_csv'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { listId } = req.query;

    const contacts = await BrevoService.getCachedContacts(userId, { listId });

    // Generate CSV
    const csv = [
      'Email,Brevo Contact ID,Lists,Blacklisted,Created At,Modified At'
    ];

    for (const contact of contacts) {
      const listIds = JSON.parse(contact.list_ids || '[]').join(';');
      csv.push([
        contact.email,
        contact.brevo_contact_id,
        listIds,
        contact.email_blacklisted ? 'Yes' : 'No',
        contact.created_at_brevo || '',
        contact.modified_at_brevo || ''
      ].join(','));
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=brevo-contacts-${Date.now()}.csv`);
    res.send(csv.join('\n'));
  } catch (error) {
    console.error('Export Brevo contacts error:', error);
    res.status(500).json({ error: 'Failed to export contacts' });
  }
});

/**
 * GET /api/brevo/export/campaigns/csv
 * Export campaigns to CSV
 */
router.get('/export/campaigns/csv', checkBrevoPermission('brevo_export_csv'), async (req, res) => {
  try {
    const userId = req.user.id;

    const campaigns = await BrevoService.getCachedCampaigns(userId, {});

    // Generate CSV
    const csv = [
      'Campaign Name,Subject,Status,Sent Date,Sent,Delivered,Opens,Clicks,Bounces,Unsubscribes,Open Rate,Click Rate'
    ];

    for (const campaign of campaigns) {
      csv.push([
        campaign.campaign_name,
        campaign.subject || '',
        campaign.campaign_status,
        campaign.sent_date || '',
        campaign.stats_sent,
        campaign.stats_delivered,
        campaign.stats_unique_opens,
        campaign.stats_unique_clicks,
        campaign.stats_bounces,
        campaign.stats_unsubscribes,
        campaign.open_rate + '%',
        campaign.click_rate + '%'
      ].map(val => `"${val}"`).join(','));
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=brevo-campaigns-${Date.now()}.csv`);
    res.send(csv.join('\n'));
  } catch (error) {
    console.error('Export Brevo campaigns error:', error);
    res.status(500).json({ error: 'Failed to export campaigns' });
  }
});

// =====================================================
// ANALYTICS ENDPOINTS (Phase 1)
// =====================================================

/**
 * GET /api/brevo/analytics/engagement-overview
 * Get engagement score overview and tier distribution
 */
router.get('/analytics/engagement-overview', checkBrevoPermission('brevo_view_contacts'), async (req, res) => {
  try {
    const userId = req.user.id;
    const overview = await BrevoAnalyticsService.getEngagementOverview(userId);

    // Don't return scored contacts array to frontend (too large)
    const { scoredContacts, ...responseData } = overview;

    res.json(responseData);
  } catch (error) {
    console.error('Error fetching engagement overview:', error);
    res.status(500).json({ error: 'Failed to fetch engagement overview' });
  }
});

/**
 * GET /api/brevo/analytics/top-contacts
 * Get top engaged contacts
 */
router.get('/analytics/top-contacts', checkBrevoPermission('brevo_view_contacts'), async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 20;

    const topContacts = await BrevoAnalyticsService.getTopContacts(userId, limit);

    res.json(topContacts);
  } catch (error) {
    console.error('Error fetching top contacts:', error);
    res.status(500).json({ error: 'Failed to fetch top contacts' });
  }
});

/**
 * GET /api/brevo/analytics/list-health
 * Get list health scores
 */
router.get('/analytics/list-health', checkBrevoPermission('brevo_view_lists'), async (req, res) => {
  try {
    const userId = req.user.id;
    const listId = req.query.listId ? parseInt(req.query.listId) : null;

    const healthScores = await BrevoAnalyticsService.calculateListHealth(userId, listId);

    res.json(listId ? { list: healthScores } : { lists: healthScores });
  } catch (error) {
    console.error('Error calculating list health:', error);
    res.status(500).json({ error: 'Failed to calculate list health' });
  }
});

/**
 * GET /api/brevo/analytics/time-of-day
 * Get time-of-day engagement analysis with heatmap data
 */
router.get('/analytics/time-of-day', checkBrevoPermission('brevo_view_campaigns'), async (req, res) => {
  try {
    const userId = req.user.id;
    const daysBack = parseInt(req.query.daysBack) || 90;

    const timeAnalysis = await BrevoAnalyticsService.getTimeOfDayAnalysis(userId, daysBack);

    res.json(timeAnalysis);
  } catch (error) {
    console.error('Error fetching time-of-day analysis:', error);
    res.status(500).json({ error: 'Failed to fetch time-of-day analysis' });
  }
});

// =====================================================
// PHASE 3: CALCULATED METRICS (READ-ONLY)
// =====================================================

/**
 * GET /api/brevo/analytics/contact-scoring
 * Get contact scoring overview with tier distribution
 * Uses ONLY brevo_contacts table (no webhook data required)
 */
router.get('/analytics/contact-scoring', checkBrevoPermission('brevo_view_contacts'), async (req, res) => {
  try {
    const userId = req.user.id;
    const overview = await BrevoScoringService.getContactScoringOverview(userId);

    res.json(overview);
  } catch (error) {
    console.error('Error fetching contact scoring overview:', error);
    res.status(500).json({ error: 'Failed to fetch contact scoring overview' });
  }
});

/**
 * GET /api/brevo/analytics/scored-contacts
 * Get all scored contacts with individual scores and tiers
 */
router.get('/analytics/scored-contacts', checkBrevoPermission('brevo_view_contacts'), async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = req.query.limit ? parseInt(req.query.limit) : null;

    const scoredContacts = await BrevoScoringService.getScoredContacts(userId, limit);

    res.json({ contacts: scoredContacts });
  } catch (error) {
    console.error('Error fetching scored contacts:', error);
    res.status(500).json({ error: 'Failed to fetch scored contacts' });
  }
});

/**
 * GET /api/brevo/analytics/campaign-benchmarks
 * Get campaign performance benchmarks and industry comparisons
 * Calculates global averages and identifies top/bottom performers
 */
router.get('/analytics/campaign-benchmarks', checkBrevoPermission('brevo_view_campaigns'), async (req, res) => {
  try {
    const userId = req.user.id;
    const benchmarks = await BrevoScoringService.getCampaignBenchmarks(userId);

    res.json(benchmarks);
  } catch (error) {
    console.error('Error fetching campaign benchmarks:', error);
    res.status(500).json({ error: 'Failed to fetch campaign benchmarks' });
  }
});

/**
 * GET /api/brevo/analytics/list-health-enhanced
 * Get enhanced list health scores with detailed breakdowns
 */
router.get('/analytics/list-health-enhanced', checkBrevoPermission('brevo_view_lists'), async (req, res) => {
  try {
    const userId = req.user.id;
    const healthScores = await BrevoScoringService.getListHealthScores(userId);

    res.json({ lists: healthScores });
  } catch (error) {
    console.error('Error fetching enhanced list health:', error);
    res.status(500).json({ error: 'Failed to fetch enhanced list health' });
  }
});

/**
 * GET /api/brevo/analytics/events
 * Get all webhook events (opens, clicks) from brevo_campaign_activity table
 * Supports filtering and searching
 */
router.get('/analytics/events', checkBrevoPermission('brevo_view_campaigns'), async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = req.query.limit ? parseInt(req.query.limit) : 1000;
    const offset = req.query.offset ? parseInt(req.query.offset) : 0;

    // Fetch events from brevo_campaign_activity table
    const [events] = await pool.query(`
      SELECT
        id,
        email,
        campaign_id,
        campaign_name,
        opened_at,
        clicked_at,
        created_at
      FROM brevo_campaign_activity
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [userId, limit, offset]);

    // Get stats
    const [stats] = await pool.query(`
      SELECT
        COUNT(*) as total_events,
        COUNT(DISTINCT email) as unique_contacts,
        COUNT(DISTINCT campaign_id) as unique_campaigns,
        COUNT(opened_at) as total_opens,
        COUNT(clicked_at) as total_clicks,
        MIN(created_at) as first_event,
        MAX(created_at) as last_event
      FROM brevo_campaign_activity
      WHERE user_id = ?
    `, [userId]);

    res.json({
      events,
      stats: stats[0],
      pagination: {
        limit,
        offset,
        total: stats[0].total_events
      }
    });
  } catch (error) {
    console.error('Error fetching webhook events:', error);
    res.status(500).json({ error: 'Failed to fetch webhook events' });
  }
});

/**
 * GET /api/brevo/analytics/events/contact/:email
 * Get event timeline for a specific contact
 */
router.get('/analytics/events/contact/:email', checkBrevoPermission('brevo_view_contacts'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { email } = req.params;

    const [events] = await pool.query(`
      SELECT
        id,
        email,
        campaign_id,
        campaign_name,
        opened_at,
        clicked_at,
        created_at
      FROM brevo_campaign_activity
      WHERE user_id = ? AND email = ?
      ORDER BY created_at DESC
    `, [userId, email]);

    // Calculate engagement stats for this contact
    const stats = {
      total_events: events.length,
      total_opens: events.filter(e => e.opened_at).length,
      total_clicks: events.filter(e => e.clicked_at).length,
      unique_campaigns: new Set(events.map(e => e.campaign_id)).size,
      first_activity: events.length > 0 ? events[events.length - 1].created_at : null,
      last_activity: events.length > 0 ? events[0].created_at : null
    };

    res.json({ email, events, stats });
  } catch (error) {
    console.error('Error fetching contact events:', error);
    res.status(500).json({ error: 'Failed to fetch contact events' });
  }
});

/**
 * GET /api/brevo/analytics/events/recent
 * Get recent events for real-time feed with 24h statistics
 */
router.get('/analytics/events/recent', checkBrevoPermission('brevo_view_campaigns'), async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;

    // Fetch recent events
    const [events] = await pool.query(`
      SELECT
        id,
        email,
        campaign_id,
        campaign_name,
        opened_at,
        clicked_at,
        created_at
      FROM brevo_campaign_activity
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `, [userId, limit]);

    // Get 24-hour statistics
    const [stats] = await pool.query(`
      SELECT
        COUNT(*) as events_24h,
        COUNT(DISTINCT email) as active_contacts_24h,
        COUNT(opened_at) as opens_24h,
        COUNT(clicked_at) as clicks_24h
      FROM brevo_campaign_activity
      WHERE user_id = ?
        AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    `, [userId]);

    res.json({
      events,
      stats: stats[0]
    });
  } catch (error) {
    console.error('Error fetching recent events:', error);
    res.status(500).json({ error: 'Failed to fetch recent events' });
  }
});

// =====================================================
// AUTOMATIONS (READ-ONLY)
// =====================================================

/**
 * GET /api/brevo/automations
 * Get all automations with optional status filter (read-only)
 */
router.get('/automations', checkBrevoPermission('brevo_view_automations'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query; // 'active', 'paused', 'inactive', or undefined for all

    // Build WHERE clause
    let whereClause = 'WHERE user_id = ?';
    const params = [userId];

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    // Fetch automations
    const [automations] = await pool.query(
      `SELECT
        id,
        brevo_automation_id,
        name,
        status,
        contacts_total,
        contacts_active,
        contacts_paused,
        contacts_finished,
        contacts_started,
        contacts_suspended,
        last_edited_at,
        created_at
       FROM brevo_automations
       ${whereClause}
       ORDER BY last_edited_at DESC`,
      params
    );

    // Get status counts
    const [counts] = await pool.query(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'paused' THEN 1 ELSE 0 END) as paused,
        SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive
       FROM brevo_automations
       WHERE user_id = ?`,
      [userId]
    );

    res.json({
      automations,
      counts: counts[0] || { total: 0, active: 0, paused: 0, inactive: 0 }
    });
  } catch (error) {
    console.error('Error fetching automations:', error);
    res.status(500).json({ error: 'Failed to fetch automations' });
  }
});

/**
 * GET /api/brevo/automations/stats
 * Get aggregated automation statistics (read-only)
 */
router.get('/automations/stats', checkBrevoPermission('brevo_view_automations'), async (req, res) => {
  try {
    const userId = req.user.id;

    const [stats] = await pool.query(
      `SELECT
        COUNT(*) as total_automations,
        SUM(contacts_total) as total_contacts,
        SUM(contacts_active) as total_active,
        SUM(contacts_finished) as total_finished,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_automations,
        SUM(CASE WHEN status = 'paused' THEN 1 ELSE 0 END) as paused_automations,
        SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive_automations
       FROM brevo_automations
       WHERE user_id = ?`,
      [userId]
    );

    res.json(stats[0] || {
      total_automations: 0,
      total_contacts: 0,
      total_active: 0,
      total_finished: 0,
      active_automations: 0,
      paused_automations: 0,
      inactive_automations: 0
    });
  } catch (error) {
    console.error('Error fetching automation stats:', error);
    res.status(500).json({ error: 'Failed to fetch automation stats' });
  }
});

export default router;
