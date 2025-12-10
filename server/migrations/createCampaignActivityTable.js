import pool from '../config/database.js';

/**
 * Migration: Create brevo_campaign_activity table
 *
 * This table tracks individual email engagement events (opens, clicks)
 * for advanced analytics like time-of-day analysis and engagement scoring.
 */

async function createCampaignActivityTable() {
  try {
    console.log('Creating brevo_campaign_activity table...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS brevo_campaign_activity (
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ brevo_campaign_activity table created successfully');

    // Check if table was created
    const [tables] = await pool.query(`
      SHOW TABLES LIKE 'brevo_campaign_activity'
    `);

    if (tables.length > 0) {
      console.log('✅ Verified: brevo_campaign_activity table exists');

      // Show table structure
      const [columns] = await pool.query(`
        DESCRIBE brevo_campaign_activity
      `);
      console.log('Table structure:');
      console.table(columns);
    } else {
      console.error('❌ Error: brevo_campaign_activity table was not created');
    }

  } catch (error) {
    console.error('❌ Error creating brevo_campaign_activity table:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run migration
createCampaignActivityTable()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
