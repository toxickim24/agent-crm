import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const regenerateLeadTypes = async () => {
  let connection;

  try {
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'agent_crm'
    });

    console.log('🔄 Starting lead_types table regeneration...');

    // Start transaction
    await connection.beginTransaction();

    // Check if there are any contacts using lead_types that will be deleted
    const [contactsWithOtherTypes] = await connection.query(`
      SELECT COUNT(*) as count
      FROM contacts c
      LEFT JOIN lead_types lt ON c.lead_type = lt.id
      WHERE lt.name NOT IN ('Probate', 'Refi', 'Equity', 'Permit', 'Home')
      AND c.lead_type IS NOT NULL
    `);

    if (contactsWithOtherTypes[0].count > 0) {
      console.log(`⚠️  Warning: ${contactsWithOtherTypes[0].count} contact(s) have lead types that will be removed.`);
      console.log('   These contacts will have their lead_type set to NULL.');
    }

    // Delete all existing lead types
    console.log('🗑️  Deleting existing lead types...');
    await connection.query('DELETE FROM lead_types');

    // Reset auto increment
    await connection.query('ALTER TABLE lead_types AUTO_INCREMENT = 1');

    // Insert the 5 specific lead types
    console.log('➕ Inserting new lead types...');
    await connection.query(`
      INSERT INTO lead_types (name, color) VALUES
        ('Probate', '#8B5CF6'),
        ('Refi', '#3B82F6'),
        ('Equity', '#10B981'),
        ('Permit', '#F59E0B'),
        ('Home', '#EF4444')
    `);

    // Commit transaction
    await connection.commit();

    // Show the results
    const [newLeadTypes] = await connection.query('SELECT * FROM lead_types ORDER BY id');

    console.log('\n✅ Lead types regenerated successfully!\n');
    console.log('📋 Current lead types:');
    console.log('─'.repeat(50));
    newLeadTypes.forEach(lt => {
      console.log(`   ${lt.id}. ${lt.name.padEnd(15)} ${lt.color}`);
    });
    console.log('─'.repeat(50));

  } catch (error) {
    // Rollback on error
    if (connection) {
      await connection.rollback();
    }
    console.error('❌ Error regenerating lead_types:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

// Run the migration
regenerateLeadTypes();
