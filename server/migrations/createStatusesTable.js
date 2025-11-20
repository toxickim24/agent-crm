import pool from '../config/database.js';

const createStatusesTable = async () => {
  try {
    console.log('🔄 Creating statuses table...');

    // Create statuses table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS statuses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        color VARCHAR(7) DEFAULT '#3B82F6',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_name (name)
      )
    `);
    console.log('✅ Statuses table created');

    // Insert default statuses
    const defaultStatuses = [
      { name: 'New', color: '#3B82F6' },         // Blue
      { name: 'Contacted', color: '#8B5CF6' },  // Purple
      { name: 'Qualified', color: '#10B981' },  // Green
      { name: 'Negotiating', color: '#F59E0B' }, // Orange
      { name: 'Closed', color: '#EF4444' }      // Red
    ];

    for (const status of defaultStatuses) {
      await pool.query(
        'INSERT INTO statuses (name, color) VALUES (?, ?) ON DUPLICATE KEY UPDATE name=name',
        [status.name, status.color]
      );
    }
    console.log('✅ Default statuses inserted');

    // Check if contacts table has status_id column
    const [columns] = await pool.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'agent_crm'
      AND TABLE_NAME = 'contacts'
      AND COLUMN_NAME = 'status_id'
    `);

    if (columns.length === 0) {
      console.log('🔄 Adding status_id column to contacts table...');

      // Add status_id column
      await pool.query(`
        ALTER TABLE contacts
        ADD COLUMN status_id INT AFTER status,
        ADD FOREIGN KEY (status_id) REFERENCES statuses(id) ON DELETE SET NULL
      `);
      console.log('✅ Added status_id column');

      // Migrate existing status values to status_id
      console.log('🔄 Migrating existing status values...');
      const [contacts] = await pool.query('SELECT id, status FROM contacts WHERE status IS NOT NULL');

      let migrated = 0;
      for (const contact of contacts) {
        // Find matching status in new table
        const [statuses] = await pool.query(
          'SELECT id FROM statuses WHERE LOWER(name) = LOWER(?)',
          [contact.status]
        );

        if (statuses.length > 0) {
          await pool.query(
            'UPDATE contacts SET status_id = ? WHERE id = ?',
            [statuses[0].id, contact.id]
          );
          migrated++;
        } else {
          // Default to 'New' if no match found
          const [newStatus] = await pool.query('SELECT id FROM statuses WHERE name = ?', ['New']);
          if (newStatus.length > 0) {
            await pool.query(
              'UPDATE contacts SET status_id = ? WHERE id = ?',
              [newStatus[0].id, contact.id]
            );
            migrated++;
          }
        }
      }
      console.log(`✅ Migrated ${migrated} contact statuses`);
    } else {
      console.log('⏭️  status_id column already exists');
    }

    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

createStatusesTable();
