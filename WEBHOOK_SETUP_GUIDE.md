# Brevo Webhook Setup Guide

## ✅ Implementation Complete!

The webhook receiver endpoint has been successfully created and is now active at:
- **Local:** `http://localhost:5000/api/webhooks/brevo`
- **Production:** `https://your-domain.com/api/webhooks/brevo`

## Next Steps

### Step 1: Expose Your Webhook Endpoint

#### Option A: Production Deployment (Recommended)
1. Deploy your application to production server
2. Ensure the server has a public URL (e.g., `https://yourdomain.com`)
3. Your webhook URL will be: `https://yourdomain.com/api/webhooks/brevo`

#### Option B: Local Development with ngrok
If you want to test locally before deploying:

```bash
# Install ngrok (if not already installed)
npm install -g ngrok

# Start your local server (in one terminal)
npm run server:dev

# In another terminal, expose your local server
ngrok http 5000

# ngrok will provide a public URL like:
# https://abc123.ngrok.io
```

Your webhook URL will be: `https://abc123.ngrok.io/api/webhooks/brevo`

**Note:** ngrok URLs change each time you restart, so this is only for testing.

---

### Step 2: Configure Webhook in Brevo Dashboard

1. **Log into Brevo**
   - Go to https://app.brevo.com
   - Log in with your account

2. **Navigate to Webhooks**
   - Click on **Settings** (gear icon in top right)
   - In the left sidebar, find **Webhooks**
   - Click **Add a new webhook**

3. **Configure Webhook**
   - **URL:** Enter your webhook endpoint URL
     - Production: `https://yourdomain.com/api/webhooks/brevo`
     - Local (ngrok): `https://abc123.ngrok.io/api/webhooks/brevo`

   - **Events to track:** Check these boxes:
     - ✅ **opened** (when someone opens an email)
     - ✅ **click** (when someone clicks a link)
     - ⚠️ **delivered** (optional - for tracking deliveries)
     - ⚠️ **hard_bounce** (optional - for tracking hard bounces)
     - ⚠️ **soft_bounce** (optional - for tracking soft bounces)
     - ⚠️ **unsubscribe** (optional - for tracking unsubscribes)
     - ⚠️ **spam** (optional - for tracking spam complaints)

   - **Description:** "CRM Analytics Webhook"

   - **Save** the webhook

4. **Test the Webhook** (Optional)
   - Brevo provides a "Test" button
   - Click it to send a sample event
   - Check your server logs to see if the event was received

---

### Step 3: Verify Webhook is Working

#### Check Server Logs
After configuring the webhook, send a test email campaign and watch your server logs:

```bash
npm run server:dev
```

You should see log messages like:
```
📨 Brevo webhook received: {
  event: 'opened',
  email: 'test@example.com',
  campaign_id: 123,
  campaign: 'Test Campaign',
  timestamp: '2024-12-10 10:30:00'
}
✅ Logged open: test@example.com opened "Test Campaign" at 2024-12-10T10:30:00.000Z
```

#### Check Database
Verify events are being stored:

```sql
SELECT * FROM campaign_activity ORDER BY created_at DESC LIMIT 10;
```

You should see records with `opened_at` or `clicked_at` timestamps.

#### Check Webhook Stats
Visit: `http://localhost:5000/api/webhooks/brevo/stats`

This will show:
- Total events received
- Unique contacts tracked
- Recent events

---

### Step 4: Send Test Campaign

1. **Create a Test Campaign in Brevo**
   - Go to **Campaigns** → **Create an email campaign**
   - Choose a simple template
   - Add a test recipient (your email)
   - Include at least one link

2. **Send the Campaign**
   - Send to yourself or a test list
   - Wait a few minutes

3. **Open and Click**
   - Open the email in your inbox
   - Click a link in the email

4. **Verify Data Collection**
   - Check server logs for webhook events
   - Check database: `SELECT * FROM campaign_activity WHERE email = 'your-email@example.com'`
   - Visit Brevo Analytics dashboard: The Time-of-Day and Contact Intelligence dashboards should now show data!

---

## Troubleshooting

### Webhook Not Receiving Events

#### Problem: No events showing in logs
**Check:**
1. Is the webhook URL publicly accessible? (Test with curl)
2. Is the webhook configured correctly in Brevo dashboard?
3. Are the right events selected (opened, click)?
4. Did you send a test campaign?

**Debug:**
```bash
# Test endpoint manually
curl -X POST http://localhost:5000/api/webhooks/brevo \
  -H "Content-Type: application/json" \
  -d '{
    "event": "opened",
    "email": "test@example.com",
    "camp_id": 123,
    "campaign name": "Test Campaign",
    "ts_event": 1733888400,
    "date_event": "2024-12-10 10:00:00"
  }'
```

You should see:
```json
{"received":true,"event":"opened"}
```

#### Problem: Events received but not in database
**Check:**
1. Does the campaign exist in `brevo_campaigns` table?
   ```sql
   SELECT * FROM brevo_campaigns WHERE brevo_campaign_id = 123;
   ```
2. If not, sync campaigns first:
   - Go to Brevo dashboard in app
   - Click "Sync Data" button
   - This will fetch campaigns into database

