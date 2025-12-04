import pool from '../config/database.js';

const removeContactIdFromMailchimpContacts = async () => {
  try {
    console.log('🔄 Removing contact_id from mailchimp_contacts table...');

    const connection = await pool.getConnection();

    // Disable foreign key checks temporarily
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    // 1. Drop the old unique constraint that uses contact_id
    console.log('📋 Dropping old unique constraint...');
    try {
      await connection.query(`
        ALTER TABLE mailchimp_contacts
        DROP INDEX unique_contact_list
      `);
      console.log('✅ Old unique constraint dropped');
    } catch (error) {
      if (error.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
        console.log('ℹ️  Unique constraint already removed or does not exist');
      } else {
        throw error;
      }
    }

    // 2. Drop the foreign key constraint for contact_id
    console.log('📋 Dropping foreign key constraint for contact_id...');
    try {
      // First, find the foreign key name
      const [fks] = await connection.query(`
        SELECT CONSTRAINT_NAME
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'mailchimp_contacts'
          AND COLUMN_NAME = 'contact_id'
          AND REFERENCED_TABLE_NAME IS NOT NULL
      `);

      if (fks.length > 0) {
        const fkName = fks[0].CONSTRAINT_NAME;
        await connection.query(`
          ALTER TABLE mailchimp_contacts
          DROP FOREIGN KEY ${fkName}
        `);
        console.log(`✅ Foreign key constraint '${fkName}' dropped`);
      } else {
        console.log('ℹ️  Foreign key constraint already removed or does not exist');
      }
    } catch (error) {
      console.log('⚠️  Warning dropping foreign key:', error.message);
    }

    // 3. Drop the index on contact_id
    console.log('📋 Dropping index on contact_id...');
    try {
      await connection.query(`
        ALTER TABLE mailchimp_contacts
        DROP INDEX idx_contact_id
      `);
      console.log('✅ Index on contact_id dropped');
    } catch (error) {
      if (error.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
        console.log('ℹ️  Index already removed or does not exist');
      } else {
        throw error;
      }
    }

    // 4. Drop the contact_id column
    console.log('📋 Dropping contact_id column...');
    try {
      await connection.query(`
        ALTER TABLE mailchimp_contacts
        DROP COLUMN contact_id
      `);
      console.log('✅ contact_id column dropped');
    } catch (error) {
      if (error.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
        console.log('ℹ️  contact_id column already removed');
      } else {
        throw error;
      }
    }

    // 5. Add new unique constraint based on Mailchimp data
    console.log('📋 Adding new unique constraint on subscriber_hash and list_id...');
    try {
      await connection.query(`
        ALTER TABLE mailchimp_contacts
        ADD UNIQUE KEY unique_subscriber_list (subscriber_hash, list_id)
      `);
      console.log('✅ New unique constraint added');
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('ℹ️  Unique constraint already exists');
      } else {
        throw error;
      }
    }

    // 6. Ensure subscriber_hash has an index for faster lookups
    console.log('📋 Adding index on subscriber_hash...');
    try {
      await connection.query(`
        ALTER TABLE mailchimp_contacts
        ADD INDEX idx_subscriber_hash (subscriber_hash)
      `);
      console.log('✅ Index on subscriber_hash added');
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('ℹ️  Index already exists');
      } else {
        throw error;
      }
    }

    // 7. Verify lead_type_id is still there and properly indexed
    console.log('📋 Verifying lead_type_id...');
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'mailchimp_contacts'
        AND COLUMN_NAME = 'lead_type_id'
    `);

    if (columns.length > 0) {
      console.log('✅ lead_type_id column exists (kept for tracking)');
    } else {
      console.log('⚠️  WARNING: lead_type_id column not found!');
    }

    // Re-enable foreign key checks
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    connection.release();

    console.log('');
    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('📊 Changes made:');
    console.log('  ✓ Removed contact_id column');
    console.log('  ✓ Removed contact_id foreign key constraint');
    console.log('  ✓ Removed old unique constraint (contact_id, list_id)');
    console.log('  ✓ Added new unique constraint (subscriber_hash, list_id)');
    console.log('  ✓ Added index on subscriber_hash');
    console.log('  ✓ Kept lead_type_id for tracking');
    console.log('');
    console.log('🎯 mailchimp_contacts table is now ready for direct Mailchimp pulls!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
};

removeContactIdFromMailchimpContacts();
