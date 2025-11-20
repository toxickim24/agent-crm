import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const addGranularPermissions = async () => {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'agent_crm'
    });

    console.log('🔄 Adding granular permissions to permissions table...\n');

    // Check if columns already exist
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'permissions'
      AND COLUMN_NAME IN ('contact_view', 'contact_add', 'contact_edit', 'contact_delete', 'contact_import', 'contact_export')
    `);

    if (columns.length > 0) {
      console.log('⚠️  Granular permissions already exist. Skipping migration.');
      return;
    }

    // Add new contact permission columns
    console.log('➕ Adding granular contact permission columns...');
    await connection.query(`
      ALTER TABLE permissions
      ADD COLUMN contact_view BOOLEAN DEFAULT 1 AFTER contacts,
      ADD COLUMN contact_add BOOLEAN DEFAULT 1 AFTER contact_view,
      ADD COLUMN contact_edit BOOLEAN DEFAULT 1 AFTER contact_add,
      ADD COLUMN contact_delete BOOLEAN DEFAULT 1 AFTER contact_edit,
      ADD COLUMN contact_import BOOLEAN DEFAULT 1 AFTER contact_delete,
      ADD COLUMN contact_export BOOLEAN DEFAULT 1 AFTER contact_import
    `);

    // Add filter permissions (JSON column to store allowed lead type IDs)
    console.log('➕ Adding filter permission columns...');
    await connection.query(`
      ALTER TABLE permissions
      ADD COLUMN allowed_lead_types JSON DEFAULT NULL AFTER contact_export
    `);

    // Set default values for existing records
    console.log('🔄 Setting default values for existing records...');
    await connection.query(`
      UPDATE permissions
      SET
        contact_view = 1,
        contact_add = 1,
        contact_edit = 1,
        contact_delete = 1,
        contact_import = 1,
        contact_export = 1,
        allowed_lead_types = NULL
      WHERE contact_view IS NULL
    `);

    console.log('\n✅ Granular permissions added successfully!\n');
    console.log('📋 New permission columns:');
    console.log('─'.repeat(50));
    console.log('   • contact_view      - View contacts');
    console.log('   • contact_add       - Add new contacts');
    console.log('   • contact_edit      - Edit existing contacts');
    console.log('   • contact_delete    - Delete contacts');
    console.log('   • contact_import    - Import contacts from CSV');
    console.log('   • contact_export    - Export contacts to CSV');
    console.log('   • allowed_lead_types - Filter contacts by lead types');
    console.log('─'.repeat(50));

  } catch (error) {
    console.error('❌ Error adding granular permissions:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

addGranularPermissions();
