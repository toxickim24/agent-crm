import pool from './config/database.js';

const analyzeMailchimpContacts = async () => {
  try {
    console.log('🔍 Analyzing Mailchimp contacts in database...\n');

    const connection = await pool.getConnection();

    // Get all lead types with Mailchimp configs
    const [leadTypes] = await connection.query(`
      SELECT DISTINCT mc.lead_type_id, lt.name as lead_type_name, mc.user_id
      FROM mailchimp_contacts mc
      LEFT JOIN lead_types lt ON mc.lead_type_id = lt.id
      WHERE mc.deleted_at IS NULL
      ORDER BY mc.lead_type_id
    `);

    console.log('📊 Lead Types with contacts:');
    leadTypes.forEach(lt => {
      console.log(`  - Lead Type ID: ${lt.lead_type_id}, Name: ${lt.lead_type_name || 'N/A'}, User ID: ${lt.user_id}`);
    });
    console.log('');

    // For each lead type, get detailed stats
    for (const leadType of leadTypes) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Lead Type: ${leadType.lead_type_name || 'N/A'} (ID: ${leadType.lead_type_id})`);
      console.log(`User ID: ${leadType.user_id}`);
      console.log(`${'='.repeat(60)}\n`);

      // Total count
      const [totalCount] = await connection.query(`
        SELECT COUNT(*) as count
        FROM mailchimp_contacts
        WHERE lead_type_id = ? AND user_id = ? AND deleted_at IS NULL
      `, [leadType.lead_type_id, leadType.user_id]);
      console.log(`Total Contacts: ${totalCount[0].count}`);

      // Count by status
      const [statusCounts] = await connection.query(`
        SELECT status, COUNT(*) as count
        FROM mailchimp_contacts
        WHERE lead_type_id = ? AND user_id = ? AND deleted_at IS NULL
        GROUP BY status
        ORDER BY count DESC
      `, [leadType.lead_type_id, leadType.user_id]);

      console.log('\nContacts by Status:');
      statusCounts.forEach(sc => {
        console.log(`  ${sc.status || 'NULL'}: ${sc.count}`);
      });

      // Check for duplicates by subscriber_hash
      const [duplicates] = await connection.query(`
        SELECT subscriber_hash, COUNT(*) as count
        FROM mailchimp_contacts
        WHERE lead_type_id = ? AND user_id = ? AND deleted_at IS NULL
        GROUP BY subscriber_hash
        HAVING count > 1
      `, [leadType.lead_type_id, leadType.user_id]);

      if (duplicates.length > 0) {
        console.log('\n⚠️  DUPLICATES FOUND:');
        duplicates.forEach(dup => {
          console.log(`  Subscriber Hash: ${dup.subscriber_hash}, Count: ${dup.count}`);
        });
      } else {
        console.log('\n✅ No duplicates found (by subscriber_hash)');
      }

      // Check for duplicates by email_address
      const [emailDuplicates] = await connection.query(`
        SELECT email_address, COUNT(*) as count
        FROM mailchimp_contacts
        WHERE lead_type_id = ? AND user_id = ? AND deleted_at IS NULL
        GROUP BY email_address
        HAVING count > 1
      `, [leadType.lead_type_id, leadType.user_id]);

      if (emailDuplicates.length > 0) {
        console.log('\n⚠️  EMAIL DUPLICATES FOUND:');
        emailDuplicates.forEach(dup => {
          console.log(`  Email: ${dup.email_address}, Count: ${dup.count}`);
        });
      } else {
        console.log('✅ No duplicates found (by email_address)');
      }

      // Check for soft-deleted contacts
      const [deletedCount] = await connection.query(`
        SELECT COUNT(*) as count
        FROM mailchimp_contacts
        WHERE lead_type_id = ? AND user_id = ? AND deleted_at IS NOT NULL
      `, [leadType.lead_type_id, leadType.user_id]);

      if (deletedCount[0].count > 0) {
        console.log(`\n📋 Soft-deleted contacts: ${deletedCount[0].count}`);
      }

      // Get list_id info
      const [listIds] = await connection.query(`
        SELECT list_id, COUNT(*) as count
        FROM mailchimp_contacts
        WHERE lead_type_id = ? AND user_id = ? AND deleted_at IS NULL
        GROUP BY list_id
      `, [leadType.lead_type_id, leadType.user_id]);

      console.log('\nContacts by List ID:');
      listIds.forEach(lid => {
        console.log(`  List ID: ${lid.list_id}, Count: ${lid.count}`);
      });

      // Check sync status
      const [syncStatus] = await connection.query(`
        SELECT sync_status, COUNT(*) as count
        FROM mailchimp_contacts
        WHERE lead_type_id = ? AND user_id = ? AND deleted_at IS NULL
        GROUP BY sync_status
      `, [leadType.lead_type_id, leadType.user_id]);

      console.log('\nContacts by Sync Status:');
      syncStatus.forEach(ss => {
        console.log(`  ${ss.sync_status || 'NULL'}: ${ss.count}`);
      });
    }

    // Check if there are contacts without a lead_type_id
    const [noLeadType] = await connection.query(`
      SELECT COUNT(*) as count
      FROM mailchimp_contacts
      WHERE lead_type_id IS NULL AND deleted_at IS NULL
    `);

    if (noLeadType[0].count > 0) {
      console.log(`\n⚠️  Contacts without lead_type_id: ${noLeadType[0].count}`);
    }

    connection.release();
    console.log('\n✅ Analysis complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Analysis error:', error);
    process.exit(1);
  }
};

analyzeMailchimpContacts();
