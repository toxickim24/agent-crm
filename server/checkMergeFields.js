import pool from './config/database.js';

const checkMergeFields = async () => {
  try {
    console.log('🔍 Checking merge_fields in mailchimp_contacts...\n');

    const connection = await pool.getConnection();

    // Get a sample contact to see what data we have
    const [contacts] = await connection.query(`
      SELECT id, email_address, merge_fields, status
      FROM mailchimp_contacts
      WHERE deleted_at IS NULL
      LIMIT 5
    `);

    console.log(`📊 Found ${contacts.length} contacts (showing first 5)\n`);

    contacts.forEach((contact, index) => {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Contact ${index + 1}:`);
      console.log(`Email: ${contact.email_address}`);
      console.log(`Status: ${contact.status}`);
      console.log(`Merge Fields Type: ${typeof contact.merge_fields}`);
      console.log(`Merge Fields Value: ${contact.merge_fields}`);

      if (contact.merge_fields) {
        try {
          const parsed = typeof contact.merge_fields === 'string'
            ? JSON.parse(contact.merge_fields)
            : contact.merge_fields;
          console.log(`\nParsed merge_fields:`);
          console.log(JSON.stringify(parsed, null, 2));
        } catch (e) {
          console.log(`❌ Error parsing merge_fields: ${e.message}`);
        }
      } else {
        console.log('⚠️  merge_fields is NULL or empty');
      }
    });

    // Check if any contacts have merge_fields populated
    const [stats] = await connection.query(`
      SELECT
        COUNT(*) as total_contacts,
        SUM(CASE WHEN merge_fields IS NOT NULL AND merge_fields != '' AND merge_fields != '{}' THEN 1 ELSE 0 END) as with_merge_fields,
        SUM(CASE WHEN merge_fields IS NULL OR merge_fields = '' OR merge_fields = '{}' THEN 1 ELSE 0 END) as without_merge_fields
      FROM mailchimp_contacts
      WHERE deleted_at IS NULL
    `);

    console.log(`\n\n${'='.repeat(60)}`);
    console.log('📈 Statistics:');
    console.log(`Total Contacts: ${stats[0].total_contacts}`);
    console.log(`With merge_fields: ${stats[0].with_merge_fields}`);
    console.log(`Without merge_fields: ${stats[0].without_merge_fields}`);

    connection.release();
    console.log('\n✅ Check complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

checkMergeFields();
