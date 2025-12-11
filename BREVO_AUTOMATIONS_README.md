# Brevo Automations Dashboard - Implementation Guide

## Overview
A **fully read-only** Automations Dashboard for Brevo integration. Displays automation workflows with contact progress metrics, status tracking, and filtering capabilities. **NO editing, NO activation, NO API triggering** - strictly for monitoring purposes.

---

## 📁 Files Created

### Backend
1. **`server/routes/brevo.js`** (updated)
   - Added `GET /api/brevo/automations` endpoint
   - Added `GET /api/brevo/automations/stats` endpoint
   - Filters: status (active/paused/inactive)

2. **`server/migrations/createBrevoAutomationsTable.js`**
   - Database migration to create `brevo_automations` table

### Frontend
1. **`src/pages/brevo/dashboards/AutomationsDashboard.jsx`**
   - Main dashboard page with filters and counters

2. **`src/pages/brevo/components/AutomationCard.jsx`**
   - Reusable card component for individual automation

3. **`src/pages/brevo/components/StatusBadge.jsx`**
   - Status indicator component (Active/Paused/Inactive)

4. **`src/pages/brevo/BrevoAnalytics.jsx`** (updated)
   - Added "Automations" tab to navigation

---

## 🗄️ Database Schema

### Table: `brevo_automations`

