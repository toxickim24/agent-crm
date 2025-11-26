import pool from './config/database.js';
import jwt from 'jsonwebtoken';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const testFailedSync = async () => {
  try {
    console.log('=== Testing Failed Sync for lead_id 1948837682 ===\n');

    // Create JWT token for user 2
    const token = jwt.sign(
      { id: 2, email: 'tim@mcmullen.properties', role: 'client', status: 'active' },
      process.env.JWT_SECRET || 'label-automation-secret-key-2024',
      { expiresIn: '7d' }
    );

    const headers = { Authorization: `Bearer ${token}` };

    // 1. Check if mailer exists with this lead_id
    console.log('1. Checking for mailer with lead_id 1948837682...');
    const [mailers] = await pool.query(
      'SELECT * FROM mailers_contacts WHERE lead_id = ? AND user_id = 2',
      ['1948837682']
    );

    let mailerId;

    if (mailers.length === 0) {
      console.log('⚠️  No mailer found, creating one...');

      // Create a mailer for this lead_id
      const [result] = await pool.query(
        `INSERT INTO mailers_contacts (user_id, lead_id, campaign_status_label)
         VALUES (2, '1948837682', 'Not Started')`,
        []
      );
      mailerId = result.insertId;
      console.log(`✅ Created mailer with ID: ${mailerId}\n`);
    } else {
      mailerId = mailers[0].id;
      console.log(`✅ Found mailer with ID: ${mailerId}\n`);
    }

    // 2. Try to sync
    console.log('2. Attempting to sync...');
    try {
      const syncResponse = await axios.post(
        `${API_BASE_URL}/mailers/sync/${mailerId}`,
        {},
        { headers }
      );

      console.log('✅ Sync succeeded (unexpected):');
      console.log(JSON.stringify(syncResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Sync failed (expected):');
      console.log('Status:', error.response?.status);
      console.log('Error:', error.response?.data?.error || error.message);
      console.log('\nFull response data:');
      console.log(JSON.stringify(error.response?.data, null, 2));
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Test error:', error.message);
    process.exit(1);
  }
};

testFailedSync();
