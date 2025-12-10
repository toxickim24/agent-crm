import pool from '../config/database.js';

/**
 * Migration: Rename campaign_activity to brevo_campaign_activity
 *
 * This migration renames the campaign_activity table to brevo_campaign_activity
 * to better namespace Brevo-related tables.
 */

async function renameCampaignActivityTable() {
  const connection = await pool.getConnection();

  try {
    console.log('Starting migration: Rename campaign_activity to brevo_campaign_activity');

    // Check if old table exists
    const [oldTableCheck] = await connection.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      AND table_name = 'campaign_activity'
    `);

    if (oldTableCheck[0].count === 0) {
      console.log('❌ Table campaign_activity does not exist. Nothing to rename.');
      return;
    }

    // Check if new table already exists
    const [newTableCheck] = await connection.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      AND table_name = 'brevo_campaign_activity'
    `);

    if (newTableCheck[0].count > 0) {
      console.log('❌ Table brevo_campaign_activity already exists. Aborting to prevent data loss.');
      return;
    }

    // Get row count before rename
    const [countResult] = await connection.query('SELECT COUNT(*) as count FROM campaign_activity');
    const rowCount = countResult[0].count;
    console.log(`📊 Found ${rowCount} rows in campaign_activity table`);

    // Rename the table
    console.log('🔄 Renaming table...');
    await connection.query('RENAME TABLE campaign_activity TO brevo_campaign_activity');

    // Verify the rename
    const [verifyOld] = await connection.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      AND table_name = 'campaign_activity'
    `);

    const [verifyNew] = await connection.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      AND table_name = 'brevo_campaign_activity'
    `);

    const [verifyCount] = await connection.query('SELECT COUNT(*) as count FROM brevo_campaign_activity');

    if (verifyOld[0].count === 0 && verifyNew[0].count === 1 && verifyCount[0].count === rowCount) {
      console.log('✅ Table successfully renamed from campaign_activity to brevo_campaign_activity');
      console.log(`✅ Verified: ${verifyCount[0].count} rows preserved`);
    } else {
      console.log('❌ Verification failed. Please check database manually.');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    connection.release();
  }
}

// Run migration
renameCampaignActivityTable()
  .then(() => {
    console.log('Migration completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration error:', error);
    process.exit(1);
  });
