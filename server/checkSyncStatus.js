import pool from './config/database.js';

const checkSyncStatus = async () => {
  try {
    console.log('=== Checking Sync Status ===\n');

    const [mailers] = await pool.query(`
      SELECT id, lead_id, sync_status, sync_error, last_sync_date
      FROM mailers_contacts
      WHERE user_id = 2
      ORDER BY id
    `);

    console.log('Mailers sync status:');
    mailers.forEach(m => {
      console.log(`\nMailer ID: ${m.id}`);
      console.log(`  lead_id: ${m.lead_id}`);
      console.log(`  sync_status: ${m.sync_status}`);
      console.log(`  sync_error: ${m.sync_error || 'None'}`);
      console.log(`  last_sync_date: ${m.last_sync_date || 'Never'}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkSyncStatus();
