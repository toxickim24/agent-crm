import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

/**
 * Brevo Webhook Handler
 *
 * Receives real-time events from Brevo for marketing email campaigns:
 * - opened: Email was opened
 * - click: Link was clicked
 * - delivered: Email was successfully delivered
 * - hard_bounce: Permanent delivery failure
 * - soft_bounce: Temporary delivery failure
 * - unsubscribe: Contact unsubscribed
 * - spam: Marked as spam
 *
 * NO AUTHENTICATION - Webhooks come from Brevo servers
 * Security: Validate event structure and handle errors gracefully
 */

/**
 * POST /api/webhooks/brevo
 * Main webhook receiver endpoint
 */
router.post('/brevo', async (req, res) => {
  try {
    const event = req.body;

    console.log('📨 Brevo webhook received:', {
      event: event.event,
      email: event.email,
      campaign_id: event.camp_id,
      campaign: event['campaign name'],
      timestamp: event.date_event
    });

    // Validate required fields
    if (!event.event || !event.email) {
      console.error('❌ Invalid webhook payload - missing required fields');
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }

    // Process event based on type
    switch (event.event) {
      case 'opened':
      case 'unique_opened': // Some Brevo accounts use this
        await handleOpenEvent(event);
        break;

      case 'click':
      case 'unique_click': // Some Brevo accounts use this
        await handleClickEvent(event);
        break;

      case 'delivered':
        await handleDeliveredEvent(event);
        break;

      case 'hard_bounce':
      case 'soft_bounce':
        await handleBounceEvent(event);
        break;

      case 'unsubscribe':
      case 'unsubscribed':
        await handleUnsubscribeEvent(event);
        break;

      case 'spam':
      case 'complaint':
        await handleSpamEvent(event);
        break;

      default:
        console.log(`⚠️ Unhandled event type: ${event.event}`);
    }

    // Always return 200 OK to Brevo to prevent retries
    res.status(200).json({ received: true, event: event.event });

  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    // Still return 200 to prevent Brevo from retrying failed events
    res.status(200).json({ error: error.message, received: false });
  }
});

/**
 * POST /api/webhooks/brevo/:token
 * User-specific webhook endpoint with unique token
 *
 * Each user gets their own webhook URL with a unique token
 * Example: https://yourdomain.com/api/webhooks/brevo/abc123...
 */
router.post('/brevo/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const event = req.body;

    console.log('📨 Brevo webhook received (token-based):', {
      token: token.substring(0, 8) + '...',
      event: event.event,
      email: event.email,
      campaign_id: event.camp_id,
      timestamp: event.date_event
    });

    // Look up user_id from webhook token
    const [webhookConfig] = await pool.query(`
      SELECT user_id, is_active, events_received
      FROM brevo_webhooks
      WHERE webhook_token = ?
    `, [token]);

    if (webhookConfig.length === 0) {
      console.error('❌ Invalid webhook token');
      return res.status(404).json({ error: 'Invalid webhook token' });
    }

    const userId = webhookConfig[0].user_id;
    const isActive = webhookConfig[0].is_active;

    if (!isActive) {
      console.log('⚠️ Webhook is inactive for this user');
      return res.status(200).json({ received: false, message: 'Webhook inactive' });
    }

    // Validate required fields
    if (!event.event || !event.email) {
      console.error('❌ Invalid webhook payload - missing required fields');
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }

    // Update webhook stats
    await pool.query(`
      UPDATE brevo_webhooks
      SET events_received = events_received + 1,
          last_event_at = NOW()
      WHERE webhook_token = ?
    `, [token]);

    // Process event based on type
    switch (event.event) {
      case 'opened':
      case 'unique_opened':
        await handleOpenEventWithUserId(event, userId);
        break;

      case 'click':
      case 'unique_click':
        await handleClickEventWithUserId(event, userId);
        break;

      case 'delivered':
        await handleDeliveredEventWithUserId(event, userId);
        break;

      case 'hard_bounce':
      case 'soft_bounce':
        await handleBounceEventWithUserId(event, userId);
        break;

      case 'unsubscribe':
      case 'unsubscribed':
        await handleUnsubscribeEventWithUserId(event, userId);
        break;

      case 'spam':
      case 'complaint':
        await handleSpamEventWithUserId(event, userId);
        break;

      default:
        console.log(`⚠️ Unhandled event type: ${event.event}`);
    }

    // Always return 200 OK to Brevo
    res.status(200).json({ received: true, event: event.event });

  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    res.status(200).json({ error: error.message, received: false });
  }
});

