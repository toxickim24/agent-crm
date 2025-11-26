import pool from './config/database.js';

const checkData = async () => {
  try {
    // Check mailers_contacts structure
    console.log('=== Checking mailers_contacts data ===\n');

    const [mailers] = await pool.query(`
      SELECT mc.id, mc.lead_id, mc.user_id
      FROM mailers_contacts mc
      WHERE mc.user_id = 2
      LIMIT 5
    `);

    console.log('Sample mailers_contacts records:');
    mailers.forEach(m => {
      console.log(`  MC ID: ${m.id} | lead_id: ${m.lead_id}`);
    });
    console.log();

    // Check what lead_id should be (from contacts)
    console.log('Corresponding contacts data:');
    const [contacts] = await pool.query(`
      SELECT c.id, c.lead_id, c.contact_first_name, c.contact_last_name
      FROM contacts c
      WHERE c.id IN (${mailers.map(m => m.lead_id).join(',') || '0'})
    `);

    contacts.forEach(c => {
      console.log(`  Contact ID: ${c.id} | DealMachine lead_id: ${c.lead_id} | Name: ${c.contact_first_name} ${c.contact_last_name}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkData();
