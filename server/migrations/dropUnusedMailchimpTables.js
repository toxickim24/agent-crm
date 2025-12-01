import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const runMigration = async () => {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'agent_crm'
    });

    console.log('🔗 Connected to database');

    const tablesToDrop = [
      'mailchimp_activity_logs',
      'mailchimp_audiences',
      'mailchimp_automations',
      'mailchimp_segments',
      'mailchimp_templates'
    ];

    console.log('\n🗑️  Dropping unused Mailchimp tables...');

    for (const table of tablesToDrop) {
      try {
        await connection.query(`DROP TABLE IF EXISTS ${table}`);
        console.log(`  ✅ Dropped table: ${table}`);
      } catch (error) {
        console.log(`  ⚠️  Failed to drop ${table}:`, error.message);
      }
    }

    console.log('\n🎉 Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
};

runMigration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
