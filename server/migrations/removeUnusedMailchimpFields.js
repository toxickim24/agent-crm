import pool from '../config/database.js';

const removeUnusedMailchimpFields = async () => {
  try {
    console.log('🔄 Removing unused fields from mailchimp_configs table...');

    const connection = await pool.getConnection();

    // Check if columns exist before attempting to drop them
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'mailchimp_configs'
        AND COLUMN_NAME IN (
          'default_from_name',
          'default_from_email',
          'default_reply_to',
          'auto_sync_enabled',
          'sync_frequency_minutes',
          'enable_campaigns',
          'enable_automations',
          'enable_transactional',
          'enable_ab_testing'
        )
    `);

    if (columns.length === 0) {
      console.log('✅ Columns already removed or do not exist');
      connection.release();
      process.exit(0);
    }

    console.log(`📋 Found ${columns.length} columns to remove:`, columns.map(c => c.COLUMN_NAME).join(', '));

    // Drop the unused columns one by one
    const columnsToRemove = [
      'default_from_name',
      'default_from_email',
      'default_reply_to',
      'auto_sync_enabled',
      'sync_frequency_minutes',
      'enable_campaigns',
      'enable_automations',
      'enable_transactional',
      'enable_ab_testing'
    ];

    for (const columnName of columnsToRemove) {
      const columnExists = columns.some(c => c.COLUMN_NAME === columnName);
      if (columnExists) {
        console.log(`  Dropping column: ${columnName}`);
        await connection.query(`ALTER TABLE mailchimp_configs DROP COLUMN ${columnName}`);
      }
    }

    console.log('✅ Unused fields removed successfully');

    connection.release();
    console.log('✅ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
};

removeUnusedMailchimpFields();
