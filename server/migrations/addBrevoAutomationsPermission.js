import pool from '../config/database.js';

/**
 * Migration: Add brevo_view_automations permission
 *
 * Adds a new permission column to allow/restrict access to the Brevo Automations dashboard.
 */
async function up() {
  const connection = await pool.getConnection();
  try {
    console.log('Adding brevo_view_automations permission column...');

    // Check if column already exists
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'permissions'
        AND COLUMN_NAME = 'brevo_view_automations'
    `);

    if (columns.length > 0) {
      console.log('⚠️  Column brevo_view_automations already exists, skipping...');
    } else {
      // Add the column
      await connection.query(`
        ALTER TABLE permissions
        ADD COLUMN brevo_view_automations TINYINT(1) DEFAULT 0 AFTER brevo_view_time_analysis
      `);
      console.log('✅ brevo_view_automations column added successfully');
    }

    // Update all existing users to have the permission enabled by default
    const [result] = await connection.query(`
      UPDATE permissions
      SET brevo_view_automations = 1
      WHERE brevo = 1
    `);

    console.log(`✅ Enabled brevo_view_automations for ${result.affectedRows} users with Brevo access`);

  } catch (error) {
    console.error('❌ Error adding brevo_view_automations permission:', error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Rollback migration
 */
async function down() {
  const connection = await pool.getConnection();
  try {
    console.log('Removing brevo_view_automations column...');
    await connection.query('ALTER TABLE permissions DROP COLUMN IF EXISTS brevo_view_automations');
    console.log('✅ brevo_view_automations column removed successfully');
  } catch (error) {
    console.error('❌ Error removing brevo_view_automations column:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    await up();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

export { up, down };
