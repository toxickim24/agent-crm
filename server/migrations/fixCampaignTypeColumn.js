import pool from '../config/database.js';

const fixCampaignTypeColumn = async () => {
  try {
    console.log('🔄 Fixing mailchimp_campaigns type column...');

    const connection = await pool.getConnection();

    // Expand the type column to handle longer campaign types like 'automation-email'
    await connection.query(`
      ALTER TABLE mailchimp_campaigns
      MODIFY COLUMN type VARCHAR(50)
    `);

    console.log('✅ Fixed type column - now supports longer campaign types');

    connection.release();
    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
};

fixCampaignTypeColumn();
