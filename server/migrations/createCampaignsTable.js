import pool from '../config/database.js';

const createCampaignsTable = async () => {
  try {
    console.log('🔄 Creating campaigns table...');

    const connection = await pool.getConnection();

    // Check if table exists
    const [tables] = await connection.query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'campaigns'
    `);

    if (tables.length === 0) {
      console.log('➕ Creating campaigns table...');
      await connection.query(`
        CREATE TABLE campaigns (
          id INT AUTO_INCREMENT PRIMARY KEY,
          mail_sequence_value VARCHAR(255) NOT NULL,
          step INT NOT NULL,
          mail_design_label VARCHAR(255) NOT NULL,
          mail_cost DECIMAL(10, 2) NOT NULL,
          deleted_at TIMESTAMP NULL DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_deleted_at (deleted_at)
        )
      `);
      console.log('✅ campaigns table created successfully');
    } else {
      console.log('✅ campaigns table already exists');
    }

    connection.release();
    console.log('✅ Migration completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
};

createCampaignsTable();
