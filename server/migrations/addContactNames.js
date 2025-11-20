import pool from '../config/database.js';

const addContactNameFields = async () => {
  try {
    console.log('🔄 Adding contact_first_name and contact_last_name fields...');

    // Check if columns already exist
    const [columns] = await pool.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'agent_crm'
      AND TABLE_NAME = 'contacts'
      AND COLUMN_NAME IN ('contact_first_name', 'contact_last_name')
    `);

    if (columns.length >= 2) {
      console.log('⏭️  Fields already exist, skipping...');
      process.exit(0);
    }

    // Add contact_first_name field
    if (!columns.find(c => c.COLUMN_NAME === 'contact_first_name')) {
      await pool.query(`
        ALTER TABLE contacts
        ADD COLUMN contact_first_name VARCHAR(255) AFTER contact_1_name
      `);
      console.log('✅ Added contact_first_name field');
    }

    // Add contact_last_name field
    if (!columns.find(c => c.COLUMN_NAME === 'contact_last_name')) {
      await pool.query(`
        ALTER TABLE contacts
        ADD COLUMN contact_last_name VARCHAR(255) AFTER contact_first_name
      `);
      console.log('✅ Added contact_last_name field');
    }

    // Parse existing contact names into first/last names
    console.log('🔄 Parsing existing contact names...');
    const [contacts] = await pool.query(`
      SELECT id, contact_1_name
      FROM contacts
      WHERE contact_1_name IS NOT NULL
      AND contact_1_name != ''
      AND (contact_first_name IS NULL OR contact_last_name IS NULL)
    `);

    let updated = 0;
    for (const contact of contacts) {
      const parts = contact.contact_1_name.trim().split(/\s+/);
      const firstName = parts[0] || '';
      const lastName = parts.slice(1).join(' ') || '';

      await pool.query(`
        UPDATE contacts
        SET contact_first_name = ?, contact_last_name = ?
        WHERE id = ?
      `, [firstName, lastName, contact.id]);
      updated++;
    }

    console.log(`✅ Updated ${updated} existing contacts with first/last names`);
    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

addContactNameFields();
