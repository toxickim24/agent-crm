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

    // Drop existing foreign keys from mailchimp_configs
    console.log('\n📋 Dropping foreign keys from mailchimp_configs...');
    try {
      await connection.query('ALTER TABLE mailchimp_configs DROP FOREIGN KEY mailchimp_configs_ibfk_1');
      console.log('  ✅ Dropped mailchimp_configs_ibfk_1');
    } catch (error) {
      console.log('  ⚠️  mailchimp_configs_ibfk_1 already dropped or does not exist');
    }

    try {
      await connection.query('ALTER TABLE mailchimp_configs DROP FOREIGN KEY mailchimp_configs_ibfk_2');
      console.log('  ✅ Dropped mailchimp_configs_ibfk_2');
    } catch (error) {
      console.log('  ⚠️  mailchimp_configs_ibfk_2 already dropped or does not exist');
    }

    // Drop existing foreign keys from mailchimp_contacts
    console.log('\n📋 Dropping foreign keys from mailchimp_contacts...');
    try {
      await connection.query('ALTER TABLE mailchimp_contacts DROP FOREIGN KEY mailchimp_contacts_ibfk_1');
      console.log('  ✅ Dropped mailchimp_contacts_ibfk_1');
    } catch (error) {
      console.log('  ⚠️  mailchimp_contacts_ibfk_1 already dropped or does not exist');
    }

    try {
      await connection.query('ALTER TABLE mailchimp_contacts DROP FOREIGN KEY mailchimp_contacts_ibfk_2');
      console.log('  ✅ Dropped mailchimp_contacts_ibfk_2');
    } catch (error) {
      console.log('  ⚠️  mailchimp_contacts_ibfk_2 already dropped or does not exist');
    }

    try {
      await connection.query('ALTER TABLE mailchimp_contacts DROP FOREIGN KEY mailchimp_contacts_ibfk_3');
      console.log('  ✅ Dropped mailchimp_contacts_ibfk_3');
    } catch (error) {
      console.log('  ⚠️  mailchimp_contacts_ibfk_3 already dropped or does not exist');
    }

    try {
      await connection.query('ALTER TABLE mailchimp_contacts DROP FOREIGN KEY mailchimp_contacts_ibfk_4');
      console.log('  ✅ Dropped mailchimp_contacts_ibfk_4');
    } catch (error) {
      console.log('  ⚠️  mailchimp_contacts_ibfk_4 already dropped or does not exist');
    }

    // Recreate foreign keys for mailchimp_configs
    console.log('\n📋 Creating foreign keys for mailchimp_configs...');
    await connection.query(`
      ALTER TABLE mailchimp_configs
      ADD CONSTRAINT fk_mailchimp_configs_user
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    `);
    console.log('  ✅ Created fk_mailchimp_configs_user');

    await connection.query(`
      ALTER TABLE mailchimp_configs
      ADD CONSTRAINT fk_mailchimp_configs_lead_type
      FOREIGN KEY (lead_type_id) REFERENCES lead_types(id) ON DELETE CASCADE
    `);
    console.log('  ✅ Created fk_mailchimp_configs_lead_type');

    // Recreate foreign keys for mailchimp_contacts
    console.log('\n📋 Creating foreign keys for mailchimp_contacts...');
    await connection.query(`
      ALTER TABLE mailchimp_contacts
      ADD CONSTRAINT fk_mailchimp_contacts_user
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    `);
    console.log('  ✅ Created fk_mailchimp_contacts_user');

    await connection.query(`
      ALTER TABLE mailchimp_contacts
      ADD CONSTRAINT fk_mailchimp_contacts_contact
      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
    `);
    console.log('  ✅ Created fk_mailchimp_contacts_contact');

    await connection.query(`
      ALTER TABLE mailchimp_contacts
      ADD CONSTRAINT fk_mailchimp_contacts_lead_type
      FOREIGN KEY (lead_type_id) REFERENCES lead_types(id) ON DELETE CASCADE
    `);
    console.log('  ✅ Created fk_mailchimp_contacts_lead_type');

    await connection.query(`
      ALTER TABLE mailchimp_contacts
      ADD CONSTRAINT fk_mailchimp_contacts_config
      FOREIGN KEY (mailchimp_config_id) REFERENCES mailchimp_configs(id) ON DELETE CASCADE
    `);
    console.log('  ✅ Created fk_mailchimp_contacts_config');

    console.log('\n🎉 Foreign keys successfully recreated!');

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
