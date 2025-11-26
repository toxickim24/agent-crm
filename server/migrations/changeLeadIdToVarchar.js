import pool from '../config/database.js';

const changeLeadIdToVarchar = async () => {
  try {
    console.log('🔄 Changing lead_id column in mailers_contacts to VARCHAR...');

    const connection = await pool.getConnection();

    // First, check and drop the unique constraint if it exists
    console.log('➖ Dropping unique_user_lead constraint if exists...');
    try {
      await connection.query(`
        ALTER TABLE mailers_contacts
        DROP INDEX unique_user_lead
      `);
      console.log('✅ Constraint dropped');
    } catch (err) {
      if (err.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
        console.log('⚠️  Constraint does not exist, skipping...');
      } else {
        throw err;
      }
    }

    // Clear existing data (since we're changing the structure)
    console.log('🗑️  Clearing existing mailers_contacts data...');
    await connection.query('TRUNCATE TABLE mailers_contacts');

    // Change lead_id from INT to VARCHAR(100) to avoid key length issues
    console.log('🔧 Changing lead_id column type to VARCHAR(100)...');
    await connection.query(`
      ALTER TABLE mailers_contacts
      MODIFY COLUMN lead_id VARCHAR(100) NOT NULL
    `);

    // Re-add the unique constraint with prefix length
    console.log('➕ Re-adding unique_user_lead constraint...');
    await connection.query(`
      ALTER TABLE mailers_contacts
      ADD UNIQUE KEY unique_user_lead (user_id, lead_id(100))
    `);

    connection.release();
    console.log('✅ Migration completed successfully');
    console.log('📝 Note: All existing mailers_contacts data has been cleared');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
};

changeLeadIdToVarchar();
