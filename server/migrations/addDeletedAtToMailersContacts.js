import pool from '../config/database.js';

const addDeletedAtToMailersContacts = async () => {
  try {
    console.log('🔄 Adding deleted_at column to mailers_contacts table...');

    const connection = await pool.getConnection();

    // Check if deleted_at column already exists
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'mailers_contacts'
      AND COLUMN_NAME = 'deleted_at'
    `);

    if (columns.length === 0) {
      console.log('➕ Adding deleted_at column...');
      await connection.query(`
        ALTER TABLE mailers_contacts
        ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL AFTER updated_at,
        ADD INDEX idx_deleted_at (deleted_at)
      `);
      console.log('✅ deleted_at column added successfully');
    } else {
      console.log('✅ deleted_at column already exists');
    }

    connection.release();
    console.log('✅ Migration completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
};

addDeletedAtToMailersContacts();
