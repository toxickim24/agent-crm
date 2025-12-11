import pool from './config/database.js';

async function seedAutomations() {
  try {
    console.log('Seeding automation workflows...\n');

    // Sample automation data
    const automations = [
      {
        brevo_automation_id: 1001,
        name: 'Welcome Email Series',
        status: 'active',
        contacts_total: 1250,
        contacts_active: 850,
        contacts_paused: 120,
        contacts_finished: 280,
        contacts_started: 1250,
        contacts_suspended: 0,
        last_edited_at: new Date('2025-12-01')
      },
      {
        brevo_automation_id: 1002,
        name: 'Abandoned Cart Recovery',
        status: 'active',
        contacts_total: 890,
        contacts_active: 560,
        contacts_paused: 80,
        contacts_finished: 250,
        contacts_started: 890,
        contacts_suspended: 0,
        last_edited_at: new Date('2025-11-28')
      },
      {
        brevo_automation_id: 1003,
        name: 'Re-engagement Campaign',
        status: 'paused',
        contacts_total: 2340,
        contacts_active: 0,
        contacts_paused: 2340,
        contacts_finished: 0,
        contacts_started: 2340,
        contacts_suspended: 0,
        last_edited_at: new Date('2025-11-15')
      },
      {
        brevo_automation_id: 1004,
        name: 'Birthday Celebration',
        status: 'active',
        contacts_total: 3450,
        contacts_active: 2100,
        contacts_paused: 150,
        contacts_finished: 1200,
        contacts_started: 3450,
        contacts_suspended: 0,
        last_edited_at: new Date('2025-12-05')
      },
      {
        brevo_automation_id: 1005,
        name: 'Post-Purchase Follow-up',
        status: 'active',
        contacts_total: 1680,
        contacts_active: 980,
        contacts_paused: 200,
        contacts_finished: 500,
        contacts_started: 1680,
        contacts_suspended: 0,
        last_edited_at: new Date('2025-12-08')
      },
      {
        brevo_automation_id: 1006,
        name: 'Lead Nurturing - Cold',
        status: 'inactive',
        contacts_total: 0,
        contacts_active: 0,
        contacts_paused: 0,
        contacts_finished: 0,
        contacts_started: 0,
        contacts_suspended: 0,
        last_edited_at: new Date('2025-10-20')
      },
      {
        brevo_automation_id: 1007,
        name: 'Webinar Reminder Series',
        status: 'active',
        contacts_total: 560,
        contacts_active: 420,
        contacts_paused: 40,
        contacts_finished: 100,
        contacts_started: 560,
        contacts_suspended: 0,
        last_edited_at: new Date('2025-12-09')
      },
      {
        brevo_automation_id: 1008,
        name: 'Trial Expiration Reminder',
        status: 'paused',
        contacts_total: 780,
        contacts_active: 0,
        contacts_paused: 780,
        contacts_finished: 0,
        contacts_started: 780,
        contacts_suspended: 0,
        last_edited_at: new Date('2025-11-25')
      }
    ];

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Get user_id (assuming admin user with id 7)
      const userId = 7;

      // Insert each automation
      for (const automation of automations) {
        await connection.query(
          `INSERT INTO brevo_automations
           (user_id, brevo_automation_id, name, status, contacts_total, contacts_active,
            contacts_paused, contacts_finished, contacts_started, contacts_suspended,
            last_edited_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           status = VALUES(status),
           contacts_total = VALUES(contacts_total),
           contacts_active = VALUES(contacts_active),
           contacts_paused = VALUES(contacts_paused),
           contacts_finished = VALUES(contacts_finished),
           contacts_started = VALUES(contacts_started),
           contacts_suspended = VALUES(contacts_suspended),
           last_edited_at = VALUES(last_edited_at)`,
          [
            userId,
            automation.brevo_automation_id,
            automation.name,
            automation.status,
            automation.contacts_total,
            automation.contacts_active,
            automation.contacts_paused,
            automation.contacts_finished,
            automation.contacts_started,
            automation.contacts_suspended,
            automation.last_edited_at
          ]
        );
        console.log(`✅ Inserted: ${automation.name}`);
      }

      await connection.commit();
      console.log(`\n✅ Successfully seeded ${automations.length} automation workflows!`);

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    await pool.end();
  } catch (error) {
    console.error('❌ Error seeding automations:', error);
    process.exit(1);
  }
}

seedAutomations();
