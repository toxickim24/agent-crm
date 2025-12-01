import pool from '../config/database.js';

const addEmailPermissions = async () => {
  try {
    console.log('🔄 Adding email permissions columns to permissions table...');

    const connection = await pool.getConnection();

    // Add email permission columns to permissions table
    const emailPermissions = [
      'email_sync_contacts',
      'email_sync_campaigns',
      'email_view_campaign',
      'email_export_csv',
      'email_archive_campaign',
      'email_delete_campaign'
    ];

    for (const permission of emailPermissions) {
      try {
        await connection.query(`
          ALTER TABLE permissions
          ADD COLUMN ${permission} BOOLEAN DEFAULT 1
        `);
        console.log(`✅ Added column to permissions table: ${permission}`);
      } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
          console.log(`⏭️  Column ${permission} already exists, skipping`);
        } else {
          throw error;
        }
      }
    }

    connection.release();
    console.log('✅ Email permissions migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
};

addEmailPermissions();
