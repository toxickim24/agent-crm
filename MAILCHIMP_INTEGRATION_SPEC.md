# Complete Mailchimp Integration Specification
## Enterprise-Level Email Marketing & CRM Integration

**Version:** 1.0
**Date:** 2025-11-30
**Architecture:** Multi-API Key Configuration per Lead Type

---

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Database Schema](#database-schema)
3. [Feature Categories](#feature-categories)
4. [API Endpoints](#api-endpoints)
5. [UI Components](#ui-components)
6. [Integration Workflow](#integration-workflow)

---

## System Architecture

### Multi-API Key Configuration Strategy
Each **Lead Type** (Probate, Refi, Equity, Permit, Home) can have its own dedicated Mailchimp account configuration:

- **Separate API Keys per Lead Type**: Each lead type maintains independent Mailchimp API credentials
- **Isolated Audiences**: Each lead type syncs to its own Mailchimp audience list
- **Lead-Type-Specific Campaigns**: Campaigns are segmented by lead type automatically
- **Permission-Based Access**: Users with restricted lead type access only see their authorized data

### Configuration Hierarchy
```
User (Client)
  └── Lead Types (Probate, Refi, Equity, Permit, Home)
       └── Mailchimp Configuration
            ├── API Key
            ├── Server Prefix (us1, us2, etc.)
            ├── Default Audience ID
            ├── Webhook Secret
            └── OAuth Token (optional)
```

---

## Database Schema

### New Table: `mailchimp_configs`
```sql
CREATE TABLE mailchimp_configs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  lead_type_id INT NOT NULL,

  -- Authentication
  api_key VARCHAR(255),
  server_prefix VARCHAR(50),
  oauth_access_token TEXT,
  oauth_refresh_token TEXT,
  oauth_expires_at TIMESTAMP NULL,

  -- Default Settings
  default_audience_id VARCHAR(100),
  default_from_name VARCHAR(255),
  default_from_email VARCHAR(255),
  default_reply_to VARCHAR(255),

  -- Webhook Configuration
  webhook_url VARCHAR(500),
  webhook_secret VARCHAR(255),
  webhook_events JSON, -- ['subscribe', 'unsubscribe', 'profile', 'cleaned', 'campaign']

  -- Sync Settings
  auto_sync_enabled BOOLEAN DEFAULT 0,
  sync_frequency_minutes INT DEFAULT 60,
  last_sync_at TIMESTAMP NULL,
  sync_status ENUM('idle', 'syncing', 'error') DEFAULT 'idle',
  sync_error TEXT NULL,

  -- Features Enabled
  enable_campaigns BOOLEAN DEFAULT 1,
  enable_automations BOOLEAN DEFAULT 1,
  enable_transactional BOOLEAN DEFAULT 0,
  enable_ab_testing BOOLEAN DEFAULT 1,

  -- Status
  is_active BOOLEAN DEFAULT 1,
  connection_status ENUM('connected', 'disconnected', 'error') DEFAULT 'disconnected',
  last_connection_check TIMESTAMP NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (lead_type_id) REFERENCES lead_types(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_lead_type (user_id, lead_type_id),
  INDEX idx_user_id (user_id),
  INDEX idx_lead_type_id (lead_type_id),
  INDEX idx_connection_status (connection_status)
);
```

### New Table: `mailchimp_campaigns`
```sql
CREATE TABLE mailchimp_campaigns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  lead_type_id INT NOT NULL,
  mailchimp_config_id INT NOT NULL,

  -- Campaign Identifiers
  campaign_id VARCHAR(100) NOT NULL UNIQUE,
  web_id BIGINT,

  -- Campaign Details
  type ENUM('regular', 'plaintext', 'absplit', 'rss', 'variate') DEFAULT 'regular',
  status ENUM('save', 'paused', 'schedule', 'sending', 'sent', 'canceled', 'canceling', 'archived') DEFAULT 'save',

  -- Content
  subject_line VARCHAR(255),
  preview_text VARCHAR(255),
  title VARCHAR(255),
  from_name VARCHAR(255),
  reply_to VARCHAR(255),

  -- Audience
  list_id VARCHAR(100),
  segment_id VARCHAR(100),
  segment_text TEXT,

  -- Settings
  authenticate BOOLEAN DEFAULT 1,
  auto_footer BOOLEAN DEFAULT 0,
  inline_css BOOLEAN DEFAULT 0,
  auto_tweet BOOLEAN DEFAULT 0,
  fb_comments BOOLEAN DEFAULT 1,

  -- Scheduling
  send_time TIMESTAMP NULL,
  timewarp BOOLEAN DEFAULT 0,

  -- Tracking
  opens BOOLEAN DEFAULT 1,
  html_clicks BOOLEAN DEFAULT 1,
  text_clicks BOOLEAN DEFAULT 0,
  goal_tracking BOOLEAN DEFAULT 0,
  ecomm360 BOOLEAN DEFAULT 0,
  google_analytics VARCHAR(255),
  clicktale VARCHAR(255),

  -- Stats (synced from Mailchimp)
  emails_sent INT DEFAULT 0,
  abuse_reports INT DEFAULT 0,
  unsubscribed INT DEFAULT 0,
  hard_bounces INT DEFAULT 0,
  soft_bounces INT DEFAULT 0,
  syntax_errors INT DEFAULT 0,
  forwards_count INT DEFAULT 0,
  forwards_opens INT DEFAULT 0,
  opens_total INT DEFAULT 0,
  unique_opens INT DEFAULT 0,
  open_rate DECIMAL(5,2) DEFAULT 0.00,
  clicks_total INT DEFAULT 0,
  unique_clicks INT DEFAULT 0,
  unique_subscriber_clicks INT DEFAULT 0,
  click_rate DECIMAL(5,2) DEFAULT 0.00,

  -- Timestamps
  last_synced_at TIMESTAMP NULL,
  send_started_at TIMESTAMP NULL,
  send_completed_at TIMESTAMP NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (lead_type_id) REFERENCES lead_types(id) ON DELETE CASCADE,
  FOREIGN KEY (mailchimp_config_id) REFERENCES mailchimp_configs(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_lead_type_id (lead_type_id),
  INDEX idx_campaign_id (campaign_id),
  INDEX idx_status (status),
  INDEX idx_deleted_at (deleted_at)
);
```

### New Table: `mailchimp_audiences`
```sql
CREATE TABLE mailchimp_audiences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  lead_type_id INT NOT NULL,
  mailchimp_config_id INT NOT NULL,

  -- Mailchimp IDs
  list_id VARCHAR(100) NOT NULL UNIQUE,
  web_id BIGINT,

  -- Audience Info
  name VARCHAR(255) NOT NULL,
  permission_reminder TEXT,
  email_type_option BOOLEAN DEFAULT 0,

  -- Contact Info
  company VARCHAR(255),
  address1 VARCHAR(255),
  address2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(50),
  zip VARCHAR(20),
  country VARCHAR(2),
  phone VARCHAR(50),

  -- Stats (synced from Mailchimp)
  member_count INT DEFAULT 0,
  unsubscribe_count INT DEFAULT 0,
  cleaned_count INT DEFAULT 0,
  member_count_since_send INT DEFAULT 0,
  unsubscribe_count_since_send INT DEFAULT 0,
  cleaned_count_since_send INT DEFAULT 0,
  campaign_count INT DEFAULT 0,
  campaign_last_sent TIMESTAMP NULL,
  merge_field_count INT DEFAULT 0,
  avg_sub_rate DECIMAL(10,2) DEFAULT 0.00,
  avg_unsub_rate DECIMAL(10,2) DEFAULT 0.00,
  target_sub_rate DECIMAL(10,2) DEFAULT 0.00,
  open_rate DECIMAL(5,2) DEFAULT 0.00,
  click_rate DECIMAL(5,2) DEFAULT 0.00,

  -- Settings
  use_archive_bar BOOLEAN DEFAULT 0,
  notify_on_subscribe VARCHAR(255),
  notify_on_unsubscribe VARCHAR(255),

  -- Timestamps
  date_created TIMESTAMP NULL,
  last_synced_at TIMESTAMP NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (lead_type_id) REFERENCES lead_types(id) ON DELETE CASCADE,
  FOREIGN KEY (mailchimp_config_id) REFERENCES mailchimp_configs(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_lead_type_id (lead_type_id),
  INDEX idx_list_id (list_id)
);
```

### New Table: `mailchimp_contacts`
```sql
CREATE TABLE mailchimp_contacts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  contact_id INT NOT NULL,
  lead_type_id INT NOT NULL,
  mailchimp_config_id INT NOT NULL,

  -- Mailchimp IDs
  subscriber_hash VARCHAR(32),
  list_id VARCHAR(100),
  unique_email_id VARCHAR(100),
  web_id BIGINT,

  -- Contact Info
  email_address VARCHAR(255) NOT NULL,
  status ENUM('subscribed', 'unsubscribed', 'cleaned', 'pending', 'transactional') DEFAULT 'subscribed',
  email_type ENUM('html', 'text') DEFAULT 'html',

  -- Personal Info
  merge_fields JSON, -- {FNAME, LNAME, ADDRESS, PHONE, etc.}
  interests JSON, -- {interest_id: true/false}

  -- Stats
  stats JSON, -- {avg_open_rate, avg_click_rate}

  -- IP & Timestamps
  ip_signup VARCHAR(45),
  timestamp_signup TIMESTAMP NULL,
  ip_opt VARCHAR(45),
  timestamp_opt TIMESTAMP NULL,

  -- Member Rating (1-5 stars based on engagement)
  member_rating INT DEFAULT 0,

  -- Last Activity
  last_changed TIMESTAMP NULL,
  last_note_id VARCHAR(100),

  -- GDPR/Marketing
  marketing_permissions JSON,

  -- Tags
  tags JSON, -- ['tag1', 'tag2', 'tag3']

  -- Location
  location JSON, -- {latitude, longitude, gmtoff, dstoff, country_code, timezone}

  -- Source
  source VARCHAR(100),

  -- Sync Status
  last_synced_at TIMESTAMP NULL,
  sync_status ENUM('synced', 'pending', 'error') DEFAULT 'pending',
  sync_error TEXT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
  FOREIGN KEY (lead_type_id) REFERENCES lead_types(id) ON DELETE CASCADE,
  FOREIGN KEY (mailchimp_config_id) REFERENCES mailchimp_configs(id) ON DELETE CASCADE,
  UNIQUE KEY unique_contact_list (contact_id, list_id),
  INDEX idx_user_id (user_id),
  INDEX idx_contact_id (contact_id),
  INDEX idx_email (email_address),
  INDEX idx_status (status),
  INDEX idx_deleted_at (deleted_at)
);
```

### New Table: `mailchimp_automations`
```sql
CREATE TABLE mailchimp_automations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  lead_type_id INT NOT NULL,
  mailchimp_config_id INT NOT NULL,

  -- Automation IDs
  workflow_id VARCHAR(100) NOT NULL UNIQUE,

  -- Automation Info
  title VARCHAR(255) NOT NULL,
  status ENUM('save', 'paused', 'sending') DEFAULT 'save',

  -- Trigger Settings
  trigger_settings JSON, -- {workflow_type, workflow_emails_count, runtime, etc.}

  -- Recipients
  list_id VARCHAR(100),
  segment_id VARCHAR(100),

  -- Stats
  emails_sent INT DEFAULT 0,
  recipients JSON, -- {list_id, segment_opts}

  -- Settings
  settings JSON, -- {from_name, reply_to, etc.}

  -- Tracking
  tracking JSON, -- {opens, html_clicks, text_clicks, etc.}

  -- Report Summary
  report_summary JSON, -- {opens, unique_opens, open_rate, clicks, etc.}

  -- Timestamps
  create_time TIMESTAMP NULL,
  start_time TIMESTAMP NULL,
  last_synced_at TIMESTAMP NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (lead_type_id) REFERENCES lead_types(id) ON DELETE CASCADE,
  FOREIGN KEY (mailchimp_config_id) REFERENCES mailchimp_configs(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_lead_type_id (lead_type_id),
  INDEX idx_workflow_id (workflow_id),
  INDEX idx_status (status)
);
```

### New Table: `mailchimp_templates`
```sql
CREATE TABLE mailchimp_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  lead_type_id INT,
  mailchimp_config_id INT,

  -- Template IDs
  template_id VARCHAR(100) UNIQUE,

  -- Template Info
  name VARCHAR(255) NOT NULL,
  type ENUM('user', 'base', 'gallery') DEFAULT 'user',
  category VARCHAR(100),

  -- Content
  html TEXT,
  drag_drop BOOLEAN DEFAULT 0,
  responsive BOOLEAN DEFAULT 0,

  -- Thumbnail
  thumbnail VARCHAR(500),

  -- Share
  share_url VARCHAR(500),

  -- Stats
  active BOOLEAN DEFAULT 1,
  folder_id VARCHAR(100),

  -- Timestamps
  date_created TIMESTAMP NULL,
  date_edited TIMESTAMP NULL,
  last_synced_at TIMESTAMP NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (lead_type_id) REFERENCES lead_types(id) ON DELETE SET NULL,
  FOREIGN KEY (mailchimp_config_id) REFERENCES mailchimp_configs(id) ON DELETE SET NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_template_id (template_id),
  INDEX idx_type (type)
);
```

### New Table: `mailchimp_activity_logs`
```sql
CREATE TABLE mailchimp_activity_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  lead_type_id INT,

  -- Activity Type
  activity_type ENUM('campaign_sent', 'email_opened', 'link_clicked', 'unsubscribe', 'bounce', 'automation_triggered', 'contact_synced', 'api_error', 'webhook_received') NOT NULL,

  -- References
  campaign_id VARCHAR(100),
  contact_email VARCHAR(255),
  automation_id VARCHAR(100),

  -- Details
  action VARCHAR(255),
  description TEXT,
  metadata JSON,

  -- IP and Location
  ip_address VARCHAR(45),
  geo_location JSON,

  -- Device Info
  user_agent TEXT,
  device_type VARCHAR(50),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (lead_type_id) REFERENCES lead_types(id) ON DELETE SET NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_activity_type (activity_type),
  INDEX idx_campaign_id (campaign_id),
  INDEX idx_created_at (created_at)
);
```

### New Table: `mailchimp_segments`
```sql
CREATE TABLE mailchimp_segments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  lead_type_id INT NOT NULL,
  mailchimp_config_id INT NOT NULL,

  -- Segment IDs
  segment_id VARCHAR(100) UNIQUE,
  list_id VARCHAR(100),

  -- Segment Info
  name VARCHAR(255) NOT NULL,
  type ENUM('saved', 'static', 'fuzzy') DEFAULT 'saved',

  -- Conditions
  options JSON, -- {match: 'any'|'all', conditions: [...]}

  -- Stats
  member_count INT DEFAULT 0,

  -- Timestamps
  created_at_mailchimp TIMESTAMP NULL,
  updated_at_mailchimp TIMESTAMP NULL,
  last_synced_at TIMESTAMP NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (lead_type_id) REFERENCES lead_types(id) ON DELETE CASCADE,
  FOREIGN KEY (mailchimp_config_id) REFERENCES mailchimp_configs(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_segment_id (segment_id),
  INDEX idx_list_id (list_id)
);
```

---

## Feature Categories

### 1. Campaign Management

#### 1.1 Campaign Creation & Editing
- **Create Campaign**
  - Regular campaigns
  - A/B test campaigns
  - Plain-text campaigns
  - RSS-driven campaigns
  - Automated campaigns
  - Template selection
  - Drag-and-drop builder integration
  - HTML editor integration
  - Mobile preview
  - Desktop preview

- **Edit Campaign**
  - Update subject line
  - Modify sender name
  - Change reply-to address
  - Update preview text
  - Edit email content
  - Modify audience selection
  - Update segment targeting
  - Change scheduling
  - Enable/disable tracking options

- **Duplicate Campaign**
  - Clone entire campaign
  - Duplicate with new audience
  - Copy content only
  - Replicate settings

- **Campaign Versioning**
  - Version history tracking
  - Restore previous versions
  - Compare versions
  - Draft autosave (every 30 seconds)
  - Named versions

- **Campaign Scheduling**
  - Schedule for specific date/time
  - Timezone-based scheduling
  - Timewarp (send at optimal time per timezone)
  - Batch scheduling
  - Recurring campaigns
  - Pause scheduled campaigns
  - Resume paused campaigns
  - Cancel scheduled sends

- **Campaign Actions**
  - Send test email
  - Send to specific test group
  - Preview in inbox (Litmus integration)
  - Spam score check
  - Subject line tester
  - Send now
  - Schedule send
  - Pause sending
  - Cancel send
  - Archive campaign
  - Unarchive campaign
  - Delete campaign (soft delete)

#### 1.2 Campaign Templates
- **Template Library**
  - Browse Mailchimp templates
  - Filter by category
  - Search templates
  - Preview templates
  - Mobile-responsive templates
  - Custom templates

- **Template Management**
  - Import templates from Mailchimp
  - Export templates to Mailchimp
  - Create custom templates
  - Edit template HTML
  - Save template versions
  - Share templates across lead types
  - Template categories/folders
  - Favorite templates
  - Recently used templates

- **Template Builder**
  - Drag-and-drop editor
  - Content blocks library
  - Image uploader
  - Dynamic content blocks
  - Personalization merge tags
  - Conditional content
  - Code view toggle
  - Preview mode

---

### 2. Email Performance & Analytics

#### 2.1 Basic Metrics
- **Total Sent**
  - All-time total
  - By campaign
  - By lead type
  - By date range
  - Comparison charts

- **Sent Today**
  - Real-time counter
  - Hourly breakdown
  - By campaign
  - By lead type

- **Total Opens**
  - All-time total
  - Unique vs. total opens
  - Open timeline
  - By campaign
  - By contact

- **Opens Today**
  - Real-time tracking
  - Hourly engagement
  - Geographic breakdown
  - Device breakdown

- **Total Clicks**
  - All-time total
  - Unique vs. total clicks
  - Click timeline
  - By campaign
  - By link

- **Clicks Today**
  - Real-time tracking
  - Link-by-link breakdown
  - Most clicked links
  - Click heatmap

#### 2.2 Advanced Analytics
- **Engagement Metrics**
  - Open rate (unique/total)
  - Click rate (unique/total)
  - Click-to-open rate (CTOR)
  - Unsubscribe rate
  - Bounce rate (soft/hard)
  - Complaint rate
  - Forward rate
  - Forward opens
  - Social shares
  - Social engagement rate

- **Deliverability Metrics**
  - Total delivered
  - Delivery rate
  - Hard bounces (with reasons)
  - Soft bounces (with reasons)
  - Syntax errors
  - Spam complaints
  - Abuse reports
  - Blocked emails
  - Deferred emails

- **Subscriber Breakdown**
  - Unique opens count
  - Unique clicks count
  - Unique openers list
  - Unique clickers list
  - Non-openers list
  - Non-clickers list
  - Most engaged subscribers
  - Least engaged subscribers

- **Device & Client Analytics**
  - Email client breakdown (Gmail, Outlook, Apple Mail, etc.)
  - Device type (Desktop, Mobile, Tablet)
  - Operating system breakdown
  - Browser breakdown
  - Mobile OS breakdown (iOS, Android)
  - Screen size analytics

- **Geographic Analytics**
  - Opens by country
  - Opens by state/region
  - Opens by city
  - Clicks by location
  - Interactive map visualization
  - Top locations ranking

- **Temporal Analytics**
  - Hourly engagement graph
  - Day-of-week analysis
  - Time-of-day heatmap
  - Best send time recommendations
  - Engagement decay timeline
  - Peak engagement periods

- **Link Analytics**
  - Link-by-link click tracking
  - Total clicks per link
  - Unique clicks per link
  - Click rate per link
  - Link performance ranking
  - Click heatmap overlay
  - Link redirect tracking
  - UTM parameter tracking

- **Conversion Tracking**
  - Goal completions
  - Revenue tracking (Ecommerce360)
  - Purchase attribution
  - ROI calculation
  - Conversion rate
  - Average order value
  - Product performance
  - Revenue per email

- **Social Performance**
  - Facebook shares
  - Twitter shares
  - LinkedIn shares
  - Social reach
  - Social clicks
  - Viral coefficient

#### 2.3 Comparative Analytics
- **Campaign Comparison**
  - Side-by-side metrics
  - Performance ranking
  - Best/worst performers
  - Industry benchmarks
  - Historical comparison
  - Trend analysis

- **Benchmarking**
  - Industry average comparison
  - Your average vs. industry
  - Percentile ranking
  - Competitive insights

---

### 3. Audience & Contact Sync

#### 3.1 Contact Import/Export
- **Import Contacts**
  - CSV file upload
  - Manual entry form
  - Import from CRM (contacts table)
  - Bulk import API
  - Import with tags
  - Import with custom fields
  - Duplicate detection
  - Auto-merge duplicates
  - Import validation
  - Import error reporting
  - Import preview
  - Import rollback

- **Export Contacts**
  - Export to CSV
  - Export to Excel
  - Export filtered segments
  - Export with engagement data
  - Export with tags
  - Export with custom fields
  - Scheduled exports
  - Export to third-party services

- **Bulk Operations**
  - Bulk subscribe
  - Bulk unsubscribe
  - Bulk update fields
  - Bulk tag assignment
  - Bulk segment assignment
  - Bulk delete (archive)
  - Bulk status change

#### 3.2 Contact Synchronization
- **Real-Time Sync**
  - Bi-directional sync
  - Contact added → Mailchimp subscribe
  - Contact updated → Mailchimp update
  - Mailchimp subscribe → CRM contact
  - Mailchimp unsubscribe → CRM status update
  - Conflict resolution rules
  - Sync queue monitoring

- **Scheduled Sync**
  - Hourly sync
  - Daily sync
  - Weekly sync
  - Custom schedule
  - Sync status monitoring
  - Sync error logs
  - Retry failed syncs

- **Field Mapping**
  - Map CRM fields to Mailchimp merge fields
  - Custom field creation
  - Automated field mapping
  - Field transformation rules
  - Default value settings
  - Conditional mapping

- **Sync Management**
  - Sync history log
  - Last sync timestamp
  - Sync success/failure count
  - Manual sync trigger
  - Pause/resume sync
  - Sync conflict resolution
  - Orphaned record handling

#### 3.3 Contact Management
- **Add/Edit Contact**
  - Add single subscriber
  - Update subscriber info
  - Change subscription status
  - Update custom fields
  - Assign tags
  - Add to segments
  - Set interests/groups
  - GDPR consent tracking

- **Remove Contact**
  - Unsubscribe contact
  - Archive contact
  - Permanently delete
  - Bulk removal
  - Compliance tracking

- **Contact Details**
  - Full contact profile
  - Subscription history
  - Campaign engagement history
  - Email activity timeline
  - Tags assigned
  - Segments membership
  - Custom field values
  - GDPR consent status
  - Marketing permissions

#### 3.4 Contact Status Management
- **Status Types**
  - Subscribed
  - Unsubscribed (with reason)
  - Cleaned (bounced/invalid)
  - Pending (double opt-in)
  - Transactional (non-marketing)
  - Archived

- **Status Transitions**
  - Resubscribe cleaned contacts
  - Convert pending to subscribed
  - Handle opt-out requests
  - Track status change history
  - Automated status updates

---

### 4. Tagging, Segmentation & Personalization

#### 4.1 Tagging System
- **Tag Management**
  - Create tags
  - Edit tag names
  - Delete tags
  - Merge tags
  - Tag categories
  - Tag color coding
  - Tag usage analytics

- **Tag Assignment**
  - Manual tag assignment
  - Bulk tag assignment
  - Automated tagging (based on behavior)
  - Tag on import
  - Tag on campaign action
  - Tag on form submission
  - Conditional tagging rules

- **Tag-Based Actions**
  - Filter by tags
  - Segment by tags
  - Campaign targeting by tags
  - Automation triggers by tags
  - Reporting by tags

#### 4.2 Segmentation
- **Segment Creation**
  - Create saved segments
  - Create static segments
  - Dynamic segments (auto-update)
  - Segment builder UI
  - Pre-built segment templates
  - Copy/duplicate segments

- **Segment Conditions**
  - Email activity (opened, clicked, not opened)
  - Campaign engagement
  - Contact information
  - Date-based conditions
  - Merge field values
  - Tag membership
  - List membership
  - Geographic location
  - Signup date
  - Last changed date
  - E-commerce activity
  - Predicted demographics
  - Member rating

- **Advanced Segmentation**
  - AND/OR logic builder
  - Nested conditions
  - Multi-level conditions
  - Combination segments
  - Exclusion segments
  - Lookalike audiences

- **Behavioral Segmentation**
  - Openers (last 30/60/90 days)
  - Clickers (last 30/60/90 days)
  - Non-openers
  - Inactive subscribers
  - Super engaged subscribers
  - At-risk subscribers
  - Recently subscribed
  - VIP customers

- **Predictive Segmentation**
  - Likely to purchase
  - Likely to unsubscribe
  - High lifetime value
  - Demographic predictions
  - Purchase likelihood score
  - Engagement prediction

#### 4.3 Personalization
- **Merge Fields**
  - First name
  - Last name
  - Email
  - Phone
  - Address fields
  - Property address (from CRM)
  - Custom fields
  - Dynamic content insertion
  - Fallback values
  - Field formatting

- **Personalized Content Blocks**
  - Conditional content
  - Show/hide based on segment
  - Show/hide based on merge field
  - Dynamic images
  - Dynamic product recommendations
  - Personalized subject lines
  - Personalized preview text

- **Dynamic Content**
  - Location-based content
  - Interest-based content
  - Engagement-based content
  - Purchase history content
  - Lead type-specific content

#### 4.4 Interest Groups
- **Groups Management**
  - Create interest groups
  - Group categories
  - Checkbox groups
  - Radio button groups
  - Dropdown groups
  - Hidden groups

- **Group Assignment**
  - Subscriber preference center
  - Automated group assignment
  - Import with groups
  - API group management

---

### 5. Automation Workflows

#### 5.1 Automation Types
- **Welcome Series**
  - New subscriber welcome
  - Double opt-in confirmation
  - Onboarding sequence
  - Lead type-specific welcome

- **Behavioral Triggers**
  - Purchase follow-up
  - Cart abandonment
  - Browse abandonment
  - Product view follow-up
  - Category interest

- **Date-Based Automations**
  - Birthday emails
  - Anniversary emails
  - Renewal reminders
  - Subscription expiry
  - Time-delayed sequences

- **Engagement Automations**
  - Re-engagement campaigns
  - Win-back campaigns
  - Post-purchase follow-up
  - Review requests
  - Referral requests

- **Lead Nurture**
  - Drip campaigns
  - Educational series
  - Lead scoring progression
  - Sales funnel automation

#### 5.2 Automation Management
- **Import Automations**
  - Sync existing Mailchimp automations
  - Import automation templates
  - Clone automations across lead types

- **Automation Controls**
  - Start automation
  - Pause automation
  - Resume automation
  - Stop automation
  - Archive automation
  - Delete automation

- **Automation Editing**
  - Edit email content
  - Update trigger conditions
  - Modify delay timing
  - Change audience
  - Update workflow steps
  - Add/remove emails
  - Branching logic
  - A/B test steps

- **Trigger Configuration**
  - Signup trigger
  - Tag added trigger
  - Tag removed trigger
  - Field update trigger
  - Date trigger
  - API trigger
  - E-commerce trigger
  - Campaign activity trigger

#### 5.3 Automation Analytics
- **Performance Metrics**
  - Total emails sent
  - Open rate
  - Click rate
  - Conversion rate
  - Revenue generated
  - Unsubscribe rate
  - Bounce rate

- **Journey Analytics**
  - Workflow completion rate
  - Drop-off points
  - Email-by-email performance
  - Path analysis
  - Time in workflow
  - Goal achievement

- **Event Logs**
  - Subscriber entry log
  - Email sent log
  - Email opened log
  - Link clicked log
  - Workflow completed log
  - Workflow exited log
  - Error log

#### 5.4 Automation Integration
- **Trigger from CRM**
  - New contact added → start workflow
  - Status changed → start workflow
  - Tag added in CRM → Mailchimp automation
  - Lead type assignment → welcome series

- **CRM Updates from Automation**
  - Workflow completion → update CRM field
  - Email engagement → update lead score
  - Link clicked → trigger CRM action

---

### 6. Email Template Handling

#### 6.1 Template Library
- **Browse Templates**
  - Mailchimp template gallery
  - User templates
  - Saved templates
  - Shared templates
  - Template categories
  - Search templates
  - Filter by type
  - Sort by date/name

- **Template Preview**
  - Desktop preview
  - Mobile preview
  - Tablet preview
  - Email client preview
  - Dark mode preview

#### 6.2 Template Operations
- **Import Templates**
  - Import from Mailchimp
  - Import from file (HTML)
  - Import from URL
  - Batch import

- **Export Templates**
  - Export to Mailchimp
  - Export as HTML file
  - Export as PDF
  - Share template URL

- **Edit Templates**
  - HTML editor
  - Drag-and-drop editor
  - Code view
  - Preview mode
  - Mobile editing
  - Save versions
  - Template variables

- **Template Management**
  - Create new template
  - Duplicate template
  - Archive template
  - Delete template
  - Organize in folders
  - Tag templates
  - Set default template

#### 6.3 Template Builder Features
- **Content Blocks**
  - Text blocks
  - Image blocks
  - Button blocks
  - Social media blocks
  - Divider blocks
  - Video blocks
  - Product blocks
  - Custom HTML blocks

- **Layout Options**
  - Columns
  - Sections
  - Headers
  - Footers
  - Sidebars
  - Responsive layouts

- **Styling**
  - Color picker
  - Font selector
  - Spacing controls
  - Border options
  - Background images
  - Global styles
  - Brand kit integration

---

### 7. Transactional Email (Mandrill Integration)

#### 7.1 Transactional Messages
- **Message Types**
  - Order confirmations
  - Password resets
  - Account notifications
  - Receipts
  - Shipping updates
  - System alerts

- **Sending**
  - Send via API
  - Template-based sending
  - Dynamic content
  - Attachment support
  - Priority sending

#### 7.2 Transactional Analytics
- **Delivery Tracking**
  - Sent count
  - Delivered count
  - Delivery rate
  - Failed deliveries
  - Deferred messages

- **Engagement Tracking**
  - Opens
  - Clicks
  - Bounce details
  - Spam reports

- **Logs & Events**
  - Message history
  - Delivery events
  - Error logs
  - Retry attempts
  - Webhook events

#### 7.3 Mandrill Management
- **Configuration**
  - API key management
  - Sender domains
  - SPF/DKIM setup
  - Dedicated IPs
  - Subaccounts

- **Templates**
  - Transactional templates
  - Template versioning
  - Template testing
  - Default content

---

### 8. A/B Testing Features

#### 8.1 Test Creation
- **Test Types**
  - Subject line testing
  - From name testing
  - Content testing (3 variants)
  - Send time testing
  - Combined testing

- **Test Configuration**
  - Number of variants
  - Test group size
  - Winner criteria (opens, clicks, revenue)
  - Automatic winner selection
  - Manual winner selection
  - Wait time before sending to remainder

#### 8.2 Test Management
- **Create A/B Campaign**
  - Select test type
  - Create variants
  - Set test parameters
  - Choose winning metric
  - Schedule test

- **Monitor Test**
  - Real-time results
  - Variant performance
  - Statistical significance
  - Projected winner
  - Test progress

- **Test Results**
  - Winner announcement
  - Performance comparison
  - Confidence level
  - Final send results

#### 8.3 A/B Reporting
- **Variant Comparison**
  - Side-by-side metrics
  - Opens comparison
  - Clicks comparison
  - Conversion comparison
  - Revenue comparison

- **Test Insights**
  - Best performing element
  - Performance delta
  - Statistical analysis
  - Recommendations

---

### 9. List Health & Compliance

#### 9.1 List Hygiene
- **Cleaned Contacts**
  - Hard bounce list
  - Invalid emails
  - Spam complainers
  - Auto-cleaned contacts
  - Cleaned count tracking

- **Bounce Management**
  - Hard bounce detection
  - Soft bounce tracking
  - Bounce reason codes
  - Auto-cleanup rules
  - Re-validation tools

- **Engagement-Based Cleaning**
  - Identify inactive subscribers
  - Sunset policy automation
  - Re-engagement campaigns
  - Auto-archive non-engagers

#### 9.2 GDPR & Compliance
- **Consent Tracking**
  - Double opt-in
  - Opt-in date
  - Opt-in method
  - IP address logging
  - Consent audit trail

- **Permission Management**
  - Marketing permissions
  - Consent categories
  - Preference center
  - Opt-out handling
  - Right to be forgotten

- **Data Portability**
  - Export subscriber data
  - Download all campaign data
  - Data deletion requests
  - Compliance reports

#### 9.3 Deliverability Tools
- **Sender Reputation**
  - Domain reputation score
  - IP reputation
  - Spam score monitoring
  - Blacklist monitoring

- **Authentication**
  - SPF records
  - DKIM setup
  - DMARC policy
  - Domain verification

- **Deliverability Insights**
  - Inbox placement rate
  - Spam folder rate
  - Deliverability recommendations
  - ISP feedback loops

#### 9.4 Spam Complaint Management
- **Complaint Tracking**
  - Total complaints
  - Complaint rate
  - Complaints by campaign
  - Complaints by ISP

- **Complaint Handling**
  - Auto-unsubscribe complainers
  - Complaint investigation
  - Feedback loop processing

---

### 10. Insights & Intelligence

#### 10.1 Predictive Analytics
- **Demographics Prediction**
  - Age range
  - Gender
  - Income level
  - Education level
  - Marital status

- **Behavioral Predictions**
  - Purchase likelihood
  - Lifetime value prediction
  - Churn risk score
  - Engagement score
  - Optimal send time

#### 10.2 Audience Insights
- **Growth Analytics**
  - Subscriber growth chart
  - Growth rate
  - Net growth
  - Subscription sources
  - Unsubscribe trends

- **Engagement Scoring**
  - Member rating (1-5 stars)
  - Engagement score per contact
  - Engagement distribution
  - Top engagers
  - At-risk subscribers

- **Churn Analysis**
  - Churn rate
  - Churn reasons
  - Churn prediction
  - Retention rate
  - Win-back opportunities

#### 10.3 Industry Benchmarks
- **Comparative Metrics**
  - Your open rate vs. industry average
  - Your click rate vs. industry average
  - Your bounce rate vs. industry average
  - Percentile ranking
  - Industry leaders

- **Recommendations**
  - Best send times
  - Optimal frequency
  - Subject line suggestions
  - Content recommendations
  - Segment suggestions

#### 10.4 Smart Recommendations
- **Send Time Optimization**
  - Best day to send
  - Best time to send
  - Timezone optimization
  - Subscriber-specific send times

- **Content Suggestions**
  - Subject line generator
  - A/B test suggestions
  - Template recommendations
  - Personalization ideas

- **Segmentation Ideas**
  - High-value segments
  - Re-engagement segments
  - Upsell segments
  - Cross-sell segments

---

### 11. Webhooks & Real-Time Events

#### 11.1 Webhook Configuration
- **Setup Webhooks**
  - Configure webhook URL
  - Set webhook secret
  - Select event types
  - Enable/disable webhooks
  - Test webhook delivery

- **Event Types**
  - Subscribe
  - Unsubscribe
  - Profile update
  - Email cleaned
  - Email address changed
  - Campaign sending
  - Campaign sent

#### 11.2 Webhook Management
- **Event Processing**
  - Receive webhook events
  - Parse event data
  - Validate signatures
  - Process event actions
  - Update CRM records

- **Event Logs**
  - Webhook event history
  - Failed webhooks
  - Retry attempts
  - Processing status

- **Error Handling**
  - Webhook failures
  - Retry policy
  - Manual retry
  - Error notifications
  - Debugging tools

#### 11.3 Real-Time Sync
- **Bi-Directional Events**
  - Mailchimp → CRM updates
  - CRM → Mailchimp updates
  - Conflict resolution
  - Event queue
  - Processing status

---

### 12. Import / Export Features

#### 12.1 Data Import
- **Import Audiences**
  - Import from Mailchimp
  - CSV import
  - Excel import
  - API batch import
  - Import scheduling

- **Import Tags**
  - Bulk tag import
  - Tag assignment during import
  - Tag mapping

- **Import Campaign Data**
  - Import campaign reports
  - Historical data import
  - Metrics sync

#### 12.2 Data Export
- **Export Audiences**
  - Export with engagement metrics
  - Export with tags
  - Export with segments
  - Export with custom fields
  - CSV format
  - Excel format
  - JSON format

- **Export Reports**
  - Campaign reports (PDF, CSV)
  - Audience reports
  - Analytics dashboard export
  - Scheduled report delivery

- **Export Cleaned Contacts**
  - Export bounced emails
  - Export unsubscribers
  - Export complaints

- **Export Automation Logs**
  - Workflow event logs
  - Automation performance data
  - Subscriber journey data

---

### 13. Advanced Admin Features

#### 13.1 Multi-Account Management
- **API Key Management**
  - Store multiple API keys per user
  - API key per lead type
  - API key rotation
  - Key expiration alerts
  - Key usage tracking

- **Account Switching**
  - Switch between Mailchimp accounts
  - Lead type-specific accounts
  - Default account settings

#### 13.2 OAuth Authentication
- **OAuth Flow**
  - Connect with OAuth
  - Refresh token handling
  - Token expiration management
  - Automatic re-authentication
  - Disconnect account

- **User-Level OAuth**
  - Per-user authentication
  - User consent flow
  - Permission scopes
  - Revoke access

#### 13.3 Usage & Monitoring
- **API Usage Logs**
  - Request count
  - Rate limit monitoring
  - API errors
  - Response times
  - Endpoint usage

- **Sync Monitoring**
  - Sync job status
  - Success/failure rates
  - Sync duration
  - Records processed
  - Queue depth

- **Error Debugging**
  - Error log viewer
  - Error categorization
  - Stack traces
  - Retry mechanisms
  - Error notifications

#### 13.4 Role-Based Permissions
- **Admin Permissions**
  - Manage API keys
  - Configure webhooks
  - Manage users
  - View all campaigns
  - System settings

- **User Permissions**
  - View campaigns
  - Create campaigns
  - Send campaigns
  - View reports
  - Manage contacts
  - Limited to assigned lead types

#### 13.5 Activity Audit Log
- **Tracked Actions**
  - User login
  - API key changes
  - Campaign created
  - Campaign sent
  - Contacts synced
  - Automation triggered
  - Settings changed

- **Audit Details**
  - User who performed action
  - Timestamp
  - Action type
  - Affected resources
  - IP address
  - Before/after values

#### 13.6 Integration Health
- **Connection Status**
  - API connectivity
  - Last successful sync
  - Authentication status
  - Service availability

- **Health Checks**
  - Automated health monitoring
  - Connection testing
  - Error rate tracking
  - Uptime monitoring

- **Reconnection Tools**
  - Manual reconnect
  - Re-authenticate
  - Test connection
  - Disconnect integration

---

## API Endpoints

### Admin Endpoints

```
POST   /api/admin/mailchimp/configs                    - Create Mailchimp config for lead type
GET    /api/admin/mailchimp/configs/:userId            - Get all configs for user
GET    /api/admin/mailchimp/configs/:userId/:leadType  - Get config for specific lead type
PUT    /api/admin/mailchimp/configs/:configId          - Update config
DELETE /api/admin/mailchimp/configs/:configId          - Delete config
POST   /api/admin/mailchimp/configs/:configId/test     - Test connection
```

### Campaign Endpoints

```
GET    /api/mailchimp/campaigns                    - Get all campaigns (filtered by lead type)
GET    /api/mailchimp/campaigns/:campaignId        - Get campaign details
POST   /api/mailchimp/campaigns                    - Create campaign
PUT    /api/mailchimp/campaigns/:campaignId        - Update campaign
DELETE /api/mailchimp/campaigns/:campaignId        - Delete campaign
POST   /api/mailchimp/campaigns/:campaignId/send   - Send campaign
POST   /api/mailchimp/campaigns/:campaignId/schedule - Schedule campaign
POST   /api/mailchimp/campaigns/:campaignId/test   - Send test email
GET    /api/mailchimp/campaigns/:campaignId/stats  - Get campaign stats
POST   /api/mailchimp/campaigns/:campaignId/sync   - Sync campaign data
```

### Audience Endpoints

```
GET    /api/mailchimp/audiences                    - Get all audiences
GET    /api/mailchimp/audiences/:listId            - Get audience details
POST   /api/mailchimp/audiences/:listId/sync       - Sync audience
GET    /api/mailchimp/audiences/:listId/stats      - Get audience stats
```

### Contact Endpoints

```
GET    /api/mailchimp/contacts                       - Get all synced contacts
GET    /api/mailchimp/contacts/:contactId            - Get contact details
POST   /api/mailchimp/contacts/sync                  - Sync single contact
POST   /api/mailchimp/contacts/sync-all              - Sync all contacts
POST   /api/mailchimp/contacts/import                - Import contacts
PUT    /api/mailchimp/contacts/:contactId            - Update contact
DELETE /api/mailchimp/contacts/:contactId            - Remove contact
POST   /api/mailchimp/contacts/:contactId/tags       - Add tags to contact
DELETE /api/mailchimp/contacts/:contactId/tags/:tag  - Remove tag from contact
```

### Segment Endpoints

```
GET    /api/mailchimp/segments                - Get all segments
POST   /api/mailchimp/segments                - Create segment
PUT    /api/mailchimp/segments/:segmentId     - Update segment
DELETE /api/mailchimp/segments/:segmentId     - Delete segment
GET    /api/mailchimp/segments/:segmentId/members - Get segment members
```

### Automation Endpoints

```
GET    /api/mailchimp/automations                     - Get all automations
GET    /api/mailchimp/automations/:workflowId         - Get automation details
POST   /api/mailchimp/automations/:workflowId/start   - Start automation
POST   /api/mailchimp/automations/:workflowId/pause   - Pause automation
GET    /api/mailchimp/automations/:workflowId/stats   - Get automation stats
POST   /api/mailchimp/automations/sync                - Sync automations
```

### Template Endpoints

```
GET    /api/mailchimp/templates                - Get all templates
GET    /api/mailchimp/templates/:templateId    - Get template
POST   /api/mailchimp/templates                - Create template
PUT    /api/mailchimp/templates/:templateId    - Update template
DELETE /api/mailchimp/templates/:templateId    - Delete template
POST   /api/mailchimp/templates/sync           - Sync templates
```

### Analytics Endpoints

```
GET    /api/mailchimp/analytics/dashboard       - Get dashboard stats
GET    /api/mailchimp/analytics/campaigns       - Get campaign analytics
GET    /api/mailchimp/analytics/engagement      - Get engagement metrics
GET    /api/mailchimp/analytics/growth          - Get audience growth
GET    /api/mailchimp/analytics/benchmarks      - Get industry benchmarks
```

### Webhook Endpoints

```
POST   /api/mailchimp/webhooks/mailchimp        - Receive Mailchimp webhooks
GET    /api/mailchimp/webhooks/logs             - Get webhook logs
POST   /api/mailchimp/webhooks/:configId/setup  - Setup webhook in Mailchimp
```

---

## UI Components

### Admin Pages

#### Mailchimp Configuration Page
- Lead type selector tabs
- API key input
- Server prefix dropdown
- Test connection button
- Connection status indicator
- Default audience selector
- Webhook configuration
- Sync settings
- Enable/disable features
- Save configuration

### Client Pages

#### Email Dashboard (Enhanced Emails.jsx)
**Top Stats Cards:**
- Total Sent
- Sent Today
- Total Opens
- Opens Today
- Total Clicks
- Clicks Today
- Open Rate
- Click Rate

**Lead Type Switcher:**
- Tabs for each lead type
- Shows only authorized lead types
- Separate stats per lead type

**Performance Chart:**
- 30-day trend line
- Sent, Opens, Clicks
- Interactive tooltips
- Date range selector

**Recent Campaigns Table:**
- Campaign name
- Status
- Sent date
- Recipients
- Opens
- Clicks
- Open rate
- Click rate
- Actions (view, edit, duplicate, delete)

**Quick Actions:**
- Create Campaign button
- Sync All button
- Import Contacts button
- View Templates button

#### Campaign Management Page
**Campaign List:**
- Filter by status
- Search campaigns
- Sort options
- Pagination

**Campaign Card:**
- Thumbnail preview
- Campaign name
- Status badge
- Quick stats
- Action menu

**Create Campaign Modal:**
- Campaign type selector
- Template selector
- Audience picker
- Subject line
- Preview text
- From name/email
- Schedule options

#### Contact Sync Page
**Sync Status:**
- Last sync timestamp
- Sync progress bar
- Contacts synced count
- Sync errors

**Contact List:**
- Email
- Name
- Status (subscribed, unsubscribed, etc.)
- Tags
- Segments
- Engagement score
- Actions

**Bulk Actions:**
- Select all
- Sync selected
- Add tags
- Add to segment
- Unsubscribe

#### Campaign Analytics Page
**Overview:**
- Campaign details
- Send summary
- Key metrics

**Engagement Timeline:**
- Opens over time
- Clicks over time
- Hour-by-hour breakdown

**Link Performance:**
- Click heatmap
- Link list with click counts
- Top performing links

**Geographic Map:**
- Opens by location
- Interactive map
- Top countries/states

**Device Breakdown:**
- Pie chart
- Email client list
- Device types

**Subscriber Activity:**
- Who opened
- Who clicked
- Who didn't open
- Export lists

#### Automation Page
**Automation List:**
- Automation name
- Status
- Trigger type
- Total sent
- Performance metrics

**Automation Builder:**
- Visual workflow
- Drag-and-drop emails
- Delay settings
- Branching logic
- Trigger configuration

**Automation Stats:**
- Email-by-email performance
- Completion rate
- Drop-off analysis

---

## Integration Workflow

### Initial Setup Flow
1. **Admin:** Navigate to API Keys page
2. **Admin:** Select lead type tab
3. **Admin:** Enter Mailchimp API key
4. **Admin:** Enter server prefix (e.g., us1)
5. **Admin:** Click "Test Connection"
6. **Admin:** Select default audience from dropdown
7. **Admin:** Configure webhook settings (optional)
8. **Admin:** Set sync frequency
9. **Admin:** Save configuration
10. **System:** Create `mailchimp_configs` record
11. **System:** Test connection to Mailchimp API
12. **System:** Fetch and store audience list
13. **Admin:** Repeat for each lead type

### Contact Sync Flow
1. **User:** Navigate to Emails page
2. **User:** Click "Sync Contacts" button
3. **System:** Fetch contacts for user's lead types
4. **System:** For each contact:
   - Check if already in `mailchimp_contacts`
   - Get appropriate `mailchimp_config` for lead type
   - Call Mailchimp API to subscribe/update
   - Store subscriber_hash and status
   - Log sync activity
5. **System:** Display sync results
6. **User:** View synced contacts list

### Campaign Creation Flow
1. **User:** Navigate to Emails page
2. **User:** Click "Create Campaign"
3. **User:** Select lead type
4. **System:** Load templates for that lead type's Mailchimp config
5. **User:** Select template
6. **User:** Fill in campaign details
7. **User:** Choose audience/segment
8. **User:** Preview campaign
9. **User:** Send test email
10. **User:** Schedule or send
11. **System:** Call Mailchimp API to create campaign
12. **System:** Store campaign in `mailchimp_campaigns`
13. **System:** Schedule send if applicable
14. **System:** Sync campaign stats after send

### Real-Time Webhook Flow
1. **Mailchimp:** Subscriber unsubscribes
2. **Mailchimp:** Sends webhook to `/api/mailchimp/webhooks/mailchimp`
3. **System:** Validate webhook signature
4. **System:** Parse event data
5. **System:** Update `mailchimp_contacts` status
6. **System:** Update CRM `contacts` table (optional)
7. **System:** Log activity in `mailchimp_activity_logs`
8. **System:** Trigger any automation rules

### Automated Sync Job
1. **Cron Job:** Runs every hour (configurable)
2. **System:** Get all active `mailchimp_configs` with `auto_sync_enabled = 1`
3. **System:** For each config:
   - Check `last_sync_at` and `sync_frequency_minutes`
   - If due for sync:
     - Update `sync_status` to 'syncing'
     - Fetch campaign stats from Mailchimp
     - Fetch audience stats
     - Update all campaign records
     - Update audience records
     - Update `last_sync_at`
     - Update `sync_status` to 'idle'
4. **System:** Log sync results

---

## Implementation Priority

### Phase 1: Foundation (Week 1-2)
- Database schema creation
- Admin API key management
- Basic connection testing
- Single lead type configuration

### Phase 2: Core Features (Week 3-4)
- Contact sync (manual)
- Campaign list display
- Campaign stats sync
- Basic analytics dashboard

### Phase 3: Campaign Management (Week 5-6)
- Create campaigns
- Edit campaigns
- Send campaigns
- Template management

### Phase 4: Advanced Analytics (Week 7-8)
- Detailed campaign reports
- Link tracking
- Geographic analytics
- Engagement metrics

### Phase 5: Automation (Week 9-10)
- Automation sync
- Automation management
- Trigger configuration
- Workflow analytics

### Phase 6: Intelligence & Optimization (Week 11-12)
- A/B testing
- Segmentation
- Predictive analytics
- Recommendations

---

## Technical Considerations

### API Rate Limiting
- Mailchimp: 10 requests/second per API key
- Implement request queue
- Exponential backoff
- Monitor rate limit headers

### Error Handling
- Graceful degradation
- User-friendly error messages
- Detailed error logs
- Automatic retry for transient errors

### Security
- Encrypt API keys at rest
- HTTPS only
- Webhook signature validation
- Input sanitization
- SQL injection prevention

### Performance
- Cache frequently accessed data
- Batch API requests
- Background job processing
- Database indexing
- Pagination for large datasets

### Scalability
- Support multiple Mailchimp accounts
- Handle high-volume contact syncs
- Efficient webhook processing
- Queue-based architecture

---

## Success Metrics

### Integration Health
- Connection uptime > 99%
- Sync success rate > 95%
- API error rate < 1%
- Average sync duration < 5 minutes

### User Adoption
- % of users with Mailchimp configured
- Campaigns sent per week
- Contacts synced
- Automation usage

### Email Performance
- Average open rate
- Average click rate
- List growth rate
- Engagement improvement over time

---

**End of Specification**

This comprehensive specification covers all aspects of a modern, enterprise-level Mailchimp integration. Each feature has been designed with scalability, user experience, and best practices in mind.
