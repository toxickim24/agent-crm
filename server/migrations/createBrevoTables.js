import pool from '../config/database.js';

/**
 * Migration: Create Brevo Integration Tables
 *
 * This migration creates minimal tables needed for Brevo (Sendinblue) integration
 * - Stores API credentials per user
 * - Caches Brevo data (lists, campaigns) for performance
 * - All tables are READ-ONLY from Brevo's perspective
 */

async function createBrevoTables() {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    console.log('🚀 Creating Brevo integration tables...');

    // 1. Add Brevo API configuration to existing api_configs table
    console.log('📝 Adding Brevo columns to api_configs table...');

    // Check if columns already exist
    const [columns] = await connection.query(
      `SHOW COLUMNS FROM api_configs WHERE Field IN ('brevo_api_key', 'brevo_account_email')`
    );

    if (columns.length === 0) {
      await connection.query(`
        ALTER TABLE api_configs
        ADD COLUMN brevo_api_key VARCHAR(255) DEFAULT NULL COMMENT 'Brevo API Key',
        ADD COLUMN brevo_account_email VARCHAR(255) DEFAULT NULL COMMENT 'Brevo account email for reference'
      `);
      console.log('✅ Brevo columns added to api_configs');
    } else {
      console.log('✅ Brevo columns already exist in api_configs');
    }

    // 2. Create brevo_lists table (cache of lists from Brevo)
    console.log('📝 Creating brevo_lists table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS brevo_lists (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        brevo_list_id VARCHAR(50) NOT NULL COMMENT 'List ID from Brevo API',
        list_name VARCHAR(255) NOT NULL,
        total_subscribers INT DEFAULT 0,
        total_blacklisted INT DEFAULT 0,
        folder_id VARCHAR(50) DEFAULT NULL,
        last_synced_at TIMESTAMP NULL DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_list (user_id, brevo_list_id),
        INDEX idx_user_id (user_id),
        INDEX idx_last_synced (last_synced_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      COMMENT='Cached Brevo contact lists (read-only from Brevo)';
    `);

    // 3. Create brevo_contacts table (cache of contacts from Brevo)
    console.log('📝 Creating brevo_contacts table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS brevo_contacts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        brevo_contact_id VARCHAR(50) NOT NULL COMMENT 'Contact ID from Brevo',
        email VARCHAR(255) NOT NULL,
        list_ids JSON DEFAULT NULL COMMENT 'Array of Brevo list IDs this contact belongs to',
        attributes JSON DEFAULT NULL COMMENT 'Contact attributes from Brevo',
        email_blacklisted BOOLEAN DEFAULT FALSE,
        sms_blacklisted BOOLEAN DEFAULT FALSE,
        created_at_brevo TIMESTAMP NULL DEFAULT NULL COMMENT 'When contact was created in Brevo',
        modified_at_brevo TIMESTAMP NULL DEFAULT NULL COMMENT 'Last modified in Brevo',
        last_synced_at TIMESTAMP NULL DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_contact (user_id, email),
        INDEX idx_user_id (user_id),
        INDEX idx_email (email),
        INDEX idx_last_synced (last_synced_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      COMMENT='Cached Brevo contacts (read-only, pulled from Brevo API)';
    `);

    // 4. Create brevo_campaigns table (cache of email campaigns)
    console.log('📝 Creating brevo_campaigns table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS brevo_campaigns (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        brevo_campaign_id VARCHAR(50) NOT NULL COMMENT 'Campaign ID from Brevo',
        campaign_name VARCHAR(255) NOT NULL,
        subject VARCHAR(500) DEFAULT NULL,
        campaign_type VARCHAR(50) DEFAULT NULL COMMENT 'classic, trigger, ab_testing',
        campaign_status VARCHAR(50) DEFAULT NULL COMMENT 'draft, sent, queued, suspended, archive',
        sender_name VARCHAR(255) DEFAULT NULL,
        sender_email VARCHAR(255) DEFAULT NULL,
        sent_date TIMESTAMP NULL DEFAULT NULL,
        total_recipients INT DEFAULT 0,

        -- Statistics (pulled from Brevo)
        stats_sent INT DEFAULT 0,
        stats_delivered INT DEFAULT 0,
        stats_opens INT DEFAULT 0,
        stats_unique_opens INT DEFAULT 0,
        stats_clicks INT DEFAULT 0,
        stats_unique_clicks INT DEFAULT 0,
        stats_bounces INT DEFAULT 0,
        stats_hard_bounces INT DEFAULT 0,
        stats_soft_bounces INT DEFAULT 0,
        stats_unsubscribes INT DEFAULT 0,
        stats_spam_reports INT DEFAULT 0,

        -- Calculated metrics
        open_rate DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Percentage',
        click_rate DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Percentage',
        bounce_rate DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Percentage',

        last_synced_at TIMESTAMP NULL DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_campaign (user_id, brevo_campaign_id),
        INDEX idx_user_id (user_id),
        INDEX idx_campaign_status (campaign_status),
        INDEX idx_sent_date (sent_date),
        INDEX idx_last_synced (last_synced_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      COMMENT='Cached Brevo email campaigns with statistics (read-only)';
    `);

    // 5. Create brevo_sync_log table (track sync operations)
    console.log('📝 Creating brevo_sync_log table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS brevo_sync_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        sync_type VARCHAR(50) NOT NULL COMMENT 'lists, contacts, campaigns, statistics',
        sync_status VARCHAR(20) NOT NULL COMMENT 'success, failed, partial',
        records_synced INT DEFAULT 0,
        error_message TEXT DEFAULT NULL,
        sync_duration_ms INT DEFAULT NULL COMMENT 'Sync duration in milliseconds',
        synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_sync_type (sync_type),
        INDEX idx_synced_at (synced_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      COMMENT='Log of Brevo data synchronization operations';
    `);

    await connection.commit();
    console.log('✅ Brevo tables created successfully!');

    // Verify tables
    console.log('\n📊 Verifying created tables...');
    const [tables] = await connection.query(`
      SHOW TABLES LIKE 'brevo_%'
    `);
    console.log('Created tables:', tables.map(t => Object.values(t)[0]));

  } catch (error) {
    await connection.rollback();
    console.error('❌ Error creating Brevo tables:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Run migration
createBrevoTables()
  .then(() => {
    console.log('\n🎉 Brevo integration tables migration completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  });
