import pool from '../config/database.js';

/**
 * Migration: Remove brevo_edit_settings permission column
 *
 * This migration removes the brevo_edit_settings column from the permissions table
 * as this functionality is now restricted to admins only via role check.
 */

async function up() {
  try {
    console.log('🔄 Removing brevo_edit_settings column from permissions table...');

    // Check if column exists before dropping
    const [columns] = await pool.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'permissions'
      AND COLUMN_NAME = 'brevo_edit_settings'
    `);

    if (columns.length > 0) {
      await pool.query(`
        ALTER TABLE permissions
        DROP COLUMN brevo_edit_settings
      `);
      console.log('✅ Successfully removed brevo_edit_settings column');
    } else {
      console.log('ℹ️  Column brevo_edit_settings does not exist, skipping...');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

async function down() {
  try {
    console.log('🔄 Restoring brevo_edit_settings column...');

    // Check if column exists before adding
    const [columns] = await pool.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'permissions'
      AND COLUMN_NAME = 'brevo_edit_settings'
    `);

    if (columns.length === 0) {
      await pool.query(`
        ALTER TABLE permissions
        ADD COLUMN brevo_edit_settings TINYINT(1) DEFAULT 0 COMMENT 'Edit Brevo API settings (admin only)'
      `);
      console.log('✅ Successfully restored brevo_edit_settings column');
    } else {
      console.log('ℹ️  Column brevo_edit_settings already exists, skipping...');
    }

  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  }
}

// Run migration if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    await up();
    console.log('✅ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

export { up, down };
