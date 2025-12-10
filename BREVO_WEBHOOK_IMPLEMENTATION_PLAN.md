# Brevo Webhook Integration - Implementation Plan

## Executive Summary

✅ **CONFIRMED:** Brevo marketing webhooks provide exactly the data we need!

### Available Webhook Events
- ✅ **Opened** - Email open events with timestamps
- ✅ **Clicked** - Link click events with URLs and timestamps
- ✅ **Delivered** - Successful delivery confirmation
- ✅ **Hard Bounced** - Permanent delivery failures
- ✅ **Soft Bounced** - Temporary delivery failures
- ✅ **Unsubscribe** - Opt-out events
- ✅ **Marked as Spam** - Spam complaints

### Webhook Payload Structure

#### Opened Event
```json
{
  "id": 1239108,
  "camp_id": 960,
  "email": "test@example.com",
  "campaign name": "My First Campaign",
  "date_sent": "2024-11-13 17:03:03",
  "date_event": "2024-12-13 10:36:06",
  "event": "opened",
  "tag": "",
  "segment_ids": [1, 10],
  "ts": 1734082566,
  "ts_event": 1734082566,
  "ts_sent": 1731513783
}
```

#### Clicked Event
```json
{
  "id": 1239108,
  "camp_id": 960,
  "email": "test@example.com",
  "campaign name": "Name of campaign",
  "date_sent": "2024-11-13 17:03:03",
  "date_event": "2024-12-13 10:36:06",
  "URL": "https://example.com/link",
  "event": "click",
  "ts": 1734082566,
  "ts_event": 1734082566,
  "ts_sent": 1731513783
}
```

### Key Data Points Available
- ✅ **Email address** (`email`)
- ✅ **Campaign ID** (`camp_id`)
- ✅ **Campaign name** (`campaign name`)
- ✅ **Event timestamp** (`ts_event` - Unix timestamp in UTC)
- ✅ **Event date** (`date_event` - Local timezone)
- ✅ **Sent date** (`date_sent`, `ts_sent`)
- ✅ **Event type** (`event`)
- ✅ **Clicked URL** (click events only)

---

## Implementation Plan

### Phase 1: Webhook Receiver (Week 1)

#### Step 1.1: Create Webhook Endpoint
**File:** `server/routes/webhooks.js`

