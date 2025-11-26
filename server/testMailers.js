import pool from './config/database.js';

const testMailers = async () => {
  try {
    // Check contacts for user 2
    const [contacts] = await pool.query('SELECT COUNT(*) as count FROM contacts WHERE user_id = 2');
    console.log('Contacts for user 2:', contacts[0].count);

    // Check mailers_contacts for user 2
    const [mailers] = await pool.query('SELECT COUNT(*) as count FROM mailers_contacts WHERE user_id = 2');
    console.log('Mailers for user 2:', mailers[0].count);

    // Check if API config exists
    const [config] = await pool.query('SELECT dealmachine_bearer_token, mailer_campaign_id FROM api_configs WHERE user_id = 2');
    console.log('API Config:', config[0] || 'Not found');

    // Check campaigns
    const [campaigns] = await pool.query('SELECT COUNT(*) as count FROM campaigns WHERE deleted_at IS NULL');
    console.log('Active campaigns:', campaigns[0].count);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

testMailers();
