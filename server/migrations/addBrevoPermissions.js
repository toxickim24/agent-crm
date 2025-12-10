import pool from '../config/database.js';

/**
 * Migration: Add Brevo Permissions
 *
 * Adds granular read-only permissions for Brevo integration
 * Following the same pattern as existing Mailchimp permissions
 */

async function addBrevoPermissions() {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    console.log('🚀 Adding Brevo permission columns...');

    // Check if columns already exist
    const [columns] = await connection.query(
      `SHOW COLUMNS FROM permissions WHERE Field LIKE 'brevo%'`
    );

    if (columns.length === 0) {
      // Add Brevo permission columns to permissions table
      await connection.query(`
        ALTER TABLE permissions
        ADD COLUMN brevo TINYINT(1) DEFAULT 1 COMMENT 'Access to Brevo tab',
        ADD COLUMN brevo_view_contacts TINYINT(1) DEFAULT 1 COMMENT 'View Brevo contacts',
        ADD COLUMN brevo_view_lists TINYINT(1) DEFAULT 1 COMMENT 'View Brevo lists',
        ADD COLUMN brevo_view_campaigns TINYINT(1) DEFAULT 1 COMMENT 'View Brevo campaigns',
        ADD COLUMN brevo_view_stats TINYINT(1) DEFAULT 1 COMMENT 'View Brevo statistics',
        ADD COLUMN brevo_sync_data TINYINT(1) DEFAULT 1 COMMENT 'Sync/refresh Brevo data',
        ADD COLUMN brevo_export_csv TINYINT(1) DEFAULT 1 COMMENT 'Export Brevo data to CSV',
        ADD COLUMN brevo_edit_settings TINYINT(1) DEFAULT 0 COMMENT 'Edit Brevo API settings (admin only)'
      `);
      console.log('✅ Brevo permissions added successfully!');
    } else {
      console.log('✅ Brevo permissions already exist');
    }

    // Display current permissions structure
    console.log('\n📊 Verifying permissions table structure...');
    const [brevoColumns] = await connection.query(`
      SHOW COLUMNS FROM permissions WHERE Field LIKE 'brevo%'
    `);
    console.log('Brevo permission columns:', brevoColumns.map(c => c.Field));

    await connection.commit();

  } catch (error) {
    await connection.rollback();
    console.error('❌ Error adding Brevo permissions:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Run migration
addBrevoPermissions()
  .then(() => {
    console.log('\n🎉 Brevo permissions migration completed!');
    console.log('\n📝 Note: All existing users will have Brevo permissions enabled by default.');
    console.log('   Admin users can modify these permissions via the admin dashboard.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  });
