import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const runMigration = async () => {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'agent_crm'
    });

    console.log('🔗 Connected to database');

    // Check if columns exist before dropping
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = 'api_configs'
      AND COLUMN_NAME IN ('mailchimp_api_key', 'mailchimp_server_prefix')
    `, [process.env.DB_NAME || 'agent_crm']);

    if (columns.length === 0) {
      console.log('ℹ️  Mailchimp columns already removed from api_configs table');
      return;
    }

    console.log(`📋 Found ${columns.length} Mailchimp column(s) to remove`);

    // Drop mailchimp_api_key column if exists
    if (columns.some(col => col.COLUMN_NAME === 'mailchimp_api_key')) {
      await connection.query('ALTER TABLE api_configs DROP COLUMN mailchimp_api_key');
      console.log('✅ Removed mailchimp_api_key column');
    }

    // Drop mailchimp_server_prefix column if exists
    if (columns.some(col => col.COLUMN_NAME === 'mailchimp_server_prefix')) {
      await connection.query('ALTER TABLE api_configs DROP COLUMN mailchimp_server_prefix');
      console.log('✅ Removed mailchimp_server_prefix column');
    }

    console.log('🎉 Migration completed successfully!');
    console.log('ℹ️  Mailchimp configuration is now managed in the dedicated Mailchimp admin page');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
};

runMigration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
