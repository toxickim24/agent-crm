# Brevo (Sendinblue) Integration - Complete Implementation Guide

## Overview
This guide provides step-by-step instructions for integrating Brevo as a **read-only** email provider alongside your existing Mailchimp integration.

**Key Principles:**
- ✅ READ data FROM Brevo
- ❌ NO data pushed TO Brevo
- ✅ Cache data locally for performance
- ✅ Mirror Mailchimp integration structure
- ✅ Granular permission control

---

## Table of Contents
1. [Installation Steps](#installation-steps)
2. [Backend Integration](#backend-integration)
3. [Frontend Integration](#frontend-integration)
4. [Permission Management](#permission-management)
5. [Testing Guide](#testing-guide)
6. [Multi-Provider Strategy](#multi-provider-strategy)

---

## Installation Steps

### Step 1: Run Database Migrations

```bash
# 1. Create Brevo tables
node server/migrations/createBrevoTables.js

# 2. Add Brevo permissions
node server/migrations/addBrevoPermissions.js

# Verify tables were created
```

Expected output:
```
✅ Brevo tables created successfully!
Created tables: brevo_lists, brevo_contacts, brevo_campaigns, brevo_sync_log
✅ Brevo permissions added successfully!
```

### Step 2: Register Brevo Routes

Edit `server/index.js` and add:

```javascript
// Add at the top with other imports
import brevoRoutes from './routes/brevo.js';

// Add with other route registrations
app.use('/api/brevo', brevoRoutes);
```

**Complete server/index.js route section:**
```javascript
// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/lead-types', leadTypesRoutes);
app.use('/api/statuses', statusesRoutes);
app.use('/api/api-keys', apiKeysRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/mailers', mailersRoutes);
app.use('/api/mailchimp', mailchimpRoutes);
app.use('/api/brevo', brevoRoutes);  // ← Add this line
```

### Step 3: Install Required npm Packages

The Brevo integration uses `axios` which is already in your dependencies. No new packages needed!

### Step 4: Restart Server

```bash
pm2 restart agent-crm
# or in development
npm run server:dev
```

---

## Backend Integration

### API Endpoints Reference

All endpoints require authentication and appropriate permissions.

#### Account & Settings
- `GET /api/brevo/account` - Get account info
- `POST /api/brevo/settings` - Save API key (requires `brevo_edit_settings`)

#### Lists
- `GET /api/brevo/lists` - Get lists
- `GET /api/brevo/lists?refresh=true` - Fetch fresh from Brevo

#### Contacts
- `GET /api/brevo/contacts` - Get contacts
- `GET /api/brevo/contacts?refresh=true` - Fetch fresh from Brevo
- `GET /api/brevo/contacts?listId=123` - Filter by list
- `GET /api/brevo/contacts/count` - Get total count

#### Campaigns
- `GET /api/brevo/campaigns` - Get campaigns
- `GET /api/brevo/campaigns?refresh=true` - Fetch fresh from Brevo
- `GET /api/brevo/campaigns/:id` - Get campaign details

#### Statistics
- `GET /api/brevo/stats/overview` - Overall stats
- `GET /api/brevo/stats/recent` - Recent campaign performance

#### Export
- `GET /api/brevo/export/contacts/csv` - Export contacts
- `GET /api/brevo/export/campaigns/csv` - Export campaigns

#### Sync History
- `GET /api/brevo/sync-history` - View sync logs

### Testing API Endpoints

```bash
# 1. Test account endpoint (requires auth token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:5000/api/brevo/account

# 2. Save API key
curl -X POST \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"brevo_api_key":"YOUR_BREVO_API_KEY"}' \
     http://localhost:5000/api/brevo/settings

# 3. Fetch lists
curl -H "Authorization: Bearer YOUR_TOKEN" \
     "http://localhost:5000/api/brevo/lists?refresh=true"

# 4. Get cached contacts
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:5000/api/brevo/contacts
```

---

## Frontend Integration

### Step 1: Update Navigation Menu

Edit your main navigation component (likely `src/components/Navigation.jsx` or similar):

```jsx
// Add Brevo icons import
import { Mail } from 'lucide-react';

// In your navigation items, add:
{user.permissions.mailchimp && (
  <NavLink to="/emails-mailchimp" icon={<Mail />}>
    Emails (Mailchimp)
  </NavLink>
)}

{user.permissions.brevo && (
  <NavLink to="/emails-brevo" icon={<Mail />}>
    Emails (Brevo)
  </NavLink>
)}
```

### Step 2: Create React Component Files

Create these files in `src/pages/brevo/`:

```bash
mkdir -p src/pages/brevo
cd src/pages/brevo
```

Required components:
1. `BrevoDashboard.jsx` - Main dashboard with overview
2. `BrevoContacts.jsx` - View contacts (read-only)
3. `BrevoCampaigns.jsx` - List campaigns
4. `BrevoCampaignDetails.jsx` - Campaign analytics
5. `BrevoSettings.jsx` - API settings page

---

## Frontend Components

### 1. BrevoDashboard.jsx

