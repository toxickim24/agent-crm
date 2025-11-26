import pool from '../config/database.js';

const addMailerCampaignId = async () => {
  try {
    console.log('🔄 Adding mailer_campaign_id column to api_configs table...');

    const connection = await pool.getConnection();

    // Check if column exists
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'api_configs'
      AND COLUMN_NAME = 'mailer_campaign_id'
    `);

    if (columns.length === 0) {
      console.log('➕ Adding mailer_campaign_id column...');
      await connection.query(`
        ALTER TABLE api_configs
        ADD COLUMN mailer_campaign_id VARCHAR(255) AFTER dealmachine_get_lead
      `);
      console.log('✅ mailer_campaign_id column added successfully');
    } else {
      console.log('✅ mailer_campaign_id column already exists');
    }

    connection.release();
    console.log('✅ Migration completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
};

addMailerCampaignId();
