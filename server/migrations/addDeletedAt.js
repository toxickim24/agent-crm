import pool from '../config/database.js';

const addDeletedAtColumn = async () => {
  try {
    console.log('🔄 Checking for deleted_at column...');

    const connection = await pool.getConnection();

    // Check if deleted_at column exists
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'contacts'
      AND COLUMN_NAME = 'deleted_at'
    `);

    if (columns.length === 0) {
      console.log('➕ Adding deleted_at column to contacts table...');
      await connection.query(`
        ALTER TABLE contacts
        ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL AFTER updated_at
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

addDeletedAtColumn();
