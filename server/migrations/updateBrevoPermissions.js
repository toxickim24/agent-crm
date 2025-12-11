import pool from '../config/database.js';

/**
 * Migration: Update Brevo Permissions
 *
 * Adds new permissions for the updated Brevo Analytics dashboards:
 * - Overview Dashboard
 * - Event Log & Live Feed
 * - Time-of-Day Analysis
 * - Renames export_csv to export_data
 */

async function updateBrevoPermissions() {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    console.log('🚀 Updating Brevo permission columns...');

    // Check which columns already exist
    const [columns] = await connection.query(
      `SHOW COLUMNS FROM permissions WHERE Field LIKE 'brevo%'`
    );
    const existingColumns = columns.map(c => c.Field);
    console.log('Existing Brevo columns:', existingColumns);

    const columnsToAdd = [];

    // 1. Add brevo_view_dashboard if it doesn't exist
    if (!existingColumns.includes('brevo_view_dashboard')) {
      columnsToAdd.push(
        "ADD COLUMN brevo_view_dashboard TINYINT(1) DEFAULT 1 COMMENT 'View Overview Dashboard'"
      );
    }

    // 2. Add brevo_view_events if it doesn't exist
    if (!existingColumns.includes('brevo_view_events')) {
      columnsToAdd.push(
        "ADD COLUMN brevo_view_events TINYINT(1) DEFAULT 1 COMMENT 'View Event Log and Live Feed'"
      );
    }

    // 3. Add brevo_view_time_analysis if it doesn't exist
    if (!existingColumns.includes('brevo_view_time_analysis')) {
      columnsToAdd.push(
        "ADD COLUMN brevo_view_time_analysis TINYINT(1) DEFAULT 1 COMMENT 'View Time-of-Day Analysis'"
      );
    }

    // 4. Add brevo_export_data if it doesn't exist (new name for export)
    if (!existingColumns.includes('brevo_export_data')) {
      columnsToAdd.push(
        "ADD COLUMN brevo_export_data TINYINT(1) DEFAULT 1 COMMENT 'Export Brevo data'"
      );
    }

    // Execute ALTER TABLE if there are columns to add
    if (columnsToAdd.length > 0) {
      const alterQuery = `ALTER TABLE permissions ${columnsToAdd.join(', ')}`;
      await connection.query(alterQuery);
      console.log(`✅ Added ${columnsToAdd.length} new permission column(s)`);
    } else {
      console.log('✅ All new permissions already exist');
    }

    // 5. Copy data from brevo_export_csv to brevo_export_data if both exist
    if (existingColumns.includes('brevo_export_csv') &&
        (columnsToAdd.some(col => col.includes('brevo_export_data')) ||
         existingColumns.includes('brevo_export_data'))) {
      await connection.query(`
        UPDATE permissions
        SET brevo_export_data = brevo_export_csv
        WHERE brevo_export_csv IS NOT NULL
      `);
      console.log('✅ Copied values from brevo_export_csv to brevo_export_data');
    }

    // Display updated permissions structure
    console.log('\n📊 Verifying updated permissions table structure...');
    const [updatedColumns] = await connection.query(`
      SHOW COLUMNS FROM permissions WHERE Field LIKE 'brevo%'
    `);
    console.log('\nAll Brevo permission columns:');
    updatedColumns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} (Default: ${col.Default})`);
    });

    await connection.commit();

  } catch (error) {
    await connection.rollback();
    console.error('❌ Error updating Brevo permissions:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Run migration
updateBrevoPermissions()
  .then(() => {
    console.log('\n🎉 Brevo permissions update completed!');
    console.log('\n📝 New permissions added:');
    console.log('   - brevo_view_dashboard (Overview Dashboard)');
    console.log('   - brevo_view_events (Event Log & Live Feed)');
    console.log('   - brevo_view_time_analysis (Time-of-Day Analysis)');
    console.log('   - brevo_export_data (Export functionality)');
    console.log('\n✨ All existing users will have these new permissions enabled by default.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  });
