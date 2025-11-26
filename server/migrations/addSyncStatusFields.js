import pool from '../config/database.js';

const addSyncStatusFields = async () => {
  try {
    console.log('🔄 Adding sync_status and sync_error fields to mailers_contacts...');

    const connection = await pool.getConnection();

    // Add sync_status column
    console.log('➕ Adding sync_status column...');
    await connection.query(`
      ALTER TABLE mailers_contacts
      ADD COLUMN sync_status VARCHAR(20) DEFAULT 'Pending' AFTER cost,
      ADD COLUMN sync_error TEXT DEFAULT NULL AFTER sync_status,
      ADD COLUMN last_sync_date DATETIME DEFAULT NULL AFTER sync_error
    `);

    console.log('✅ Columns added successfully');

    connection.release();
    console.log('✅ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('⚠️  Columns already exist, skipping...');
      process.exit(0);
    } else {
      console.error('❌ Migration error:', error);
      process.exit(1);
    }
  }
};

addSyncStatusFields();
