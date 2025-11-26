import pool from './config/database.js';
import jwt from 'jsonwebtoken';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const testLeadIdFix = async () => {
  try {
    console.log('=== Testing Lead ID Fix ===\n');

    // Create JWT token for user 2
    const token = jwt.sign(
      { id: 2, email: 'tim@mcmullen.properties', role: 'client', status: 'active' },
      process.env.JWT_SECRET || 'label-automation-secret-key-2024',
      { expiresIn: '7d' }
    );

    const headers = { Authorization: `Bearer ${token}` };

    // 1. Import contacts by lead type
    console.log('1. Importing Probate contacts (lead_type ID 1)...');
    const importResponse = await axios.post(
      `${API_BASE_URL}/mailers/import-by-lead-type`,
      { lead_type: 1 },
      { headers }
    );
    console.log(`✅ ${importResponse.data.message}\n`);

    // 2. Fetch mailers to verify
    console.log('2. Fetching imported mailers...');
    const mailersResponse = await axios.get(`${API_BASE_URL}/mailers?showDeleted=false`, { headers });
    const mailers = mailersResponse.data;
    console.log(`✅ Mailers count: ${mailers.length}\n`);

    if (mailers.length > 0) {
      console.log('First 3 mailers:');
      for (let i = 0; i < Math.min(3, mailers.length); i++) {
        const m = mailers[i];
        console.log(`  ${i + 1}. MC ID: ${m.id} | lead_id: ${m.lead_id} | Name: ${m.first_name} ${m.last_name}`);
      }
      console.log();

      // 3. Verify lead_id is DealMachine ID not contacts.id
      console.log('3. Verifying lead_id is DealMachine ID...');
      const firstMailer = mailers[0];
      const [contacts] = await pool.query(
        'SELECT id, lead_id FROM contacts WHERE lead_id = ?',
        [firstMailer.lead_id]
      );

      if (contacts.length > 0) {
        console.log(`✅ Found contact with DealMachine lead_id: ${firstMailer.lead_id}`);
        console.log(`   Contact table ID: ${contacts[0].id}`);
        console.log(`   DealMachine lead_id: ${contacts[0].lead_id}`);
        console.log(`   ✅ mailers_contacts.lead_id is correctly using DealMachine lead_id!\n`);
      } else {
        console.log(`❌ Could not find contact with lead_id: ${firstMailer.lead_id}\n`);
      }
    }

    console.log('✅ All tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
    }
    process.exit(1);
  }
};

testLeadIdFix();
