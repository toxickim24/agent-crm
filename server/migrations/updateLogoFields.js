import pool from '../config/database.js';

const updateLogoFields = async () => {
  try {
    console.log('🔄 Updating logo fields in users table...');

    const connection = await pool.getConnection();

    // Check if logo_url_light and logo_url_dark columns exist
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME IN ('logo_url_light', 'logo_url_dark')
    `);

    if (columns.length === 2) {
      console.log('✅ logo_url_light and logo_url_dark columns already exist');
      connection.release();
      process.exit(0);
    }

    console.log('📋 Modifying users table for light/dark mode logos...');

    // Check if old logo_url column exists
    const [oldColumns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'logo_url'
    `);

    if (oldColumns.length > 0) {
      // Rename logo_url to logo_url_light
      console.log('📋 Renaming logo_url to logo_url_light...');
      await connection.query(`
        ALTER TABLE users
        CHANGE COLUMN logo_url logo_url_light VARCHAR(500) NULL
      `);
    } else {
      // Add logo_url_light column
      console.log('📋 Adding logo_url_light column...');
      await connection.query(`
        ALTER TABLE users
        ADD COLUMN logo_url_light VARCHAR(500) NULL AFTER product_updates
      `);
    }

    // Check if logo_url_dark exists
    const [darkColumns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'logo_url_dark'
    `);

    if (darkColumns.length === 0) {
      // Add logo_url_dark column
      console.log('📋 Adding logo_url_dark column...');
      await connection.query(`
        ALTER TABLE users
        ADD COLUMN logo_url_dark VARCHAR(500) NULL AFTER logo_url_light
      `);
    }

    console.log('✅ Logo fields updated successfully');

    connection.release();
    console.log('✅ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
};

updateLogoFields();
