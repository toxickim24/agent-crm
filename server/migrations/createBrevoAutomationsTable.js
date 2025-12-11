import pool from '../config/database.js';

/**
 * Migration: Create brevo_automations table
 *
 * This table stores automation workflow data from Brevo for read-only display.
 * Data includes workflow status, contact counts at various stages, and metadata.
 */
async function up() {
  const connection = await pool.getConnection();
  try {
    console.log('Creating brevo_automations table...');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS brevo_automations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        brevo_automation_id VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        status ENUM('active', 'paused', 'inactive') DEFAULT 'inactive',
        contacts_total INT DEFAULT 0,
        contacts_active INT DEFAULT 0,
        contacts_paused INT DEFAULT 0,
        contacts_finished INT DEFAULT 0,
        contacts_started INT DEFAULT 0,
        contacts_suspended INT DEFAULT 0,
        last_edited_at DATETIME NULL,
        last_synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_automation (user_id, brevo_automation_id),
        INDEX idx_user_id (user_id),
        INDEX idx_status (status),
        INDEX idx_last_edited (last_edited_at),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ brevo_automations table created successfully');
  } catch (error) {
    console.error('❌ Error creating brevo_automations table:', error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Rollback migration
 */
async function down() {
  const connection = await pool.getConnection();
  try {
    console.log('Dropping brevo_automations table...');
    await connection.query('DROP TABLE IF EXISTS brevo_automations');
    console.log('✅ brevo_automations table dropped successfully');
  } catch (error) {
    console.error('❌ Error dropping brevo_automations table:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    await up();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

export { up, down };
