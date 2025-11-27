import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const addMailersPermissions = async () => {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'agent_crm'
    });

    console.log('🔄 Adding granular mailers permissions to permissions table...\n');

    // Check if columns already exist
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'permissions'
      AND COLUMN_NAME IN ('mailer_import', 'mailer_add', 'mailer_sync_all', 'mailer_view', 'mailer_sync', 'mailer_start', 'mailer_pause', 'mailer_end', 'mailer_delete')
    `);

    if (columns.length > 0) {
      console.log('⚠️  Mailers permissions already exist. Skipping migration.');
      return;
    }

    // Add new mailer permission columns
    console.log('➕ Adding granular mailer permission columns...');
    await connection.query(`
      ALTER TABLE permissions
      ADD COLUMN mailer_import BOOLEAN DEFAULT 1 AFTER mailers,
      ADD COLUMN mailer_add BOOLEAN DEFAULT 1 AFTER mailer_import,
      ADD COLUMN mailer_sync_all BOOLEAN DEFAULT 1 AFTER mailer_add,
      ADD COLUMN mailer_view BOOLEAN DEFAULT 1 AFTER mailer_sync_all,
      ADD COLUMN mailer_sync BOOLEAN DEFAULT 1 AFTER mailer_view,
      ADD COLUMN mailer_start BOOLEAN DEFAULT 1 AFTER mailer_sync,
      ADD COLUMN mailer_pause BOOLEAN DEFAULT 1 AFTER mailer_start,
      ADD COLUMN mailer_end BOOLEAN DEFAULT 1 AFTER mailer_pause,
      ADD COLUMN mailer_delete BOOLEAN DEFAULT 1 AFTER mailer_end
    `);

    // Set default values for existing records
    console.log('🔄 Setting default values for existing records...');
    await connection.query(`
      UPDATE permissions
      SET
        mailer_import = 1,
        mailer_add = 1,
        mailer_sync_all = 1,
        mailer_view = 1,
        mailer_sync = 1,
        mailer_start = 1,
        mailer_pause = 1,
        mailer_end = 1,
        mailer_delete = 1
      WHERE mailer_import IS NULL
    `);

    console.log('\n✅ Mailers permissions added successfully!\n');
    console.log('📋 New permission columns:');
    console.log('─'.repeat(50));
    console.log('   • mailer_import     - Import contacts by lead type');
    console.log('   • mailer_add        - Add individual contacts');
    console.log('   • mailer_sync_all   - Sync all contacts');
    console.log('   • mailer_view       - View contact details');
    console.log('   • mailer_sync       - Sync individual contact');
    console.log('   • mailer_start      - Start mail sequence');
    console.log('   • mailer_pause      - Pause mail sequence');
    console.log('   • mailer_end        - End mail sequence');
    console.log('   • mailer_delete     - Delete/remove from mailers');
    console.log('─'.repeat(50));

  } catch (error) {
    console.error('❌ Error adding mailers permissions:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

addMailersPermissions();