```javascript
import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

/**
 * POST /api/webhooks/brevo
 * Receive Brevo marketing webhook events
 *
 * NO AUTHENTICATION - Webhooks come from Brevo servers
 * Security: Validate source IP or use webhook secret
 */
router.post('/brevo', async (req, res) => {
  try {
    const event = req.body;

    console.log('📨 Received Brevo webhook:', {
      event: event.event,
      email: event.email,
      campaign: event['campaign name'],
      timestamp: event.date_event
    });

    // Validate required fields
    if (!event.event || !event.email || !event.camp_id) {
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }

    // Process event based on type
    switch (event.event) {
      case 'opened':
        await handleOpenEvent(event);
        break;
      case 'click':
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
        await handleUnsubscribeEvent(event);
        break;
      default:
        console.log(`⚠️ Unhandled event type: ${event.event}`);
    }

    // Always return 200 OK to Brevo
    res.status(200).json({ received: true });

  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    // Still return 200 to prevent Brevo from retrying
    res.status(200).json({ error: error.message });
  }
});

/**
 * Handle email open events
 */
async function handleOpenEvent(event) {
  try {
    // Find user_id from campaign
    const [campaigns] = await pool.query(
      'SELECT user_id FROM brevo_campaigns WHERE brevo_campaign_id = ? LIMIT 1',
      [event.camp_id]
    );

    if (campaigns.length === 0) {
      console.log(`⚠️ Campaign ${event.camp_id} not found in database`);
      return;
    }

    const userId = campaigns[0].user_id;

    // Convert Unix timestamp to MySQL datetime
    const openedAt = new Date(event.ts_event * 1000);

    // Insert into campaign_activity table
    await pool.query(
      `INSERT INTO campaign_activity
       (user_id, email, campaign_id, campaign_name, opened_at)
       VALUES (?, ?, ?, ?, ?)`,
      [
        userId,
        event.email,
        event.camp_id,
        event['campaign name'],
        openedAt
      ]
    );

    console.log(`✅ Logged open: ${event.email} opened "${event['campaign name']}"`);

  } catch (error) {
    console.error('Error handling open event:', error);
    throw error;
  }
}

/**
 * Handle link click events
 */
async function handleClickEvent(event) {
  try {
    const [campaigns] = await pool.query(
      'SELECT user_id FROM brevo_campaigns WHERE brevo_campaign_id = ? LIMIT 1',
      [event.camp_id]
    );

    if (campaigns.length === 0) {
      console.log(`⚠️ Campaign ${event.camp_id} not found in database`);
      return;
    }

    const userId = campaigns[0].user_id;
    const clickedAt = new Date(event.ts_event * 1000);

    // Check if this email already has an open record for this campaign
    // If not, also record an open (clicks imply opens)
    const [existing] = await pool.query(
      `SELECT id FROM campaign_activity
       WHERE user_id = ? AND email = ? AND campaign_id = ? AND opened_at IS NOT NULL
       LIMIT 1`,
      [userId, event.email, event.camp_id]
    );

    if (existing.length === 0) {
      // No open recorded yet, add one
      await pool.query(
        `INSERT INTO campaign_activity
         (user_id, email, campaign_id, campaign_name, opened_at, clicked_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, event.email, event.camp_id, event['campaign name'], clickedAt, clickedAt]
      );
    } else {
      // Update existing record with click
      await pool.query(
        `UPDATE campaign_activity
         SET clicked_at = ?
         WHERE user_id = ? AND email = ? AND campaign_id = ?
         AND clicked_at IS NULL`,
        [clickedAt, userId, event.email, event.camp_id]
      );

      // If already clicked, insert new click record
      if (await checkAlreadyClicked(userId, event.email, event.camp_id)) {
        await pool.query(
          `INSERT INTO campaign_activity
           (user_id, email, campaign_id, campaign_name, clicked_at)
           VALUES (?, ?, ?, ?, ?)`,
          [userId, event.email, event.camp_id, event['campaign name'], clickedAt]
        );
      }
    }

    console.log(`✅ Logged click: ${event.email} clicked "${event.URL}" in "${event['campaign name']}"`);

  } catch (error) {
    console.error('Error handling click event:', error);
    throw error;
  }
}

async function checkAlreadyClicked(userId, email, campaignId) {
  const [result] = await pool.query(
    `SELECT COUNT(*) as count FROM campaign_activity
     WHERE user_id = ? AND email = ? AND campaign_id = ? AND clicked_at IS NOT NULL`,
    [userId, email, campaignId]
  );
  return result[0].count > 0;
}

/**
 * Handle delivered events
 */
async function handleDeliveredEvent(event) {
  // Optional: Track delivery confirmations
  console.log(`✅ Delivered: ${event.email} - ${event['campaign name']}`);
}

/**
 * Handle bounce events
 */
async function handleBounceEvent(event) {
  // Optional: Update contact status
  console.log(`⚠️ Bounce (${event.event}): ${event.email} - ${event['campaign name']}`);
}

/**
 * Handle unsubscribe events
 */
async function handleUnsubscribeEvent(event) {
  // Optional: Update contact subscription status
  console.log(`🚫 Unsubscribed: ${event.email} - ${event['campaign name']}`);
}

export default router;
```

#### Step 1.2: Register Webhook Route
**File:** `server/index.js`

```javascript
// Add to imports
import webhookRoutes from './routes/webhooks.js';

