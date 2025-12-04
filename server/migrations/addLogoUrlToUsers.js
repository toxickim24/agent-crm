import pool from '../config/database.js';

const addLogoUrlToUsers = async () => {
  try {
    console.log('🔄 Adding logo_url column to users table...');

    const connection = await pool.getConnection();

    // Check if logo_url column exists
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'logo_url'
    `);

    if (columns.length > 0) {
      console.log('✅ logo_url column already exists');
      connection.release();
      process.exit(0);
    }

    console.log('📋 Adding logo_url column to users table...');

    // Add logo_url column
    await connection.query(`
      ALTER TABLE users
      ADD COLUMN logo_url VARCHAR(500) NULL AFTER product_updates
    `);

    console.log('✅ logo_url column added successfully');

    connection.release();
    console.log('✅ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
};

addLogoUrlToUsers();
