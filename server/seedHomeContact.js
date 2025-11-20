import pool from './config/database.js';

const seedHomeContact = async () => {
  try {
    console.log('🌱 Adding demo contact for "Home" lead type...');

    // Get the Home lead type
    const [leadTypes] = await pool.query('SELECT * FROM lead_types WHERE name = ?', ['Home']);

    if (leadTypes.length === 0) {
      console.error('❌ "Home" lead type not found.');
      process.exit(1);
    }

    const homeLeadType = leadTypes[0];

    // Get a user ID
    const [users] = await pool.query('SELECT id FROM users WHERE role = "client" LIMIT 1');
    let userId = users.length > 0 ? users[0].id : 1;

    const contact = {
      lead_id: 'HOM-2024-001',
      property_address_full: '987 Cedar Boulevard, Aurora',
      property_address_city: 'Aurora',
      property_address_state: 'IL',
      property_address_zipcode: '60505',
      property_address_county: 'Kane',
      estimated_value: 375000,
      property_type: 'Single Family',
      sale_date: '2024-04-20',
      contact_1_name: 'Jennifer Taylor',
      contact_1_phone1: '(630) 555-0606',
      contact_1_email1: 'jennifer.taylor@email.com',
      status: 'contacted'
    };

    // Check if contact already exists
    const [existing] = await pool.query(
      'SELECT id FROM contacts WHERE lead_id = ? AND user_id = ?',
      [contact.lead_id, userId]
    );

    if (existing.length > 0) {
      console.log(`⏭️  Contact already exists`);
      process.exit(0);
    }

    // Insert the contact
    await pool.query(
      `INSERT INTO contacts (
        user_id, lead_id, property_address_full, property_address_city,
        property_address_state, property_address_zipcode, property_address_county,
        estimated_value, property_type, sale_date, contact_1_name,
        contact_1_phone1, contact_1_email1, lead_type, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        contact.lead_id,
        contact.property_address_full,
        contact.property_address_city,
        contact.property_address_state,
        contact.property_address_zipcode,
        contact.property_address_county,
        contact.estimated_value,
        contact.property_type,
        contact.sale_date,
        contact.contact_1_name,
        contact.contact_1_phone1,
        contact.contact_1_email1,
        homeLeadType.id,
        contact.status
      ]
    );

    console.log(`✅ Created: ${contact.contact_1_name} (Home)`);
    console.log('🎉 Seeding completed!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding contact:', error);
    process.exit(1);
  }
};

seedHomeContact();