// Add before other routes (webhooks should be early in middleware chain)
app.use('/api/webhooks', webhookRoutes);
```

#### Step 1.3: Update campaign_activity Table
**Current schema is already correct!** ✅

```sql
-- Already created in createCampaignActivityTable.js
CREATE TABLE campaign_activity (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  email VARCHAR(255) NOT NULL,
  campaign_id VARCHAR(255),
  campaign_name VARCHAR(255),
  opened_at DATETIME,
  clicked_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_email (user_id, email),
  INDEX idx_opened_at (opened_at),
  INDEX idx_clicked_at (clicked_at),
  INDEX idx_campaign (campaign_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

### Phase 2: Configure Brevo Webhooks (Week 1)

#### Step 2.1: Create Webhook in Brevo Dashboard

**Manual Setup:**
1. Log into Brevo account
2. Go to **Settings** → **Webhooks**
3. Click **Create a webhook**
4. Configure:
   - **URL:** `https://your-domain.com/api/webhooks/brevo`
   - **Events to track:**
     - ✅ Opened
     - ✅ Clicked
     - ⚠️ Delivered (optional)
     - ⚠️ Hard Bounced (optional)
     - ⚠️ Soft Bounced (optional)
     - ⚠️ Unsubscribe (optional)

#### Step 2.2: Expose Webhook Endpoint

**Option A: Production Server**
- Deploy to production server with public URL
- URL: `https://your-domain.com/api/webhooks/brevo`

**Option B: Local Development (Using ngrok)**
```bash
# Install ngrok
npm install -g ngrok

# Start your local server
npm run server:dev

# In another terminal, expose local server
ngrok http 5000

# Copy the https URL (e.g., https://abc123.ngrok.io)
# Use: https://abc123.ngrok.io/api/webhooks/brevo
```

#### Step 2.3: Test Webhook
Brevo provides webhook testing in dashboard:
1. Send test event from Brevo
2. Check server logs for incoming webhook
3. Verify data inserted into `campaign_activity` table

---

### Phase 3: Enable Analytics Features (Week 2)

#### Step 3.1: Verify Data Collection
```sql
-- Check if webhook data is being received
SELECT COUNT(*) as total_events,
       COUNT(DISTINCT email) as unique_contacts,
       COUNT(opened_at) as opens,
       COUNT(clicked_at) as clicks
FROM campaign_activity
WHERE user_id = ?;

-- Check time-of-day distribution
SELECT HOUR(opened_at) as hour, COUNT(*) as opens
FROM campaign_activity
WHERE user_id = ? AND opened_at IS NOT NULL
GROUP BY HOUR(opened_at)
ORDER BY hour;
```

#### Step 3.2: Update Analytics Service
**File:** `server/services/brevoAnalyticsService.js`

**Already implemented!** ✅
- `getTimeOfDayAnalysis()` - Uses `campaign_activity` table
- `getEngagementOverview()` - Uses `campaign_activity` table
- `getTopContacts()` - Uses `campaign_activity` table

**These will automatically work once webhook data flows in!**

#### Step 3.3: Enable Dashboards
**File:** `src/pages/brevo/BrevoAnalytics.jsx`

**Already enabled!** ✅
- Time-of-Day tab functional
- Contact Intelligence tab functional
- Campaign Analytics tab functional

---

### Phase 4: Backfill Historical Data (Week 2)

**Challenge:** Webhooks only capture events going forward

**Solution:** Accept limitation - start fresh
- Explain to users: "Analytics available for campaigns sent after [webhook setup date]"
- Add banner: "Collecting engagement data... Check back in 7 days for insights"

**Alternative:** Try fetching historical events via API
```javascript
// Check if Brevo has events API endpoint
// GET /v3/emailCampaigns/{campaignId}/events (research needed)
```

---

## Security Considerations

### Webhook Security

#### Option 1: IP Whitelist (Recommended)
```javascript
const BREVO_WEBHOOK_IPS = [
  // Add Brevo's webhook source IPs
  // Find in Brevo documentation
];

router.post('/brevo', (req, res, next) => {
  const clientIp = req.ip || req.connection.remoteAddress;

  if (!BREVO_WEBHOOK_IPS.includes(clientIp)) {
    console.warn(`⚠️ Webhook from unauthorized IP: ${clientIp}`);
    return res.status(403).json({ error: 'Unauthorized' });
  }

  next();
});
```

#### Option 2: Webhook Secret (If Brevo Supports)
```javascript
// Check if Brevo includes signature in headers
router.post('/brevo', (req, res, next) => {
  const signature = req.headers['x-brevo-signature'];
  const webhookSecret = process.env.BREVO_WEBHOOK_SECRET;

  if (!verifySignature(req.body, signature, webhookSecret)) {
    return res.status(403).json({ error: 'Invalid signature' });
  }

  next();
});
```

### Data Privacy
- ✅ No PII beyond email addresses (already stored)
- ✅ Compliant with existing data model
- ✅ User-scoped data (GDPR-friendly)

---

## Testing Plan

### Unit Tests
```javascript
// tests/webhooks/brevo.test.js
describe('Brevo Webhook Handler', () => {
  it('should process opened events', async () => {
    const payload = {
      event: 'opened',
      email: 'test@example.com',
      camp_id: 123,
      'campaign name': 'Test Campaign',
      ts_event: Math.floor(Date.now() / 1000)
    };

    const res = await request(app)
      .post('/api/webhooks/brevo')
      .send(payload);

    expect(res.status).toBe(200);

    // Verify database insert
    const [records] = await pool.query(
      'SELECT * FROM campaign_activity WHERE email = ?',
      ['test@example.com']
    );

    expect(records.length).toBe(1);
    expect(records[0].opened_at).not.toBeNull();
  });

  it('should process clicked events', async () => {
    // Similar test for clicks
  });

  it('should handle invalid payloads gracefully', async () => {
    const res = await request(app)
      .post('/api/webhooks/brevo')
      .send({ invalid: 'data' });

    expect(res.status).toBe(400);
  });
});
```

### Integration Tests
1. **Manual Test:** Send test campaign from Brevo
2. **Verify:** Webhook receives open/click events
3. **Check:** Data appears in dashboard within seconds
4. **Validate:** Time-of-day heatmap updates

---

## Deployment Checklist

- [ ] Create `server/routes/webhooks.js`
- [ ] Register webhook route in `server/index.js`
- [ ] Verify `campaign_activity` table exists (already done ✅)
- [ ] Deploy to production server with public URL
- [ ] Configure webhook in Brevo dashboard
- [ ] Test with sample campaign
- [ ] Verify data flow: Brevo → Webhook → Database → Dashboard
- [ ] Monitor for 24 hours
- [ ] Document webhook URL for team
- [ ] Add error alerting (optional)

---

## Estimated Timeline

| Phase | Duration | Effort |
|-------|----------|--------|
| **Phase 1:** Webhook receiver code | 4-6 hours | 🟢 Easy |
| **Phase 2:** Brevo configuration | 1-2 hours | 🟢 Easy |
| **Phase 3:** Enable dashboards | 1 hour | 🟢 Easy |
| **Phase 4:** Testing & validation | 2-3 hours | 🟡 Medium |
| **Total** | **8-12 hours** | **1.5 days** |

---

## Success Metrics

After 7 days of webhook collection:
- ✅ 100+ engagement events captured
- ✅ Time-of-day heatmap populated
- ✅ Contact engagement scores calculated
- ✅ Top engaged contacts list showing real data
- ✅ Zero webhook errors in logs

---

## Rollback Plan

If webhooks cause issues:
1. Disable webhook in Brevo dashboard
2. Delete webhook route registration from `server/index.js`
3. Analytics will show "No data" (graceful degradation)
4. No data loss - existing features unaffected

---

## Next Steps

1. **Today:** Create webhook endpoint code
2. **Tomorrow:** Deploy to test environment
3. **Day 3:** Configure Brevo webhook
4. **Day 4:** Send test campaign and verify
5. **Day 5-7:** Monitor and validate
6. **Week 2:** Enable for production users

---

## Documentation Links

- **Brevo Webhook Docs:** https://developers.brevo.com/docs/marketing-webhooks
- **Getting Started:** https://developers.brevo.com/docs/how-to-use-webhooks
- **Create Webhook API:** https://developers.brevo.com/reference/createwebhook

---

## Conclusion

✅ **Webhooks are 100% viable for our use case!**

The exact data we need is available through Brevo's marketing webhooks. Implementation is straightforward and can be completed in 1.5 days.

This unlocks:
- 🔥 Time-of-day engagement heatmaps
- 🔥 Individual contact engagement tracking
- 🔥 Accurate engagement scoring
- 🔥 Top engaged contacts leaderboard
- 🔥 Real-time analytics updates

**Recommendation:** Proceed with webhook implementation immediately. This is the missing piece that makes all Phase 1 features fully functional.
