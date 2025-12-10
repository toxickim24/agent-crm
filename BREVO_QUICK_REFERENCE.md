# Brevo Integration - Quick Reference Card

## 📁 File Structure

```
agent-crm/
├── server/
│   ├── migrations/
│   │   ├── createBrevoTables.js          ← Run first
│   │   └── addBrevoPermissions.js        ← Run second
│   ├── services/
│   │   └── brevoService.js               ← Core Brevo API logic
│   └── routes/
│       └── brevo.js                      ← Express API endpoints
│
├── src/
│   └── pages/
│       └── brevo/
│           └── BrevoDashboard.jsx        ← Main UI component
│
└── Documentation/
    ├── BREVO_INTEGRATION_GUIDE.md        ← Detailed guide
    ├── BREVO_IMPLEMENTATION_SUMMARY.md   ← Complete summary
    └── BREVO_QUICK_REFERENCE.md          ← This file
```

---

## ⚡ Quick Start (5 Minutes)

```bash
# 1. Run migrations
cd /var/www/agent-crm
node server/migrations/createBrevoTables.js
node server/migrations/addBrevoPermissions.js

# 2. Register routes in server/index.js
# Add: import brevoRoutes from './routes/brevo.js';
# Add: app.use('/api/brevo', brevoRoutes);

# 3. Restart server
pm2 restart agent-crm

# 4. Configure API key
curl -X POST http://localhost:5000/api/brevo/settings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"brevo_api_key":"YOUR_BREVO_API_KEY"}'

# 5. Test
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5000/api/brevo/lists?refresh=true"
```

---

## 🔌 API Endpoints Cheat Sheet

### Account & Settings
| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/brevo/account` | `brevo` | Get account info |
| POST | `/api/brevo/settings` | `brevo_edit_settings` | Save API key |

### Lists
| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/brevo/lists` | `brevo_view_lists` | Get cached lists |
| GET | `/api/brevo/lists?refresh=true` | `brevo_view_lists` | Fetch from Brevo |

### Contacts
| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/brevo/contacts` | `brevo_view_contacts` | Get cached contacts |
| GET | `/api/brevo/contacts?refresh=true` | `brevo_view_contacts` | Fetch from Brevo |
| GET | `/api/brevo/contacts?listId=123` | `brevo_view_contacts` | Filter by list |
| GET | `/api/brevo/contacts/count` | `brevo_view_contacts` | Get total count |

### Campaigns
| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/brevo/campaigns` | `brevo_view_campaigns` | Get cached campaigns |
| GET | `/api/brevo/campaigns?refresh=true` | `brevo_view_campaigns` | Fetch from Brevo |
| GET | `/api/brevo/campaigns/:id` | `brevo_view_campaigns` | Get campaign details |

### Statistics
| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/brevo/stats/overview` | `brevo_view_stats` | Overall stats |
| GET | `/api/brevo/stats/recent` | `brevo_view_stats` | Recent campaigns |

### Export
| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/brevo/export/contacts/csv` | `brevo_export_csv` | Export contacts |
| GET | `/api/brevo/export/campaigns/csv` | `brevo_export_csv` | Export campaigns |

### Sync History
| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/brevo/sync-history` | `brevo` | View sync logs |

---

## 🎯 Permission Matrix

| Permission | Description | Default | Admin Only |
|------------|-------------|---------|------------|
| `brevo` | Access Brevo tab | ✅ Yes | ❌ No |
| `brevo_view_contacts` | View contacts | ✅ Yes | ❌ No |
| `brevo_view_lists` | View lists | ✅ Yes | ❌ No |
| `brevo_view_campaigns` | View campaigns | ✅ Yes | ❌ No |
| `brevo_view_stats` | View statistics | ✅ Yes | ❌ No |
| `brevo_sync_data` | Sync/refresh data | ✅ Yes | ❌ No |
| `brevo_export_csv` | Export to CSV | ✅ Yes | ❌ No |
| `brevo_edit_settings` | Edit API settings | ❌ No | ✅ Yes |

---

## 💾 Database Tables Reference

### `brevo_lists`
Stores contact lists from Brevo
```sql
SELECT * FROM brevo_lists WHERE user_id = 1;
```

### `brevo_contacts`
Stores contacts from Brevo (read-only)
```sql
SELECT COUNT(*) FROM brevo_contacts WHERE user_id = 1;
```

### `brevo_campaigns`
Stores campaigns with statistics
```sql
SELECT campaign_name, open_rate, click_rate
FROM brevo_campaigns
WHERE user_id = 1 AND campaign_status = 'sent'
ORDER BY sent_date DESC;
```

### `brevo_sync_log`
Tracks all sync operations
```sql
SELECT sync_type, sync_status, records_synced, synced_at
FROM brevo_sync_log
WHERE user_id = 1
ORDER BY synced_at DESC
LIMIT 10;
```

---

## 🔧 Common Code Snippets

### Backend: Check Permission
```javascript
const checkBrevoPermission = (permissionKey) => {
  return async (req, res, next) => {
    const [permissions] = await pool.query(
      `SELECT ${permissionKey} FROM permissions WHERE user_id = ?`,
      [req.user.id]
    );

    if (!permissions[0][permissionKey]) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    next();
  };
};

