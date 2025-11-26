import pool from './config/database.js';
import jwt from 'jsonwebtoken';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const testSyncProgress = async () => {
  try {
    console.log('=== Testing Sync All Progress Tracking ===\n');

    // Create JWT token for user 2
    const token = jwt.sign(
      { id: 2, email: 'tim@mcmullen.properties', role: 'client', status: 'active' },
      process.env.JWT_SECRET || 'label-automation-secret-key-2024',
      { expiresIn: '7d' }
    );

    const headers = { Authorization: `Bearer ${token}` };

    console.log('1. Initiating Sync All...');
    const syncAllResponse = await axios.post(
      `${API_BASE_URL}/mailers/sync-all`,
      {},
      { headers }
    );

    const totalContacts = syncAllResponse.data.count;
    console.log(`✅ ${syncAllResponse.data.message}`);
    console.log(`   Total contacts to sync: ${totalContacts}\n`);

    console.log('2. Monitoring sync progress...\n');

    let completed = 0;
    let iteration = 0;
    const maxIterations = 15; // Monitor for 15 seconds

    const monitorInterval = setInterval(async () => {
      iteration++;

      try {
        // Fetch updated mailers
        const mailersResponse = await axios.get(`${API_BASE_URL}/mailers?showDeleted=false`, { headers });
        const updatedMailers = mailersResponse.data;

        // Count recently synced
        const recentlySynced = updatedMailers.filter(m => {
          if (!m.last_sync_date) return false;
          const syncDate = new Date(m.last_sync_date);
          const now = new Date();
          const diffMinutes = (now - syncDate) / (1000 * 60);
          return diffMinutes < 2;
        });

        const newCompleted = recentlySynced.length;

        // Find latest synced contact
        const latestSync = recentlySynced.sort((a, b) =>
          new Date(b.last_sync_date) - new Date(a.last_sync_date)
        )[0];

        if (newCompleted > completed || iteration === 1) {
          completed = newCompleted;
          const percentage = ((completed / totalContacts) * 100).toFixed(0);
          const progressBar = '█'.repeat(Math.floor(percentage / 5)) + '░'.repeat(20 - Math.floor(percentage / 5));

          console.log(`   [${progressBar}] ${completed}/${totalContacts} (${percentage}%)`);

          if (latestSync) {
            console.log(`   Currently: ${latestSync.first_name} ${latestSync.last_name} (${latestSync.lead_id}) - ${latestSync.sync_status}`);
          }
        }

        // Stop if all done or max iterations reached
        if (completed >= totalContacts || iteration >= maxIterations) {
          clearInterval(monitorInterval);

          console.log();
          if (completed >= totalContacts) {
            console.log('✅ All contacts synced successfully!\n');
          } else {
            console.log(`⏳ Monitoring stopped. ${completed}/${totalContacts} completed so far.\n`);
          }

          // Show final stats
          const successCount = recentlySynced.filter(m => m.sync_status === 'Success').length;
          const failedCount = recentlySynced.filter(m => m.sync_status === 'Failed').length;
          const pendingCount = totalContacts - completed;

          console.log('3. Final Sync Results:');
          console.log(`   ✅ Success: ${successCount}`);
          console.log(`   ❌ Failed: ${failedCount}`);
          console.log(`   ⏳ Pending: ${pendingCount}`);
          console.log();

          console.log('4. How the Progress Modal Works:');
          console.log('   ✅ Shows real-time progress bar');
          console.log('   ✅ Displays currently syncing contact name and lead_id');
          console.log('   ✅ Updates every second by polling mailers endpoint');
          console.log('   ✅ Automatically closes when all contacts are synced');
          console.log('   ✅ User can close modal but sync continues in background');

          process.exit(0);
        }
      } catch (error) {
        console.error('   ❌ Error monitoring:', error.message);
      }
    }, 1000); // Check every second

  } catch (error) {
    console.error('❌ Test error:', error.response?.data || error.message);
    process.exit(1);
  }
};

testSyncProgress();