#### Problem: "Campaign not found" in logs
**Solution:**
```sql
-- Manually insert campaign for testing
INSERT INTO brevo_campaigns (user_id, brevo_campaign_id, campaign_name, campaign_status)
VALUES (7, 123, 'Test Campaign', 'sent');
```

Then retry sending webhook.

---

## Dashboard Access

Once webhooks are flowing, access your analytics:

1. **Time-of-Day Dashboard**
   - Navigate to: Brevo → Time-of-Day tab
   - View heatmap of engagement by hour/day
   - See optimal send time recommendations

2. **Contact Intelligence Dashboard**
   - Navigate to: Brevo → Contact Intelligence tab
   - View engagement scores (0-100)
   - See top 20 engaged contacts
   - View engagement tier distribution

3. **Campaign Analytics**
   - Navigate to: Brevo → Campaign Analytics tab
   - Compare campaign performance
   - View trends over time

---

## Webhook Endpoints Reference

### Main Webhook Receiver
- **POST** `/api/webhooks/brevo`
- **Purpose:** Receives events from Brevo
- **Authentication:** None (public endpoint)
- **Events Handled:** opened, click, delivered, hard_bounce, soft_bounce, unsubscribe, spam

### Test Endpoint
- **GET** `/api/webhooks/brevo/test`
- **Purpose:** Verify webhook server is running
- **Response:** `{"status":"ok","message":"Brevo webhook endpoint is active","timestamp":"..."}`

### Stats Endpoint
- **GET** `/api/webhooks/brevo/stats`
- **Purpose:** View webhook collection statistics
- **Response:**
  ```json
  {
    "stats": {
      "total_events": 150,
      "unique_contacts": 45,
      "unique_campaigns": 5,
      "total_opens": 120,
      "total_clicks": 30,
      "first_event": "2024-12-10T10:00:00.000Z",
      "last_event": "2024-12-10T15:30:00.000Z"
    },
    "recentEvents": [...]
  }
  ```

---

## Security Considerations

### Current Implementation
- ✅ No sensitive data exposed (only email addresses, which are already in system)
- ✅ Graceful error handling (always returns 200 to prevent retries)
- ✅ Duplicate prevention (checks for existing events)
- ✅ User-scoped data (foreign key constraints)

### Optional Security Enhancements

#### IP Whitelist (Future)
```javascript
// Add Brevo webhook IPs to whitelist
const BREVO_WEBHOOK_IPS = [
  // Get from Brevo documentation
];
```

#### Webhook Secret (If Brevo Supports)
Check if Brevo includes signature in headers for verification.

---

## What Happens Now?

### Data Collection Timeline
- **Immediate:** Webhooks start capturing events as they happen
- **1 hour:** Enough data for initial testing
- **1 day:** Time-of-day patterns start to emerge
- **1 week:** Reliable engagement scoring
- **1 month:** Full historical trending available

### Dashboard Evolution
As data accumulates:
- ✅ **Day 1:** Top engaged contacts appear
- ✅ **Day 3:** Time-of-day heatmap shows patterns
- ✅ **Week 1:** Engagement scores become reliable
- ✅ **Week 2:** Can identify optimal send times
- ✅ **Month 1:** Full trending and predictions possible

---

## Maintenance

### Monitor Webhook Health
```bash
# Check recent events
curl http://localhost:5000/api/webhooks/brevo/stats

# Check database
SELECT COUNT(*) as events_today
FROM campaign_activity
WHERE DATE(created_at) = CURDATE();
```

### Webhook Logs
Watch for these log patterns:
- ✅ `📨 Brevo webhook received` - Event received
- ✅ `✅ Logged open/click` - Successfully stored
- ⚠️ `⚠️ Campaign not found` - Need to sync campaigns
- ⏭️ `⏭️ Duplicate event` - Duplicate prevention working
- ❌ `❌ Error` - Something went wrong

---

## Support

### Common Issues
1. **No events appearing:** Check webhook URL in Brevo dashboard
2. **Campaign not found:** Sync campaigns from Brevo first
3. **Duplicate events:** Normal - system prevents duplicates
4. **Missing timestamps:** Check Brevo event payload structure

### Need Help?
- Check `BREVO_WEBHOOK_IMPLEMENTATION_PLAN.md` for detailed docs
- Review server logs for error messages
- Test with manual curl commands (see Troubleshooting section)

---

## Success Checklist

- [ ] Webhook endpoint created (✅ Done!)
- [ ] Webhook registered in server (✅ Done!)
- [ ] Endpoint tested locally (✅ Done!)
- [ ] Webhook configured in Brevo dashboard
- [ ] Test campaign sent
- [ ] Events appearing in server logs
- [ ] Data visible in database
- [ ] Dashboards showing data
- [ ] Production deployment complete

**Current Status:** Ready for Brevo configuration (Steps 2-4)

---

## Quick Start (TL;DR)

1. **Expose endpoint:**
   - Production: Deploy app
   - Testing: Run `ngrok http 5000`

2. **Configure in Brevo:**
   - Settings → Webhooks → Add new
   - URL: `https://your-domain.com/api/webhooks/brevo`
   - Events: opened, click

3. **Test:**
   - Send campaign from Brevo
   - Open email + click link
   - Check logs + database
   - View dashboards

4. **Done!**
   - Analytics now real-time
   - Data accumulates automatically
   - Dashboards update live

---

**Webhook implementation complete! Ready for production.** 🎉
