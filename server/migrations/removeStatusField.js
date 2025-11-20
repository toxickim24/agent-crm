import pool from '../config/database.js';

async function removeStatusField() {
  const connection = await pool.getConnection();

  try {
    console.log('🔧 Starting migration: Remove status field from contacts table...');

    // Check if status column exists
    const [columns] = await connection.query(`
      SHOW COLUMNS FROM contacts LIKE 'status'
    `);

    if (columns.length > 0) {
      // Remove the status column
      await connection.query(`
        ALTER TABLE contacts DROP COLUMN status
      `);
      console.log('✅ Removed status column from contacts table');
    } else {
      console.log('ℹ️  Status column already removed');
    }

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    connection.release();
  }
}

removeStatusField()
  .then(() => {
    console.log('✅ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration error:', error);
    process.exit(1);
  });
