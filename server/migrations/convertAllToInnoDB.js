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

    // Get all MyISAM tables
    const [myisamTables] = await connection.query(
      `SELECT TABLE_NAME
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ? AND ENGINE = 'MyISAM'`,
      [process.env.DB_NAME || 'agent_crm']
    );

    if (myisamTables.length === 0) {
      console.log('ℹ️  All tables are already InnoDB');
      return;
    }

    console.log(`📋 Found ${myisamTables.length} MyISAM table(s) to convert:`);
    myisamTables.forEach(t => console.log('   -', t.TABLE_NAME));
    console.log('');

    // Convert each table
    for (const table of myisamTables) {
      const tableName = table.TABLE_NAME;
      console.log(`Converting ${tableName}...`);
      await connection.query(`ALTER TABLE \`${tableName}\` ENGINE=InnoDB`);
      console.log(`  ✅ ${tableName} converted to InnoDB`);
    }

    console.log('');
    console.log('🎉 All tables successfully converted to InnoDB!');

    // Verify
    const [remaining] = await connection.query(
      `SELECT TABLE_NAME
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ? AND ENGINE = 'MyISAM'`,
      [process.env.DB_NAME || 'agent_crm']
    );

    if (remaining.length > 0) {
      console.log('⚠️  Warning: Some tables still using MyISAM:');
      remaining.forEach(t => console.log('   -', t.TABLE_NAME));
    } else {
      console.log('✅ Verified: All tables are now using InnoDB');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
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