router.get('/contacts', checkBrevoPermission('brevo_view_contacts'), handler);
```

### Frontend: Conditional Rendering
```jsx
import { useAuth } from '../../contexts/AuthContext';

const MyComponent = () => {
  const { user } = useAuth();

  return (
    <>
      {user.permissions?.brevo_view_contacts && (
        <button>View Contacts</button>
      )}

      {user.permissions?.brevo_edit_settings && (
        <button>Settings</button>
      )}
    </>
  );
};
```

### Service: Fetch and Cache
```javascript
// Fetch from Brevo and cache locally
const lists = await BrevoService.fetchLists(userId);

// Get from cache (fast)
const cachedLists = await BrevoService.getCachedLists(userId);

// Log sync operation
await BrevoService.logSync(userId, 'lists', 'success', lists.length);
```

---

## 🚨 Troubleshooting Quick Fixes

### Problem: API key invalid
```javascript
// Test key validity
const test = await BrevoService.testApiKey('YOUR_KEY');
console.log(test.valid); // true or false
```

### Problem: No data showing
```sql
-- Check if data is cached
SELECT COUNT(*) FROM brevo_campaigns WHERE user_id = 1;

-- Check last sync time
SELECT * FROM brevo_sync_log WHERE user_id = 1 ORDER BY synced_at DESC LIMIT 1;
```

### Problem: Permission denied
```sql
-- Check user permissions
SELECT brevo, brevo_view_contacts, brevo_view_campaigns
FROM permissions
WHERE user_id = 1;

-- Enable permissions
UPDATE permissions SET
  brevo = 1,
  brevo_view_contacts = 1,
  brevo_view_campaigns = 1
WHERE user_id = 1;
```

### Problem: Sync failing
```bash
# Check server logs
pm2 logs agent-crm --lines 50

# Check Brevo API status
curl -X GET https://api.brevo.com/v3/account \
  -H "api-key: YOUR_API_KEY"
```

---

## 📊 Read-Only Best Practices

### ✅ DO
- Cache data locally for fast access
- Provide manual "Sync" button
- Log all operations
- Check permissions on every route
- Validate API keys before saving

### ❌ DON'T
- Never write data TO Brevo
- Don't auto-sync on page load
- Don't log API keys
- Don't expose keys to frontend
- Don't skip permission checks

---

## 🎨 UI Component Pattern

```jsx
// Standard Brevo component structure
import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import API_BASE_URL from '../../config/api';
import { useAuth } from '../../contexts/AuthContext';

const BrevoComponent = () => {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (refresh = false) => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${API_BASE_URL}/brevo/endpoint${refresh ? '?refresh=true' : ''}`
      );
      setData(response.data);
      if (refresh) {
        toast.success('Data synced successfully');
      }
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={() => fetchData(true)}>Sync</button>
      {/* Render data */}
    </div>
  );
};
```

---

## 📚 Complete Documentation Links

1. **BREVO_IMPLEMENTATION_SUMMARY.md** - Full implementation guide
2. **BREVO_INTEGRATION_GUIDE.md** - Detailed technical specs
3. **BREVO_QUICK_REFERENCE.md** - This document

---

## ✨ Key Takeaways

1. **Read-Only Architecture** - Never pushes data to Brevo
2. **Multi-Provider Ready** - Mailchimp + Brevo coexist independently
3. **Granular Permissions** - 8 permission levels
4. **Local Caching** - Fast performance with cached data
5. **Sync Logging** - Full audit trail of operations

---

## 🚀 Next Steps After Implementation

1. ✅ Test all API endpoints
2. ✅ Create remaining React components
3. ✅ Update admin permissions UI
4. ✅ Add to navigation menu
5. ⭐ (Optional) Create unified dashboard
6. ⭐ (Optional) Set up background sync cron job

---

**Need help?** Review the complete guides:
- BREVO_IMPLEMENTATION_SUMMARY.md
- BREVO_INTEGRATION_GUIDE.md

**Ready to add another provider?** Follow the same pattern:
1. Create `provider_*` tables
2. Create `providerService.js`
3. Create `provider.js` routes
4. Add permissions
5. Build React components

**Multi-provider architecture makes scaling easy!** 🎉
