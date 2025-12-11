import pool from './config/database.js';

async function testLoginResponse() {
  try {
    console.log('🔍 Testing what the /login endpoint returns for user 7...\n');

    // This is the exact query from the /login endpoint
    const [users] = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.status, u.password, u.product_updates, u.logo_url_light, u.logo_url_dark, u.created_at,
              p.home, p.contacts, p.calls_texts, p.emails, p.mailers,
              p.contact_view, p.contact_add, p.contact_edit, p.contact_delete,
              p.contact_import, p.contact_export,
              p.mailer_import, p.mailer_add, p.mailer_sync_all, p.mailer_view,
              p.mailer_sync, p.mailer_start, p.mailer_pause, p.mailer_end, p.mailer_delete,
              p.email_sync_contacts, p.email_sync_campaigns, p.email_view_campaign,
              p.email_export_csv, p.email_archive_campaign, p.email_delete_campaign,
              p.brevo, p.brevo_view_contacts, p.brevo_view_lists, p.brevo_view_campaigns,
              p.brevo_view_stats, p.brevo_view_dashboard, p.brevo_view_events, p.brevo_view_time_analysis,
              p.brevo_sync_data, p.brevo_export_csv, p.brevo_export_data,
              p.allowed_lead_types
       FROM users u
       LEFT JOIN permissions p ON u.id = p.user_id
       WHERE u.id = 7 AND u.deleted_at IS NULL`
    );

    if (users.length > 0) {
      const user = users[0];

      // Remove password like the endpoint does
      const { password, ...userWithoutPassword } = user;

      console.log('Login endpoint would return this user object:');
      console.log(JSON.stringify(userWithoutPassword, null, 2));

      console.log('\n\n✅ Key Brevo permissions in response:');
      console.log(`  brevo: ${userWithoutPassword.brevo}`);
      console.log(`  brevo_view_dashboard: ${userWithoutPassword.brevo_view_dashboard}`);
      console.log(`  brevo_view_contacts: ${userWithoutPassword.brevo_view_contacts}`);
      console.log(`  brevo_view_events: ${userWithoutPassword.brevo_view_events}`);
      console.log(`  brevo_view_time_analysis: ${userWithoutPassword.brevo_view_time_analysis}`);
      console.log(`  brevo_export_data: ${userWithoutPassword.brevo_export_data}`);
    } else {
      console.log('❌ User 7 not found');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testLoginResponse();