/**
 * Handle email open events
 */
async function handleOpenEvent(event) {
  try {
    if (!event.camp_id) {
      console.log('⚠️ Open event missing camp_id, skipping');
      return;
    }

    // Find user_id from campaign
    const [campaigns] = await pool.query(
      'SELECT user_id FROM brevo_campaigns WHERE brevo_campaign_id = ? LIMIT 1',
      [event.camp_id]
    );

    if (campaigns.length === 0) {
      console.log(`⚠️ Campaign ${event.camp_id} not found in database, will sync later`);
      return;
    }

    const userId = campaigns[0].user_id;

    // Convert Unix timestamp to MySQL datetime
    // Use ts_event (UTC) if available, otherwise parse date_event
    let openedAt;
    if (event.ts_event) {
      openedAt = new Date(event.ts_event * 1000);
    } else if (event.date_event) {
      openedAt = new Date(event.date_event);
    } else {
      openedAt = new Date();
    }

    // Check if this exact event already exists (prevent duplicates)
    const [existing] = await pool.query(
      `SELECT id FROM brevo_campaign_activity
       WHERE user_id = ? AND email = ? AND campaign_id = ?
       AND opened_at BETWEEN ? AND ?`,
      [
        userId,
        event.email,
        event.camp_id,
        new Date(openedAt.getTime() - 1000), // 1 second before
        new Date(openedAt.getTime() + 1000)  // 1 second after
      ]
    );

    if (existing.length > 0) {
      console.log(`⏭️ Duplicate open event, skipping`);
      return;
    }

    // Insert into brevo_campaign_activity table
    await pool.query(
      `INSERT INTO brevo_campaign_activity
       (user_id, email, campaign_id, campaign_name, opened_at)
       VALUES (?, ?, ?, ?, ?)`,
      [
        userId,
        event.email,
        event.camp_id,
        event['campaign name'] || 'Unknown Campaign',
        openedAt
      ]
    );

    console.log(`✅ Logged open: ${event.email} opened "${event['campaign name']}" at ${openedAt.toISOString()}`);

  } catch (error) {
    console.error('❌ Error handling open event:', error);
    throw error;
  }
}

/**
 * Handle link click events
 */
