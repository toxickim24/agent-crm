import pool from './config/database.js';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const testMailersAPI = async () => {
  try {
    console.log('=== Testing Mailers API ===\n');

    // 1. Get user 2's token by creating a test token
    // For testing, we'll use admin to check the endpoints
    console.log('1. Getting token for testing...');

    // Get user 2's email from database
    const [users] = await pool.query('SELECT email FROM users WHERE id = 2');
    if (!users.length) {
      throw new Error('User 2 not found');
    }

    // Use a pre-generated token or login as admin
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NSwiZW1haWwiOiJhZG1pbkBsYWJlbHNhbGVzYWdlbnRzLmNvbSIsInJvbGUiOiJhZG1pbiIsInN0YXR1cyI6ImFjdGl2ZSIsImlhdCI6MTc2NDE3ODk2NywiZXhwIjoxNzY0NzgzNzY3fQ.DzsVGKnlrOQIo7Gi9NG51JIvlSfkmh8P5CGwxXyQzUg';
    console.log(`✅ Testing with admin account\n`);

    const headers = { Authorization: `Bearer ${token}` };

    // 2. Test GET /mailers
    console.log('2. Fetching mailers...');
    const mailersResponse = await axios.get(`${API_BASE_URL}/mailers`, { headers });
    console.log(`✅ Mailers count: ${mailersResponse.data.length}\n`);

    // 3. Test GET /mailers/stats
    console.log('3. Fetching stats...');
    const statsResponse = await axios.get(`${API_BASE_URL}/mailers/stats`, { headers });
    console.log('✅ Stats:', statsResponse.data, '\n');

    // 4. Get contacts and lead types
    console.log('4. Fetching contacts and lead types...');
    const contactsResponse = await axios.get(`${API_BASE_URL}/contacts`, { headers });
    const leadTypesResponse = await axios.get(`${API_BASE_URL}/lead-types`, { headers });
    console.log(`✅ Contacts: ${contactsResponse.data.contacts?.length || 0}`);
    console.log(`✅ Lead Types: ${leadTypesResponse.data.length}\n`);

    // 5. Test import by lead type (if there are lead types)
    if (leadTypesResponse.data.length > 0 && contactsResponse.data.contacts?.length > 0) {
      const firstContact = contactsResponse.data.contacts[0];
      const leadTypeName = firstContact.lead_type_name || firstContact.lead_type;

      if (leadTypeName) {
        console.log(`5. Importing contacts by lead type: ${leadTypeName}...`);
        try {
          const importResponse = await axios.post(
            `${API_BASE_URL}/mailers/import-by-lead-type`,
            { leadTypeName },
            { headers }
          );
          console.log(`✅ Import result: ${importResponse.data.message}\n`);

          // 6. Fetch mailers again to see the imported contacts
          console.log('6. Fetching mailers after import...');
          const mailersAfterImport = await axios.get(`${API_BASE_URL}/mailers`, { headers });
          console.log(`✅ Mailers count after import: ${mailersAfterImport.data.length}`);

          if (mailersAfterImport.data.length > 0) {
            console.log('First mailer:', {
              id: mailersAfterImport.data[0].id,
              name: `${mailersAfterImport.data[0].first_name} ${mailersAfterImport.data[0].last_name}`,
              lead_type: mailersAfterImport.data[0].lead_type,
              status: mailersAfterImport.data[0].campaign_status_label || 'No status'
            });
          }
        } catch (importError) {
          console.log('Import error:', importError.response?.data || importError.message);
        }
      }
    }

    console.log('\n✅ All tests completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
};

testMailersAPI();
