import pool from '../config/database.js';

/**
 * Migration: Fix api_configs table
 * 1. Remove Mailchimp columns (should be in mailchimp_configs table)
 * 2. Move Brevo columns after dealmachine_end_mail
 */

async function fixApiConfigsColumns() {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    console.log('🔧 Fixing api_configs table...');

    // 1. Check and remove Mailchimp columns
    console.log('\n📝 Checking for Mailchimp columns...');
    const [mailchimpColumns] = await connection.query(
      `SHOW COLUMNS FROM api_configs WHERE Field IN ('mailchimp_api_key', 'mailchimp_server_prefix')`
    );

    if (mailchimpColumns.length > 0) {
      console.log('❌ Found Mailchimp columns. Removing them...');

      // Drop mailchimp_api_key if exists
      if (mailchimpColumns.some(col => col.Field === 'mailchimp_api_key')) {
        await connection.query(`ALTER TABLE api_configs DROP COLUMN mailchimp_api_key`);
        console.log('   ✅ Removed mailchimp_api_key');
      }

      // Drop mailchimp_server_prefix if exists
      if (mailchimpColumns.some(col => col.Field === 'mailchimp_server_prefix')) {
        await connection.query(`ALTER TABLE api_configs DROP COLUMN mailchimp_server_prefix`);
        console.log('   ✅ Removed mailchimp_server_prefix');
      }
    } else {
      console.log('✅ No Mailchimp columns found');
    }

    // 2. Move Brevo columns after dealmachine_end_mail
    console.log('\n📝 Repositioning Brevo columns...');
    const [brevoColumns] = await connection.query(
      `SHOW COLUMNS FROM api_configs WHERE Field IN ('brevo_api_key', 'brevo_account_email')`
    );

    if (brevoColumns.length > 0) {
      console.log('Moving Brevo columns after dealmachine_end_mail...');

      // Move brevo_api_key after dealmachine_end_mail
      await connection.query(`
        ALTER TABLE api_configs
        MODIFY COLUMN brevo_api_key VARCHAR(255) DEFAULT NULL COMMENT 'Brevo API Key'
        AFTER dealmachine_end_mail
      `);
      console.log('   ✅ Moved brevo_api_key');

      // Move brevo_account_email after brevo_api_key
      await connection.query(`
        ALTER TABLE api_configs
        MODIFY COLUMN brevo_account_email VARCHAR(255) DEFAULT NULL COMMENT 'Brevo account email for reference'
        AFTER brevo_api_key
      `);
      console.log('   ✅ Moved brevo_account_email');
    }

    // Display final table structure
    console.log('\n📊 Final api_configs table structure:');
    const [allColumns] = await connection.query(`SHOW COLUMNS FROM api_configs`);
    allColumns.forEach((col, index) => {
      console.log(`  ${index + 1}. ${col.Field} (${col.Type})`);
    });

    await connection.commit();

  } catch (error) {
    await connection.rollback();
    console.error('❌ Error fixing api_configs table:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Run migration
fixApiConfigsColumns()
  .then(() => {
    console.log('\n🎉 api_configs table fixed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  });
