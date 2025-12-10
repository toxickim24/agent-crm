import pool from '../config/database.js';

/**
 * Migration: Add Mailchimp columns to api_configs
 */

async function addMailchimpColumns() {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    console.log('🔍 Checking api_configs table for Mailchimp columns...');

    // Check if columns already exist
    const [columns] = await connection.query(
      `SHOW COLUMNS FROM api_configs WHERE Field IN ('mailchimp_api_key', 'mailchimp_server_prefix')`
    );

    if (columns.length === 0) {
      console.log('❌ Mailchimp columns missing! Adding them now...');

      await connection.query(`
        ALTER TABLE api_configs
        ADD COLUMN mailchimp_api_key VARCHAR(255) DEFAULT NULL COMMENT 'Mailchimp API Key',
        ADD COLUMN mailchimp_server_prefix VARCHAR(50) DEFAULT NULL COMMENT 'Mailchimp Server Prefix (e.g., us1, us2)'
      `);

      console.log('✅ Mailchimp columns added successfully to api_configs!');
    } else {
      console.log('✅ Mailchimp columns already exist in api_configs');
      console.log('   Found columns:', columns.map(c => c.Field).join(', '));
    }

    await connection.commit();

  } catch (error) {
    await connection.rollback();
    console.error('❌ Error adding Mailchimp columns:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Run migration
addMailchimpColumns()
  .then(() => {
    console.log('\n🎉 Mailchimp columns migration completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  });
