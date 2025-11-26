import pool from '../config/database.js';

const updateDealmachineApiConfigs = async () => {
  try {
    console.log('🔄 Updating api_configs table for DealMachine...');

    const connection = await pool.getConnection();

    // Check which columns exist
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'api_configs'
      AND COLUMN_NAME IN ('dealmachine_api_key', 'dealmachine_account_id', 'dealmachine_bearer_token', 'dealmachine_get_lead', 'dealmachine_start_mail', 'dealmachine_pause_mail', 'dealmachine_end_mail')
    `);

    const existingColumns = columns.map(col => col.COLUMN_NAME);

    // Drop old columns if they exist
    if (existingColumns.includes('dealmachine_api_key')) {
      console.log('🗑️  Dropping dealmachine_api_key column...');
      await connection.query(`
        ALTER TABLE api_configs
        DROP COLUMN dealmachine_api_key
      `);
      console.log('✅ dealmachine_api_key column dropped');
    }

    if (existingColumns.includes('dealmachine_account_id')) {
      console.log('🗑️  Dropping dealmachine_account_id column...');
      await connection.query(`
        ALTER TABLE api_configs
        DROP COLUMN dealmachine_account_id
      `);
      console.log('✅ dealmachine_account_id column dropped');
    }

    // Add new columns if they don't exist
    if (!existingColumns.includes('dealmachine_bearer_token')) {
      console.log('➕ Adding dealmachine_bearer_token column...');
      await connection.query(`
        ALTER TABLE api_configs
        ADD COLUMN dealmachine_bearer_token VARCHAR(500) AFTER mailchimp_server_prefix
      `);
      console.log('✅ dealmachine_bearer_token column added');
    }

    if (!existingColumns.includes('dealmachine_get_lead')) {
      console.log('➕ Adding dealmachine_get_lead column...');
      await connection.query(`
        ALTER TABLE api_configs
        ADD COLUMN dealmachine_get_lead VARCHAR(500) AFTER dealmachine_bearer_token
      `);
      console.log('✅ dealmachine_get_lead column added');
    }

    if (!existingColumns.includes('dealmachine_start_mail')) {
      console.log('➕ Adding dealmachine_start_mail column...');
      await connection.query(`
        ALTER TABLE api_configs
        ADD COLUMN dealmachine_start_mail VARCHAR(500) AFTER dealmachine_get_lead
      `);
      console.log('✅ dealmachine_start_mail column added');
    }

    if (!existingColumns.includes('dealmachine_pause_mail')) {
      console.log('➕ Adding dealmachine_pause_mail column...');
      await connection.query(`
        ALTER TABLE api_configs
        ADD COLUMN dealmachine_pause_mail VARCHAR(500) AFTER dealmachine_start_mail
      `);
      console.log('✅ dealmachine_pause_mail column added');
    }

    if (!existingColumns.includes('dealmachine_end_mail')) {
      console.log('➕ Adding dealmachine_end_mail column...');
      await connection.query(`
        ALTER TABLE api_configs
        ADD COLUMN dealmachine_end_mail VARCHAR(500) AFTER dealmachine_pause_mail
      `);
      console.log('✅ dealmachine_end_mail column added');
    }

    connection.release();
    console.log('✅ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
};

updateDealmachineApiConfigs();
