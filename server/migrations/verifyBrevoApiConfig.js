import pool from '../config/database.js';

/**
 * Verification: Ensure Brevo columns exist in api_configs table
 */

async function verifyBrevoApiConfig() {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    console.log('🔍 Checking api_configs table for Brevo columns...');

    // Check if columns already exist
    const [columns] = await connection.query(
      `SHOW COLUMNS FROM api_configs WHERE Field IN ('brevo_api_key', 'brevo_account_email')`
    );

    if (columns.length === 0) {
      console.log('❌ Brevo columns missing! Adding them now...');

      await connection.query(`
        ALTER TABLE api_configs
        ADD COLUMN brevo_api_key VARCHAR(255) DEFAULT NULL COMMENT 'Brevo API Key',
        ADD COLUMN brevo_account_email VARCHAR(255) DEFAULT NULL COMMENT 'Brevo account email for reference'
      `);

      console.log('✅ Brevo columns added successfully to api_configs!');
    } else {
      console.log('✅ Brevo columns already exist in api_configs');
      console.log('   Found columns:', columns.map(c => c.Field).join(', '));
    }

    // Display current api_configs structure
    console.log('\n📊 Verifying api_configs table structure...');
    const [allColumns] = await connection.query(`SHOW COLUMNS FROM api_configs`);
    console.log('All columns in api_configs:');
    allColumns.forEach(col => {
      console.log(`  - ${col.Field} (${col.Type})`);
    });

    await connection.commit();

  } catch (error) {
    await connection.rollback();
    console.error('❌ Error verifying Brevo api_configs:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Run verification
verifyBrevoApiConfig()
  .then(() => {
    console.log('\n🎉 Brevo api_configs verification completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Verification failed:', error);
    process.exit(1);
  });
