import pool from './config/database.js';

async function seedBrevoData() {
  try {
    console.log('🌱 Seeding Brevo campaign activity data...\n');

    // Sample campaigns
    const campaigns = [
      { id: 'camp_001', name: 'Welcome Series - Spring 2025' },
      { id: 'camp_002', name: 'Monthly Newsletter - March' },
      { id: 'camp_003', name: 'Product Launch - New Features' },
      { id: 'camp_004', name: 'Re-engagement Campaign' },
      { id: 'camp_005', name: 'Special Offer - Limited Time' }
    ];

    // Sample contacts for different users
    const userContacts = {
      7: [ // User 7 - tim@baysidepavers.com
        'john.doe@example.com',
        'jane.smith@example.com',
        'robert.johnson@example.com',
        'emily.brown@example.com',
        'michael.davis@example.com',
        'sarah.wilson@example.com',
        'david.martinez@example.com',
        'lisa.anderson@example.com',
        'james.taylor@example.com',
        'jennifer.thomas@example.com'
      ],
      3: [ // User 3
        'alex.green@example.com',
        'maria.lopez@example.com',
        'chris.white@example.com',
        'amanda.hall@example.com',
        'kevin.clark@example.com'
      ],
      6: [ // User 6
        'tom.baker@example.com',
        'lucy.king@example.com',
        'mark.wright@example.com',
        'anna.scott@example.com'
      ]
    };

    // Helper function to generate random date in the last 30 days
    const randomDate = (daysAgo = 30) => {
      const now = new Date();
      const past = new Date(now - daysAgo * 24 * 60 * 60 * 1000);
      const randomTime = past.getTime() + Math.random() * (now.getTime() - past.getTime());
      return new Date(randomTime);
    };

    // Helper function to add random hours to a date (for clicks after opens)
    const addHours = (date, hours) => {
      const newDate = new Date(date);
      newDate.setHours(newDate.getHours() + hours);
      return newDate;
    };

    // Clear existing test data
    console.log('🗑️  Clearing existing test data...');
    await pool.query('DELETE FROM brevo_campaign_activity WHERE email LIKE "%@example.com"');

    let totalInserted = 0;

    // Insert data for each user
    for (const [userId, contacts] of Object.entries(userContacts)) {
      console.log(`\n👤 Generating data for User ${userId}...`);

      for (const contact of contacts) {
        // Each contact receives 2-4 campaigns
        const numCampaigns = Math.floor(Math.random() * 3) + 2;
        const selectedCampaigns = campaigns
          .sort(() => 0.5 - Math.random())
          .slice(0, numCampaigns);

        for (const campaign of selectedCampaigns) {
          const openedAt = randomDate(30);

          // 70% chance of opening
          if (Math.random() < 0.7) {
            // 40% chance of clicking after opening
            const clickedAt = Math.random() < 0.4
              ? addHours(openedAt, Math.random() * 5)
              : null;

            await pool.query(`
              INSERT INTO brevo_campaign_activity
              (user_id, email, campaign_id, campaign_name, opened_at, clicked_at)
              VALUES (?, ?, ?, ?, ?, ?)
            `, [userId, contact, campaign.id, campaign.name, openedAt, clickedAt]);

            totalInserted++;
          } else {
            // Not opened - insert with NULL opened_at and clicked_at
            await pool.query(`
              INSERT INTO brevo_campaign_activity
              (user_id, email, campaign_id, campaign_name, opened_at, clicked_at)
              VALUES (?, ?, ?, ?, NULL, NULL)
            `, [userId, contact, campaign.id, campaign.name]);

            totalInserted++;
          }
        }
      }

      console.log(`✅ Generated data for ${contacts.length} contacts with ${campaigns.length} campaigns`);
    }

    // Show summary
    console.log('\n📊 Summary:');
    console.log(`Total records inserted: ${totalInserted}`);

    for (const userId of Object.keys(userContacts)) {
      const [result] = await pool.query(
        'SELECT COUNT(*) as count FROM brevo_campaign_activity WHERE user_id = ? AND email LIKE "%@example.com"',
        [userId]
      );
      console.log(`User ${userId}: ${result[0].count} events`);
    }

    // Show sample of engagement metrics
    console.log('\n📈 Engagement Metrics:');
    for (const userId of Object.keys(userContacts)) {
      const [stats] = await pool.query(`
        SELECT
          COUNT(*) as total_sent,
          SUM(CASE WHEN opened_at IS NOT NULL THEN 1 ELSE 0 END) as total_opened,
          SUM(CASE WHEN clicked_at IS NOT NULL THEN 1 ELSE 0 END) as total_clicked,
          ROUND(SUM(CASE WHEN opened_at IS NOT NULL THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as open_rate,
          ROUND(SUM(CASE WHEN clicked_at IS NOT NULL THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as click_rate
        FROM brevo_campaign_activity
        WHERE user_id = ? AND email LIKE "%@example.com"
      `, [userId]);

      const s = stats[0];
      console.log(`User ${userId}: ${s.total_sent} sent, ${s.total_opened} opened (${s.open_rate}%), ${s.total_clicked} clicked (${s.click_rate}%)`);
    }

    console.log('\n✅ Seeding completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
}

seedBrevoData();
