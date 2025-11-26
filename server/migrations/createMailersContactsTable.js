import pool from '../config/database.js';

const createMailersContactsTable = async () => {
  try {
    console.log('🔄 Creating mailers_contacts table...');

    const connection = await pool.getConnection();

    // Check if table exists
    const [tables] = await connection.query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'mailers_contacts'
    `);

    if (tables.length === 0) {
      console.log('➕ Creating mailers_contacts table...');
      await connection.query(`
        CREATE TABLE mailers_contacts (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          lead_id INT NOT NULL,
          campaign_status_label VARCHAR(255),
          mail_sequence_value VARCHAR(255),
          mail_design_label VARCHAR(255),
          total_times_mail_was_sent INT DEFAULT 0,
          last_mail_sent_date DATETIME NULL,
          number_of_mailing_addresses INT DEFAULT 0,
          has_usps_address BOOLEAN DEFAULT FALSE,
          cost DECIMAL(10, 2) DEFAULT 0.00,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (lead_id) REFERENCES contacts(id) ON DELETE CASCADE,
          INDEX idx_user_id (user_id),
          INDEX idx_lead_id (lead_id),
          UNIQUE KEY unique_user_lead (user_id, lead_id)
        )
      `);
      console.log('✅ mailers_contacts table created successfully');
    } else {
      console.log('✅ mailers_contacts table already exists');
    }

    connection.release();
    console.log('✅ Migration completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
};

createMailersContactsTable();
