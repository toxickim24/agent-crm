import pool from '../config/database.js';

const addCampaignRateMetrics = async () => {
  try {
    console.log('🔄 Adding unsubscribe_rate and delivery_rate to mailchimp_campaigns table...');

    const connection = await pool.getConnection();

    // Check if columns already exist
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'mailchimp_campaigns'
        AND COLUMN_NAME IN ('unsubscribe_rate', 'delivery_rate')
    `);

    const existingColumns = columns.map(col => col.COLUMN_NAME);

    // Add unsubscribe_rate if it doesn't exist
    if (!existingColumns.includes('unsubscribe_rate')) {
      console.log('📋 Adding unsubscribe_rate column...');
      await connection.query(`
        ALTER TABLE mailchimp_campaigns
        ADD COLUMN unsubscribe_rate DECIMAL(5,2) DEFAULT 0.00
        AFTER click_rate
      `);
      console.log('✅ unsubscribe_rate column added');
    } else {
      console.log('ℹ️  unsubscribe_rate column already exists');
    }

    // Add delivery_rate if it doesn't exist
    if (!existingColumns.includes('delivery_rate')) {
      console.log('📋 Adding delivery_rate column...');
      await connection.query(`
        ALTER TABLE mailchimp_campaigns
        ADD COLUMN delivery_rate DECIMAL(5,2) DEFAULT 0.00
        AFTER unsubscribe_rate
      `);
      console.log('✅ delivery_rate column added');
    } else {
      console.log('ℹ️  delivery_rate column already exists');
    }

    connection.release();

    console.log('');
    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('📊 Changes made:');
    console.log('  ✓ Added unsubscribe_rate column (DECIMAL(5,2))');
    console.log('  ✓ Added delivery_rate column (DECIMAL(5,2))');
    console.log('');
    console.log('🎯 mailchimp_campaigns table now includes delivery and unsubscribe rate metrics!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
};

addCampaignRateMetrics();
