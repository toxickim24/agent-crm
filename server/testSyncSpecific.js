import pool from './config/database.js';
import jwt from 'jsonwebtoken';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const testSync = async () => {
  try {
    console.log('=== Testing Sync for lead_id 1666871953 ===\n');

    // Create JWT token for user 2
    const token = jwt.sign(
      { id: 2, email: 'tim@mcmullen.properties', role: 'client', status: 'active' },
      process.env.JWT_SECRET || 'label-automation-secret-key-2024',
      { expiresIn: '7d' }
    );

    const headers = { Authorization: `Bearer ${token}` };

    // 1. Find the mailer contact with this lead_id
    console.log('1. Finding mailer contact with lead_id 1666871953...');
    const [mailers] = await pool.query(
      'SELECT * FROM mailers_contacts WHERE lead_id = ? AND user_id = 2',
      ['1666871953']
    );

    if (mailers.length === 0) {
      console.log('❌ No mailer found with lead_id 1666871953');
      process.exit(1);
    }

    const mailer = mailers[0];
    console.log('✅ Found mailer:');
    console.log(`   MC ID: ${mailer.id}`);
    console.log(`   lead_id: ${mailer.lead_id}`);
    console.log(`   campaign_status_label: ${mailer.campaign_status_label}`);
    console.log(`   mail_sequence_value: ${mailer.mail_sequence_value}`);
    console.log(`   mail_design_label: ${mailer.mail_design_label}`);
    console.log(`   total_times_mail_was_sent: ${mailer.total_times_mail_was_sent}`);
    console.log(`   last_mail_sent_date: ${mailer.last_mail_sent_date}`);
    console.log(`   cost: ${mailer.cost}\n`);

    // 2. Call sync endpoint
    console.log('2. Calling sync endpoint...');
    const syncResponse = await axios.post(
      `${API_BASE_URL}/mailers/sync/${mailer.id}`,
      {},
      { headers }
    );

    console.log('✅ Sync response:');
    console.log(JSON.stringify(syncResponse.data, null, 2));
    console.log();

    // 3. Check updated data
    console.log('3. Checking updated data in database...');
    const [updatedMailers] = await pool.query(
      'SELECT * FROM mailers_contacts WHERE id = ?',
      [mailer.id]
    );

    const updated = updatedMailers[0];
    console.log('✅ Updated mailer:');
    console.log(`   MC ID: ${updated.id}`);
    console.log(`   lead_id: ${updated.lead_id}`);
    console.log(`   campaign_status_label: ${updated.campaign_status_label}`);
    console.log(`   mail_sequence_value: ${updated.mail_sequence_value}`);
    console.log(`   mail_design_label: ${updated.mail_design_label}`);
    console.log(`   total_times_mail_was_sent: ${updated.total_times_mail_was_sent}`);
    console.log(`   last_mail_sent_date: ${updated.last_mail_sent_date}`);
    console.log(`   number_of_mailing_addresses: ${updated.number_of_mailing_addresses}`);
    console.log(`   has_usps_address: ${updated.has_usps_address}`);
    console.log(`   cost: ${updated.cost}\n`);

    console.log('✅ Test completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
};

testSync();
