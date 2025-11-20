import pool from './config/database.js';

const seedContacts = async () => {
  try {
    console.log('🌱 Seeding dummy contacts...');

    // Get lead types
    const [leadTypes] = await pool.query('SELECT * FROM lead_types ORDER BY id');

    if (leadTypes.length === 0) {
      console.error('❌ No lead types found. Please ensure lead types are created first.');
      process.exit(1);
    }

    // Get a user ID (we'll use user ID 1 - the admin for testing, or first available user)
    const [users] = await pool.query('SELECT id FROM users WHERE role = "client" LIMIT 1');
    let userId = users.length > 0 ? users[0].id : 1; // Fallback to admin if no client exists

    const dummyContacts = [
      {
        lead_type_name: 'Probate',
        lead_id: 'PRB-2024-001',
        property_address_full: '123 Oak Street, Springfield',
        property_address_city: 'Springfield',
        property_address_state: 'IL',
        property_address_zipcode: '62701',
        property_address_county: 'Sangamon',
        estimated_value: 285000,
        property_type: 'Single Family',
        sale_date: '2024-03-15',
        contact_1_name: 'John Smith',
        contact_1_phone1: '(217) 555-0101',
        contact_1_email1: 'john.smith@email.com',
        status: 'new'
      },
      {
        lead_type_name: 'Refi',
        lead_id: 'REF-2024-001',
        property_address_full: '456 Maple Avenue, Chicago',
        property_address_city: 'Chicago',
        property_address_state: 'IL',
        property_address_zipcode: '60601',
        property_address_county: 'Cook',
        estimated_value: 425000,
        property_type: 'Condo',
        sale_date: '2023-08-22',
        contact_1_name: 'Sarah Johnson',
        contact_1_phone1: '(312) 555-0202',
        contact_1_email1: 'sarah.johnson@email.com',
        status: 'contacted'
      },
      {
        lead_type_name: 'Equity',
        lead_id: 'EQU-2024-001',
        property_address_full: '789 Pine Road, Naperville',
        property_address_city: 'Naperville',
        property_address_state: 'IL',
        property_address_zipcode: '60540',
        property_address_county: 'DuPage',
        estimated_value: 520000,
        property_type: 'Single Family',
        sale_date: '2022-11-10',
        contact_1_name: 'Michael Davis',
        contact_1_phone1: '(630) 555-0303',
        contact_1_email1: 'michael.davis@email.com',
        status: 'qualified'
      },
      {
        lead_type_name: 'Permit',
        lead_id: 'PER-2024-001',
        property_address_full: '321 Elm Street, Peoria',
        property_address_city: 'Peoria',
        property_address_state: 'IL',
        property_address_zipcode: '61602',
        property_address_county: 'Peoria',
        estimated_value: 195000,
        property_type: 'Multi-Family',
        sale_date: '2024-01-05',
        contact_1_name: 'Emily Wilson',
        contact_1_phone1: '(309) 555-0404',
        contact_1_email1: 'emily.wilson@email.com',
        status: 'negotiating'
      }
    ];

    let inserted = 0;
    let skipped = 0;

    for (const contact of dummyContacts) {
      // Find the lead type ID
      const leadType = leadTypes.find(lt => lt.name === contact.lead_type_name);

      if (!leadType) {
        console.log(`⚠️  Skipping ${contact.lead_type_name} - lead type not found`);
        skipped++;
        continue;
      }

      // Check if contact already exists
      const [existing] = await pool.query(
        'SELECT id FROM contacts WHERE lead_id = ? AND user_id = ?',
        [contact.lead_id, userId]
      );

      if (existing.length > 0) {
        console.log(`⏭️  Skipping ${contact.contact_1_name} (${contact.lead_type_name}) - already exists`);
        skipped++;
        continue;
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
          leadType.id,
          contact.status
        ]
      );

      console.log(`✅ Created: ${contact.contact_1_name} (${contact.lead_type_name})`);
      inserted++;
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Inserted: ${inserted} contacts`);
    console.log(`   ⏭️  Skipped: ${skipped} contacts`);
    console.log('🎉 Seeding completed!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding contacts:', error);
    process.exit(1);
  }
};

seedContacts();
