import pool from './config/database.js';

async function checkUser7AllPermissions() {
  try {
    console.log('🔍 Checking ALL permissions for user 7...\n');

    const [users] = await pool.query(
      `SELECT u.id, u.name, u.email, u.role,
              p.brevo,
              p.brevo_view_dashboard,
              p.brevo_view_contacts,
              p.brevo_view_lists,
              p.brevo_view_campaigns,
              p.brevo_view_stats,
              p.brevo_view_events,
              p.brevo_view_time_analysis,
              p.brevo_sync_data,
              p.brevo_export_csv,
              p.brevo_export_data
       FROM users u
       LEFT JOIN permissions p ON u.id = p.user_id
       WHERE u.id = 7`
    );

    if (users.length > 0) {
      const user = users[0];
      console.log('User Info:');
      console.log(`  ID: ${user.id}`);
      console.log(`  Name: ${user.name}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Role: ${user.role}`);
      console.log('');
      console.log('Brevo Permissions:');
      console.log(`  brevo: ${user.brevo}`);
      console.log(`  brevo_view_dashboard: ${user.brevo_view_dashboard}`);
      console.log(`  brevo_view_contacts: ${user.brevo_view_contacts}`);
      console.log(`  brevo_view_lists: ${user.brevo_view_lists}`);
      console.log(`  brevo_view_campaigns: ${user.brevo_view_campaigns}`);
      console.log(`  brevo_view_stats: ${user.brevo_view_stats}`);
      console.log(`  brevo_view_events: ${user.brevo_view_events}`);
      console.log(`  brevo_view_time_analysis: ${user.brevo_view_time_analysis}`);
      console.log(`  brevo_sync_data: ${user.brevo_sync_data}`);
      console.log(`  brevo_export_csv: ${user.brevo_export_csv}`);
      console.log(`  brevo_export_data: ${user.brevo_export_data}`);
    } else {
      console.log('❌ User 7 not found');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkUser7AllPermissions();
