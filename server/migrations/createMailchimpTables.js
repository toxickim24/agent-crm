import pool from '../config/database.js';

const createMailchimpTables = async () => {
  try {
    console.log('🔄 Creating Mailchimp integration tables...');

    const connection = await pool.getConnection();

    // Disable foreign key checks temporarily
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    // 1. Create mailchimp_configs table
    console.log('📋 Creating mailchimp_configs table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS mailchimp_configs (
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
        webhook_events JSON,

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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ mailchimp_configs table created');

    // 2. Create mailchimp_campaigns table
    console.log('📋 Creating mailchimp_campaigns table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS mailchimp_campaigns (
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ mailchimp_campaigns table created');

    // 3. Create mailchimp_audiences table
    console.log('📋 Creating mailchimp_audiences table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS mailchimp_audiences (
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ mailchimp_audiences table created');

    // 4. Create mailchimp_contacts table
    console.log('📋 Creating mailchimp_contacts table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS mailchimp_contacts (
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
        merge_fields JSON,
        interests JSON,

        -- Stats
        stats JSON,

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
        tags JSON,

        -- Location
        location JSON,

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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ mailchimp_contacts table created');

    // 5. Create mailchimp_automations table
    console.log('📋 Creating mailchimp_automations table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS mailchimp_automations (
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
        trigger_settings JSON,

        -- Recipients
        list_id VARCHAR(100),
        segment_id VARCHAR(100),

        -- Stats
        emails_sent INT DEFAULT 0,
        recipients JSON,

        -- Settings
        settings JSON,

        -- Tracking
        tracking JSON,

        -- Report Summary
        report_summary JSON,

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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ mailchimp_automations table created');

    // 6. Create mailchimp_templates table
    console.log('📋 Creating mailchimp_templates table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS mailchimp_templates (
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ mailchimp_templates table created');

    // 7. Create mailchimp_activity_logs table
    console.log('📋 Creating mailchimp_activity_logs table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS mailchimp_activity_logs (
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ mailchimp_activity_logs table created');

    // 8. Create mailchimp_segments table
    console.log('📋 Creating mailchimp_segments table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS mailchimp_segments (
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
        options JSON,

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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ mailchimp_segments table created');

    // Re-enable foreign key checks
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    connection.release();
    console.log('✅ All Mailchimp tables created successfully!');
    console.log('');
    console.log('📊 Tables created:');
    console.log('  ✓ mailchimp_configs');
    console.log('  ✓ mailchimp_campaigns');
    console.log('  ✓ mailchimp_audiences');
    console.log('  ✓ mailchimp_contacts');
    console.log('  ✓ mailchimp_automations');
    console.log('  ✓ mailchimp_templates');
    console.log('  ✓ mailchimp_activity_logs');
    console.log('  ✓ mailchimp_segments');
    console.log('');
    console.log('✅ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
};

createMailchimpTables();
