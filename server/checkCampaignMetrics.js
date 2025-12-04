import pool from './config/database.js';

const checkCampaignMetrics = async () => {
  try {
    console.log('🔍 Checking campaign metrics in database...\n');

    const connection = await pool.getConnection();

    // Get a few campaigns to see their metrics
    const [campaigns] = await connection.query(`
      SELECT
        id, title, subject_line, status,
        emails_sent, unique_opens, unique_clicks,
        open_rate, click_rate, unsubscribe_rate, delivery_rate,
        last_synced_at
      FROM mailchimp_campaigns
      WHERE deleted_at IS NULL
      ORDER BY last_synced_at DESC
      LIMIT 5
    `);

    console.log(`📊 Found ${campaigns.length} campaigns (showing last 5 synced)\n`);

    campaigns.forEach((campaign, index) => {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Campaign ${index + 1}:`);
      console.log(`Title: ${campaign.title || campaign.subject_line}`);
      console.log(`Status: ${campaign.status}`);
      console.log(`Emails Sent: ${campaign.emails_sent}`);
      console.log(`Unique Opens: ${campaign.unique_opens}`);
      console.log(`Unique Clicks: ${campaign.unique_clicks}`);
      console.log(`\nMetrics:`);
      console.log(`  Open Rate: ${campaign.open_rate}%`);
      console.log(`  Click Rate: ${campaign.click_rate}%`);
      console.log(`  Unsubscribe Rate: ${campaign.unsubscribe_rate}%`);
      console.log(`  Delivery Rate: ${campaign.delivery_rate}%`);
      console.log(`Last Synced: ${campaign.last_synced_at}`);
    });

    // Check if columns exist
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'mailchimp_campaigns'
        AND COLUMN_NAME IN ('unsubscribe_rate', 'delivery_rate')
    `);

    console.log(`\n\n${'='.repeat(60)}`);
    console.log('📋 Column Check:');
    console.log(`Columns found: ${columns.map(c => c.COLUMN_NAME).join(', ')}`);

    connection.release();
    console.log('\n✅ Check complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

checkCampaignMetrics();
