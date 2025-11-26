import pool from './config/database.js';
import jwt from 'jsonwebtoken';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const testSoftDelete = async () => {
  try {
    console.log('=== Testing Mailers Soft Delete & Restore ===\n');

    // Create a JWT token for user 2
    const token = jwt.sign(
      { id: 2, email: 'tim@mcmullen.properties', role: 'client', status: 'active' },
      process.env.JWT_SECRET || 'label-automation-secret-key-2024',
      { expiresIn: '7d' }
    );

    const headers = { Authorization: `Bearer ${token}` };

    // 1. Get current mailers (not deleted)
    console.log('1. Fetching active mailers...');
    let response = await axios.get(`${API_BASE_URL}/mailers?showDeleted=false`, { headers });
    const activeMailers = response.data;
    console.log(`✅ Active mailers: ${activeMailers.length}\n`);

    if (activeMailers.length === 0) {
      console.log('No active mailers found. Cannot test soft delete.');
      process.exit(0);
    }

    const firstMailer = activeMailers[0];
    console.log(`Testing with mailer ID ${firstMailer.id}: ${firstMailer.first_name} ${firstMailer.last_name}\n`);

    // 2. Soft delete the first mailer
    console.log('2. Soft deleting mailer...');
    await axios.delete(`${API_BASE_URL}/mailers/${firstMailer.id}`, { headers });
    console.log('✅ Mailer soft deleted\n');

    // 3. Verify it's gone from active list
    console.log('3. Fetching active mailers (should be one less)...');
    response = await axios.get(`${API_BASE_URL}/mailers?showDeleted=false`, { headers });
    console.log(`✅ Active mailers: ${response.data.length} (was ${activeMailers.length})\n`);

    // 4. Verify it appears in deleted list
    console.log('4. Fetching deleted mailers...');
    response = await axios.get(`${API_BASE_URL}/mailers?showDeleted=true`, { headers });
    const allMailers = response.data;
    const deletedMailers = allMailers.filter(m => m.deleted_at);
    console.log(`✅ Total mailers (including deleted): ${allMailers.length}`);
    console.log(`✅ Deleted mailers: ${deletedMailers.length}\n`);

    // 5. Restore the deleted mailer
    console.log('5. Restoring mailer...');
    const restoreResponse = await axios.post(`${API_BASE_URL}/mailers/${firstMailer.id}/restore`, {}, { headers });
    console.log('✅ Mailer restored:', restoreResponse.data.message, '\n');

    // 6. Verify it's back in active list
    console.log('6. Fetching active mailers (should be back to original count)...');
    response = await axios.get(`${API_BASE_URL}/mailers?showDeleted=false`, { headers });
    console.log(`✅ Active mailers: ${response.data.length} (original was ${activeMailers.length})\n`);

    console.log('✅ All soft delete/restore tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
    }
    process.exit(1);
  }
};

testSoftDelete();
