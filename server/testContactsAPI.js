import pool from './config/database.js';

const testContactsAPI = async () => {
  try {
    console.log('🔍 Testing contacts API query...\n');

    const connection = await pool.getConnection();

    // Simulate the exact query from the API
    const query = `
      SELECT mc.*,
             lt.name as lead_type_name, lt.color as lead_type_color
      FROM mailchimp_contacts mc
      LEFT JOIN lead_types lt ON mc.lead_type_id = lt.id
      WHERE mc.user_id = ? AND mc.deleted_at IS NULL
      LIMIT 3`;

    const [contacts] = await connection.query(query, [2]); // user_id = 2

    console.log(`📊 Found ${contacts.length} contacts\n`);

    contacts.forEach((contact, index) => {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Contact ${index + 1}:`);
      console.log(`ID: ${contact.id}`);
      console.log(`Email: ${contact.email_address}`);
      console.log(`\nmerge_fields type: ${typeof contact.merge_fields}`);
      console.log(`merge_fields value: ${JSON.stringify(contact.merge_fields, null, 2)}`);

      if (contact.merge_fields) {
        console.log(`\nFNAME: ${contact.merge_fields.FNAME}`);
        console.log(`LNAME: ${contact.merge_fields.LNAME}`);
        console.log(`CITY: ${contact.merge_fields.CITY}`);
        console.log(`STATE: ${contact.merge_fields.STATE}`);
        console.log(`ZIP: ${contact.merge_fields.ZIP}`);
      }
    });

    connection.release();
    console.log('\n✅ Test complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

testContactsAPI();
