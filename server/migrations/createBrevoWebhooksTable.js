import pool from '../config/database.js';
import crypto from 'crypto';

/**
 * Migration: Create brevo_webhooks table
 *
 * This table stores user-specific webhook tokens for Brevo integration
 * Each user gets a unique webhook URL with a secure token
 */

async function createBrevoWebhooksTable() {
  try {
    console.log('Creating brevo_webhooks table...');

    // Create table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS brevo_webhooks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL UNIQUE,
        webhook_token VARCHAR(64) NOT NULL UNIQUE,
        webhook_url VARCHAR(255) NOT NULL,
        is_active TINYINT(1) DEFAULT 1,
        events_received INT DEFAULT 0,
        last_event_at DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_webhook_token (webhook_token),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ brevo_webhooks table created successfully');

    // Auto-generate webhook tokens for existing users with Brevo API keys
    console.log('🔄 Generating webhook tokens for existing users with Brevo API keys...');

    const [usersWithBrevo] = await pool.query(`
      SELECT DISTINCT u.id, u.email
      FROM users u
      INNER JOIN api_configs ac ON u.id = ac.user_id
      WHERE ac.brevo_api_key IS NOT NULL
      AND ac.brevo_api_key != ''
    `);

    if (usersWithBrevo.length > 0) {
      for (const user of usersWithBrevo) {
        const token = crypto.randomBytes(32).toString('hex');
        const webhookUrl = `https://your-domain.com/api/webhooks/brevo/${token}`;

        try {
          await pool.query(`
            INSERT INTO brevo_webhooks (user_id, webhook_token, webhook_url)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE webhook_token = webhook_token
          `, [user.id, token, webhookUrl]);

          console.log(`✅ Generated webhook for user ${user.id} (${user.email})`);
        } catch (err) {
          console.log(`⏭️ Webhook already exists for user ${user.id}`);
        }
      }
    } else {
      console.log('ℹ️ No users with Brevo API keys found');
    }

    // Verify table structure
    const [columns] = await pool.query('DESCRIBE brevo_webhooks');
    console.log('✅ Table structure:');
    console.table(columns);

  } catch (error) {
    console.error('❌ Error creating brevo_webhooks table:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run migration
createBrevoWebhooksTable()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
