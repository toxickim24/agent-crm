import pool from './config/database.js';

async function checkSyncHistory() {
  try {
    console.log('Checking automation sync history...\n');

    const [syncLogs] = await pool.query(
      `SELECT * FROM brevo_sync_log
       WHERE sync_type = 'automations'
       ORDER BY synced_at DESC
       LIMIT 10`
    );

    if (syncLogs.length === 0) {
      console.log('No automation sync history found.');
    } else {
      console.log(`Found ${syncLogs.length} sync log entries:`);
      syncLogs.forEach((log, index) => {
        console.log(`\n${index + 1}. Sync at ${log.synced_at}`);
        console.log(`   Status: ${log.status}`);
        console.log(`   Items synced: ${log.items_synced}`);
        console.log(`   Duration: ${log.duration_ms}ms`);
        if (log.error_message) {
          console.log(`   Error: ${log.error_message}`);
        }
      });
    }

    console.log('\n\nChecking if brevo_automations table has any data...\n');

    const [automations] = await pool.query(
      'SELECT * FROM brevo_automations LIMIT 5'
    );

    if (automations.length === 0) {
      console.log('No automations in database.');
    } else {
      console.log(`Found ${automations.length} automations:`);
      console.log(JSON.stringify(automations, null, 2));
    }

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkSyncHistory();