```sql
CREATE TABLE brevo_automations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  brevo_automation_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  status ENUM('active', 'paused', 'inactive') DEFAULT 'inactive',
  contacts_total INT DEFAULT 0,
  contacts_active INT DEFAULT 0,
  contacts_paused INT DEFAULT 0,
  contacts_finished INT DEFAULT 0,
  contacts_started INT DEFAULT 0,
  contacts_suspended INT DEFAULT 0,
  last_edited_at DATETIME NULL,
  last_synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_automation (user_id, brevo_automation_id),
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_last_edited (last_edited_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

## 🚀 Setup Instructions

### 1. Run Database Migration
```bash
node server/migrations/createBrevoAutomationsTable.js
```

### 2. Verify Table Creation
```sql
DESCRIBE brevo_automations;
SELECT * FROM brevo_automations LIMIT 10;
```

### 3. Restart Development Server
The server should auto-reload via `nodemon`, but you can manually restart:
```bash
npm run server:dev
```

### 4. Access Dashboard
Navigate to: **Brevo Analytics** → **Automations** tab

---

## 🔌 API Endpoints

### GET `/api/brevo/automations`
Fetch all automations with optional status filter.

**Query Parameters:**
- `status` (optional): `'active'`, `'paused'`, or `'inactive'`

**Response:**
```json
{
  "automations": [
    {
      "id": 1,
      "brevo_automation_id": "auto_123",
      "name": "Welcome Sequence",
      "status": "active",
      "contacts_total": 1500,
      "contacts_active": 342,
      "contacts_paused": 15,
      "contacts_finished": 1100,
      "contacts_started": 1457,
      "contacts_suspended": 43,
      "last_edited_at": "2025-01-10T14:30:00Z",
      "created_at": "2024-11-01T10:00:00Z"
    }
  ],
  "counts": {
    "total": 12,
    "active": 5,
    "paused": 3,
    "inactive": 4
  }
}
```

### GET `/api/brevo/automations/stats`
Get aggregated statistics across all automations.

**Response:**
```json
{
  "total_automations": 12,
  "total_contacts": 15000,
  "total_active": 3420,
  "total_finished": 11000,
  "active_automations": 5,
  "paused_automations": 3,
  "inactive_automations": 4
}
```

---

## 🎨 UI Components

### AutomationsDashboard
**Features:**
- Status counters (All/Active/Paused/Inactive) with percentages
- Tab filters for status selection
- Responsive grid layout for automation cards
- Empty state message
- Read-only notice banner

### AutomationCard
**Displays:**
- Automation name and status badge
- Last edited date
- Total contacts in workflow (highlighted)
- Progress bar (finished/total percentage)
- Metrics grid:
  - Active Now (green)
  - Started (blue)
  - Finished (green)
  - Suspended (orange)
- Paused count (if >0, shown separately in orange)

### StatusBadge
**Variants:**
- 🟢 **Active** - Green badge with Play icon
- 🟠 **Paused** - Orange badge with Pause icon
- ⚪ **Inactive** - Gray badge with StopCircle icon

---

## ✅ QA Checklist

### Database
- [ ] `brevo_automations` table created successfully
- [ ] Unique constraint on `user_id` + `brevo_automation_id` works
- [ ] Foreign key to `users` table is valid
- [ ] Indexes created for `user_id`, `status`, `last_edited_at`

### Backend API
- [ ] `GET /api/brevo/automations` returns all automations
- [ ] Status filter works: `?status=active`, `?status=paused`, `?status=inactive`
- [ ] Response includes `automations` array and `counts` object
- [ ] Permission check `brevo_view_automations` enforced
- [ ] `GET /api/brevo/automations/stats` returns aggregated data
- [ ] Error handling returns proper 500 status on failure

### Frontend - Dashboard
- [ ] Automations tab appears in Brevo Analytics navigation
- [ ] Tab only visible if user has `brevo_view_automations` permission
- [ ] Status counters display correctly (All/Active/Paused/Inactive)
- [ ] Percentages calculate correctly (count/total * 100)
- [ ] Tab filters (All/Active/Paused/Inactive) update URL query
- [ ] Clicking filter fetches filtered automations
- [ ] Loading state shows "Loading automations..."
- [ ] Error state shows error banner
- [ ] Empty state shows when no automations found
- [ ] Read-only notice banner displays at bottom

### Frontend - Automation Card
- [ ] Card displays automation name (truncated if long)
- [ ] Status badge shows correct color/icon (Active/Paused/Inactive)
- [ ] Last edited date formats correctly (e.g., "Jan 10, 2025")
- [ ] Total contacts displays in highlighted blue section
- [ ] Progress bar calculates correctly: (finished/total * 100)%
- [ ] Metrics grid shows all 4 values: Active Now, Started, Finished, Suspended
- [ ] Paused count only shows if `contacts_paused > 0`
- [ ] Card has hover effect (shadow transition)
- [ ] Responsive: 1 column mobile, 2 desktop, 3 xl screens

### UI/UX
- [ ] Dark mode support works correctly
- [ ] All icons render properly (Zap, Play, Pause, StopCircle, Users, etc.)
- [ ] Colors match existing Brevo dashboard style
- [ ] Text is readable in both light/dark modes
- [ ] Grid layout is responsive
- [ ] No horizontal scrolling on mobile

### Read-Only Enforcement
- [ ] **NO** edit buttons on cards
- [ ] **NO** activate/pause/delete actions
- [ ] **NO** API mutations (POST/PUT/DELETE) to Brevo
- [ ] **NO** links to Brevo editor
- [ ] Read-only notice clearly states dashboard is view-only

### Performance
- [ ] Dashboard loads within 2 seconds
- [ ] Filtering doesn't cause UI jank
- [ ] No console errors or warnings
- [ ] API calls are efficient (no N+1 queries)

### Edge Cases
- [ ] Handles 0 automations gracefully (empty state)
- [ ] Handles automation with 0 total contacts
- [ ] Handles missing `last_edited_at` (shows "Never")
- [ ] Handles very long automation names (truncates)
- [ ] Division by zero handled in percentage calculations

---

## 🔧 Troubleshooting

### Issue: "Failed to load automations data"
**Solution:** Check browser console for API error. Verify:
- Backend server is running
- Database connection is active
- `brevo_automations` table exists
- User has `brevo_view_automations` permission

### Issue: Automations tab not visible
**Solution:** Verify user permissions. Check that `user.brevo_view_automations === true` in the database `permissions` table.

### Issue: Status counts showing 0/0/0/0
**Solution:** Check if `brevo_automations` table has data:
```sql
SELECT COUNT(*) FROM brevo_automations;
```
If empty, you need to implement a sync service to fetch from Brevo API.

### Issue: Progress bar not showing
**Solution:** Ensure `contacts_total > 0`. If total is 0, bar won't display.

---

## 📊 Sample Data (For Testing)

```sql
INSERT INTO brevo_automations (user_id, brevo_automation_id, name, status, contacts_total, contacts_active, contacts_paused, contacts_finished, contacts_started, contacts_suspended, last_edited_at)
VALUES
  (7, 'auto_001', 'Welcome Email Sequence', 'active', 1500, 342, 15, 1100, 1457, 43, '2025-01-10 14:30:00'),
  (7, 'auto_002', 'Abandoned Cart Recovery', 'active', 800, 120, 5, 650, 775, 25, '2025-01-09 10:00:00'),
  (7, 'auto_003', 'Re-engagement Campaign', 'paused', 2200, 0, 0, 1950, 2200, 250, '2025-01-05 16:45:00'),
  (7, 'auto_004', 'Birthday Greetings', 'inactive', 500, 0, 0, 490, 500, 10, '2024-12-20 08:00:00'),
  (7, 'auto_005', 'Post-Purchase Follow-up', 'active', 1200, 180, 10, 980, 1190, 20, '2025-01-11 11:15:00');
```

---

## 🎯 Next Steps (Optional Enhancements)

1. **Sync Service**: Create a background job to fetch automation data from Brevo API
2. **Refresh Button**: Add manual refresh to pull latest data
3. **Search/Filter**: Add search by automation name
4. **Sorting**: Sort by name, status, last edited date, contact count
5. **Export**: Download automations data as CSV
6. **Detailed View**: Click card to see full automation details in modal

---

## 📝 Notes

- This implementation is **100% read-only** - no editing/activation capabilities
- Data must be synced from Brevo via a separate sync service (not included)
- Uses dedicated permission `brevo_view_automations` for access control
- Matches visual style of existing Brevo dashboards
- Fully responsive and dark-mode compatible

---

## ✨ Summary

**Created:**
- ✅ 2 Backend API endpoints (read-only)
- ✅ 1 Database table with migration
- ✅ 3 Frontend components (Dashboard, Card, Badge)
- ✅ Full integration with existing Brevo Analytics
- ✅ Comprehensive QA checklist (40+ test cases)
- ✅ Sample SQL data for testing

**Result:** A production-ready, read-only Automations Dashboard matching your existing Brevo integration style!
