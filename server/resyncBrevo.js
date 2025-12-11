import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

// You'll need a valid user token - get this from your browser's localStorage or login
const USER_TOKEN = 'YOUR_AUTH_TOKEN_HERE'; // Replace with actual token

async function resyncAllBrevoData() {
  try {
    console.log('🔄 Starting Brevo data resync...\n');

    const headers = {
      'Authorization': `Bearer ${USER_TOKEN}`,
      'Content-Type': 'application/json'
    };

    // 1. Sync Lists
    console.log('1️⃣  Syncing Lists...');
    const listsRes = await axios.get(`${API_BASE_URL}/brevo/lists?refresh=true`, { headers });
    console.log(`   ✅ Synced ${listsRes.data.lists?.length || 0} lists\n`);

    // 2. Sync Contacts (this may take a while)
    console.log('2️⃣  Syncing Contacts (this may take a few minutes)...');
    const contactsRes = await axios.get(`${API_BASE_URL}/brevo/contacts?refresh=true&limit=10000`, { headers });
    console.log(`   ✅ Synced ${contactsRes.data.contacts?.length || 0} contacts\n`);

    // 3. Sync Campaigns
    console.log('3️⃣  Syncing Campaigns...');
    const campaignsRes = await axios.get(`${API_BASE_URL}/brevo/campaigns?refresh=true&limit=500`, { headers });
    console.log(`   ✅ Synced ${campaignsRes.data.campaigns?.length || 0} campaigns\n`);

    console.log('✅ All Brevo data resynced successfully!\n');
    console.log('Summary:');
    console.log(`  - Lists: ${listsRes.data.lists?.length || 0}`);
    console.log(`  - Contacts: ${contactsRes.data.contacts?.length || 0}`);
    console.log(`  - Campaigns: ${campaignsRes.data.campaigns?.length || 0}`);

  } catch (error) {
    console.error('❌ Error during resync:', error.response?.data || error.message);
  }
}

resyncAllBrevoData();
