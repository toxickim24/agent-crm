import pool from './config/database.js';
import jwt from 'jsonwebtoken';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const testImport = async () => {
  try {
    console.log('=== Testing Mailers Import for User 2 ===\n');

    // Create a JWT token for user 2
    const token = jwt.sign(
      { id: 2, email: 'tim@mcmullen.properties', role: 'client', status: 'active' },
      process.env.JWT_SECRET || 'label-automation-secret-key-2024',
      { expiresIn: '7d' }
    );

    const headers = { Authorization: `Bearer ${token}` };

    // 1. Get contacts for user 2
    console.log('1. Fetching contacts for user 2...');
    const contactsResponse = await axios.get(`${API_BASE_URL}/contacts`, { headers });
    const contacts = contactsResponse.data.contacts || [];
    console.log(`✅ Found ${contacts.length} contacts\n`);

    if (contacts.length === 0) {
      console.log('No contacts found. Cannot test import.');
      process.exit(0);
    }

    // 2. Get lead types
    console.log('2. Fetching lead types...');
    const leadTypesResponse = await axios.get(`${API_BASE_URL}/lead-types`, { headers });
    const leadTypes = leadTypesResponse.data;
    console.log(`✅ Found ${leadTypes.length} lead types\n`);

    // 3. Find a lead type that has contacts (using IDs)
    const contactsByLeadType = {};
    const leadTypeNames = {};
    contacts.forEach(contact => {
      const leadTypeId = contact.lead_type;
      const leadTypeName = contact.lead_type_name || `ID ${leadTypeId}`;
      if (leadTypeId) {
        if (!contactsByLeadType[leadTypeId]) {
          contactsByLeadType[leadTypeId] = 0;
          leadTypeNames[leadTypeId] = leadTypeName;
        }
        contactsByLeadType[leadTypeId]++;
      }
    });

    console.log('3. Contacts by lead type ID:');
    Object.entries(contactsByLeadType).forEach(([typeId, count]) => {
      console.log(`   ${leadTypeNames[typeId]} (ID ${typeId}): ${count} contacts`);
    });
    console.log();

    // 4. Import the first lead type that has contacts
    const firstLeadTypeId = Object.keys(contactsByLeadType)[0];
    if (firstLeadTypeId) {
      console.log(`4. Importing contacts with lead type ID ${firstLeadTypeId} (${leadTypeNames[firstLeadTypeId]})...`);
      try {
        const importResponse = await axios.post(
          `${API_BASE_URL}/mailers/import-by-lead-type`,
          { lead_type: firstLeadTypeId },
          { headers }
        );
        console.log(`✅ ${importResponse.data.message}\n`);
      } catch (importError) {
        console.log('❌ Import error:', importError.response?.data || importError.message);
        console.log();
      }

      // 5. Fetch mailers to verify
      console.log('5. Fetching mailers after import...');
      const mailersResponse = await axios.get(`${API_BASE_URL}/mailers`, { headers });
      const mailers = mailersResponse.data;
      console.log(`✅ Mailers count: ${mailers.length}\n`);

      if (mailers.length > 0) {
        console.log('First 3 mailers:');
        mailers.slice(0, 3).forEach((m, i) => {
          console.log(`  ${i + 1}. ${m.first_name} ${m.last_name} - ${m.lead_type}`);
        });
        console.log();
      }

      // 6. Get stats
      console.log('6. Fetching stats...');
      const statsResponse = await axios.get(`${API_BASE_URL}/mailers/stats`, { headers });
      console.log('✅ Stats:', statsResponse.data);
    }

    console.log('\n✅ Test completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    process.exit(1);
  }
};

testImport();