async function handleClickEvent(event) {
  try {
    if (!event.camp_id) {
      console.log('⚠️ Click event missing camp_id, skipping');
      return;
    }

    const [campaigns] = await pool.query(
      'SELECT user_id FROM brevo_campaigns WHERE brevo_campaign_id = ? LIMIT 1',
      [event.camp_id]
    );

    if (campaigns.length === 0) {
      console.log(`⚠️ Campaign ${event.camp_id} not found in database`);
      return;
    }

    const userId = campaigns[0].user_id;

    // Convert timestamp
    let clickedAt;
    if (event.ts_event) {
      clickedAt = new Date(event.ts_event * 1000);
    } else if (event.date_event) {
      clickedAt = new Date(event.date_event);
    } else {
      clickedAt = new Date();
    }

    // Check for duplicate
    const [existing] = await pool.query(
      `SELECT id FROM brevo_campaign_activity
       WHERE user_id = ? AND email = ? AND campaign_id = ?
       AND clicked_at BETWEEN ? AND ?`,
      [
        userId,
        event.email,
        event.camp_id,
        new Date(clickedAt.getTime() - 1000),
        new Date(clickedAt.getTime() + 1000)
      ]
    );

    if (existing.length > 0) {
      console.log(`⏭️ Duplicate click event, skipping`);
      return;
    }

    // Check if contact already has an open record for this campaign
    const [openRecord] = await pool.query(
      `SELECT id, opened_at FROM brevo_campaign_activity
       WHERE user_id = ? AND email = ? AND campaign_id = ?
       AND opened_at IS NOT NULL
       ORDER BY opened_at DESC
       LIMIT 1`,
      [userId, event.email, event.camp_id]
    );

    if (openRecord.length > 0 && !openRecord[0].clicked_at) {
      // Update existing open record with click
      await pool.query(
        `UPDATE brevo_campaign_activity
         SET clicked_at = ?
         WHERE id = ?`,
        [clickedAt, openRecord[0].id]
      );

      console.log(`✅ Updated existing record with click: ${event.email} clicked in "${event['campaign name']}"`);
    } else {
      // Insert new record (clicks imply opens, so set both timestamps)
      await pool.query(
        `INSERT INTO brevo_campaign_activity
         (user_id, email, campaign_id, campaign_name, opened_at, clicked_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          userId,
          event.email,
          event.camp_id,
          event['campaign name'] || 'Unknown Campaign',
          clickedAt, // Clicks imply opens
          clickedAt
        ]
      );

      console.log(`✅ Logged click: ${event.email} clicked "${event.URL || 'link'}" in "${event['campaign name']}"`);
    }

  } catch (error) {
    console.error('❌ Error handling click event:', error);
    throw error;
  }
}

/**
 * Handle delivered events (optional tracking)
 */
async function handleDeliveredEvent(event) {
  console.log(`📬 Delivered: ${event.email} - ${event['campaign name']}`);
  // Optional: Track delivery confirmations in separate table if needed
}

/**
 * Handle bounce events (optional tracking)
 */
async function handleBounceEvent(event) {
  console.log(`⚠️ Bounce (${event.event}): ${event.email} - ${event['campaign name']}`);

  // Optional: Update contact blacklist status
  if (event.event === 'hard_bounce') {
    try {
      await pool.query(
        `UPDATE brevo_contacts
         SET email_blacklisted = 1
         WHERE email = ?`,
        [event.email]
      );
      console.log(`✅ Marked ${event.email} as blacklisted due to hard bounce`);
    } catch (error) {
      console.error('Error updating blacklist status:', error);
    }
  }
}

/**
 * Handle unsubscribe events (optional tracking)
 */
async function handleUnsubscribeEvent(event) {
  console.log(`🚫 Unsubscribed: ${event.email} - ${event['campaign name']}`);

  // Optional: Update contact subscription status
  try {
    await pool.query(
      `UPDATE brevo_contacts
       SET email_blacklisted = 1
       WHERE email = ?`,
      [event.email]
    );
    console.log(`✅ Marked ${event.email} as unsubscribed`);
  } catch (error) {
    console.error('Error updating subscription status:', error);
  }
}

/**
 * Handle spam complaint events (optional tracking)
 */
async function handleSpamEvent(event) {
  console.log(`🚨 Spam complaint: ${event.email} - ${event['campaign name']}`);

  // Optional: Mark contact as blacklisted
  try {
    await pool.query(
      `UPDATE brevo_contacts
       SET email_blacklisted = 1
       WHERE email = ?`,
      [event.email]
    );
    console.log(`✅ Marked ${event.email} as blacklisted due to spam complaint`);
  } catch (error) {
    console.error('Error updating blacklist status:', error);
  }
}

/**
 * GET /api/webhooks/brevo/test
 * Test endpoint to verify webhook server is working
 */
router.get('/brevo/test', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Brevo webhook endpoint is active',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/webhooks/brevo/stats
 * Get webhook statistics (for debugging)
 */
router.get('/brevo/stats', async (req, res) => {
  try {
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
    `);

    const [recentEvents] = await pool.query(`
      SELECT email, campaign_name, opened_at, clicked_at, created_at
      FROM brevo_campaign_activity
      ORDER BY created_at DESC
      LIMIT 10
    `);

    res.json({
      stats: stats[0],
      recentEvents
    });
  } catch (error) {
    console.error('Error fetching webhook stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// TOKEN-BASED WEBHOOK HANDLERS
// These handlers accept userId directly instead of looking it up
// ============================================

/**
 * Handle email open events with known userId
 */
async function handleOpenEventWithUserId(event, userId) {
  try {
    // Convert timestamp
    let openedAt;
    if (event.ts_event) {
      openedAt = new Date(event.ts_event * 1000);
    } else if (event.date_event) {
      openedAt = new Date(event.date_event);
    } else {
      openedAt = new Date();
    }

    // Check for duplicates
    const [existing] = await pool.query(
      `SELECT id FROM brevo_campaign_activity
       WHERE user_id = ? AND email = ? AND campaign_id = ?
       AND opened_at BETWEEN ? AND ?`,
      [
        userId,
        event.email,
        event.camp_id || 'unknown',
        new Date(openedAt.getTime() - 1000),
        new Date(openedAt.getTime() + 1000)
      ]
    );

    if (existing.length > 0) {
      console.log(`⏭️ Duplicate open event, skipping`);
      return;
    }

    // Insert event
    await pool.query(
      `INSERT INTO brevo_campaign_activity
       (user_id, email, campaign_id, campaign_name, opened_at)
       VALUES (?, ?, ?, ?, ?)`,
      [
        userId,
        event.email,
        event.camp_id || 'unknown',
        event['campaign name'] || event.subject || 'Unknown Campaign',
        openedAt
      ]
    );

    console.log(`✅ Open logged: ${event.email} opened "${event['campaign name']}" (user ${userId})`);

  } catch (error) {
    console.error('❌ Error handling open event:', error);
    throw error;
  }
}

/**
 * Handle link click events with known userId
 */
async function handleClickEventWithUserId(event, userId) {
  try {
    // Convert timestamp
    let clickedAt;
    if (event.ts_event) {
      clickedAt = new Date(event.ts_event * 1000);
    } else if (event.date_event) {
      clickedAt = new Date(event.date_event);
    } else {
      clickedAt = new Date();
    }

    // Check if event exists, if so update it
    const [existing] = await pool.query(
      `SELECT id, opened_at FROM brevo_campaign_activity
       WHERE user_id = ? AND email = ? AND campaign_id = ?
       ORDER BY created_at DESC LIMIT 1`,
      [userId, event.email, event.camp_id || 'unknown']
    );

    if (existing.length > 0 && existing[0].opened_at) {
      // Update existing record with click
      await pool.query(
        `UPDATE brevo_campaign_activity
         SET clicked_at = ?
         WHERE id = ? AND clicked_at IS NULL`,
        [clickedAt, existing[0].id]
      );
      console.log(`✅ Click logged (updated existing): ${event.email} clicked link (user ${userId})`);
    } else {
      // Insert new record
      await pool.query(
        `INSERT INTO brevo_campaign_activity
         (user_id, email, campaign_id, campaign_name, clicked_at)
         VALUES (?, ?, ?, ?, ?)`,
        [
          userId,
          event.email,
          event.camp_id || 'unknown',
          event['campaign name'] || event.subject || 'Unknown Campaign',
          clickedAt
        ]
      );
      console.log(`✅ Click logged (new record): ${event.email} clicked link (user ${userId})`);
    }

  } catch (error) {
    console.error('❌ Error handling click event:', error);
    throw error;
  }
}

/**
 * Handle delivered events with known userId
 */
async function handleDeliveredEventWithUserId(event, userId) {
  console.log(`✅ Delivered: ${event.email} - ${event['campaign name']} (user ${userId})`);
  // Delivered events are informational only
}

/**
 * Handle bounce events with known userId
 */
async function handleBounceEventWithUserId(event, userId) {
  console.log(`⚠️ Bounce (${event.event}): ${event.email} - ${event['campaign name']} (user ${userId})`);

  // Update blacklist status for hard bounces
  if (event.event === 'hard_bounce') {
    try {
      await pool.query(
        `UPDATE brevo_contacts
         SET email_blacklisted = 1
         WHERE user_id = ? AND email = ?`,
        [userId, event.email]
      );
      console.log(`✅ Marked ${event.email} as blacklisted (user ${userId})`);
    } catch (error) {
      console.error('Error updating blacklist status:', error);
    }
  }
}

/**
 * Handle unsubscribe events with known userId
 */
async function handleUnsubscribeEventWithUserId(event, userId) {
  console.log(`🚫 Unsubscribe: ${event.email} (user ${userId})`);

  try {
    await pool.query(
      `UPDATE brevo_contacts
       SET email_blacklisted = 1
       WHERE user_id = ? AND email = ?`,
      [userId, event.email]
    );
    console.log(`✅ Marked ${event.email} as unsubscribed (user ${userId})`);
  } catch (error) {
    console.error('Error updating unsubscribe status:', error);
  }
}

/**
 * Handle spam complaint events with known userId
 */
async function handleSpamEventWithUserId(event, userId) {
  console.log(`⚠️ Spam complaint: ${event.email} (user ${userId})`);

  try {
    await pool.query(
      `UPDATE brevo_contacts
       SET email_blacklisted = 1
       WHERE user_id = ? AND email = ?`,
      [userId, event.email]
    );
    console.log(`✅ Marked ${event.email} as spam complainer (user ${userId})`);
  } catch (error) {
    console.error('Error updating spam status:', error);
  }
}

export default router;
