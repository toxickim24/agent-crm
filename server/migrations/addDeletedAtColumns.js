import pool from '../config/database.js';

const addDeletedAtColumns = async () => {
  const connection = await pool.getConnection();

  try {
    console.log('🔄 Adding deleted_at columns to tables...');

    // Add deleted_at to users table
    const [usersColumns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'deleted_at'
    `);

    if (usersColumns.length === 0) {
      await connection.query(`ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP NULL`);
      console.log('✅ Added deleted_at to users table');
    } else {
      console.log('⏭️  deleted_at already exists in users table');
    }

    // Add deleted_at to lead_types table
    const [leadTypesColumns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'lead_types'
      AND COLUMN_NAME = 'deleted_at'
    `);

    if (leadTypesColumns.length === 0) {
      await connection.query(`ALTER TABLE lead_types ADD COLUMN deleted_at TIMESTAMP NULL`);
      console.log('✅ Added deleted_at to lead_types table');
    } else {
      console.log('⏭️  deleted_at already exists in lead_types table');
    }

    // Add deleted_at to statuses table
    const [statusesColumns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'statuses'
      AND COLUMN_NAME = 'deleted_at'
    `);

    if (statusesColumns.length === 0) {
      await connection.query(`ALTER TABLE statuses ADD COLUMN deleted_at TIMESTAMP NULL`);
      console.log('✅ Added deleted_at to statuses table');
    } else {
      console.log('⏭️  deleted_at already exists in statuses table');
    }

    // Add deleted_at to api_keys table
    const [apiKeysColumns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'api_keys'
      AND COLUMN_NAME = 'deleted_at'
    `);

    if (apiKeysColumns.length === 0) {
      await connection.query(`ALTER TABLE api_keys ADD COLUMN deleted_at TIMESTAMP NULL`);
      console.log('✅ Added deleted_at to api_keys table');
    } else {
      console.log('⏭️  deleted_at already exists in api_keys table');
    }

    console.log('🎉 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    connection.release();
    process.exit(0);
  }
};

addDeletedAtColumns();
