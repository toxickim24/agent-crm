import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

// Create connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'agent_crm',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Create tables and initialize database
const initDB = async () => {
  try {
    const connection = await pool.getConnection();

    // Users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(191) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'client') NOT NULL DEFAULT 'client',
        status ENUM('pending', 'active', 'suspended') NOT NULL DEFAULT 'pending',
        product_updates BOOLEAN DEFAULT 0,
        logo_url VARCHAR(500) NULL,
        deleted_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Add deleted_at column to existing users table if it doesn't exist
    await connection.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL
    `).catch(() => {});

    // Add logo_url column to existing users table if it doesn't exist
    await connection.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500) NULL
    `).catch(() => {});

    // Permissions table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        home BOOLEAN DEFAULT 1,
        contacts BOOLEAN DEFAULT 1,
        calls_texts BOOLEAN DEFAULT 1,
        emails BOOLEAN DEFAULT 1,
        mailers BOOLEAN DEFAULT 1,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // API configurations table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS api_configs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        aloware_api_key VARCHAR(255),
        aloware_account_id VARCHAR(255),
        mailchimp_api_key VARCHAR(255),
        mailchimp_server_prefix VARCHAR(255),
        dealmachine_api_key VARCHAR(255),
        dealmachine_account_id VARCHAR(255),
        landing_page_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // API Keys table for webhook access
    await connection.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        api_key VARCHAR(64) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        last_used_at TIMESTAMP NULL,
        is_active BOOLEAN DEFAULT 1,
        deleted_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_api_key (api_key),
        INDEX idx_user_active (user_id, is_active)
      )
    `);

    // Add deleted_at column to existing api_keys table if it doesn't exist
    await connection.query(`
      ALTER TABLE api_keys
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL
    `).catch(() => {});

    // Lead Types table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS lead_types (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        color VARCHAR(7) DEFAULT '#3B82F6',
        deleted_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Add deleted_at column to existing lead_types table if it doesn't exist
    await connection.query(`
      ALTER TABLE lead_types
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL
    `).catch(() => {});

    // Insert default lead types
    await connection.query(`
      INSERT IGNORE INTO lead_types (name, color) VALUES
        ('Probate', '#8B5CF6'),
        ('Refi', '#3B82F6'),
        ('Equity', '#10B981'),
        ('Permit', '#F59E0B'),
        ('Home', '#EF4444')
    `);

    // Statuses table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS statuses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        color VARCHAR(7) DEFAULT '#3B82F6',
        deleted_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_name (name)
      )
    `);

    // Insert default statuses
    await connection.query(`
      INSERT IGNORE INTO statuses (name, color) VALUES
        ('New', '#3B82F6'),
        ('Contacted', '#8B5CF6'),
        ('Qualified', '#10B981'),
        ('Negotiating', '#F59E0B'),
        ('Closed', '#EF4444')
    `);

    // First check if contacts table exists at all
    const [tableExists] = await connection.query(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'contacts'
    `);

    if (tableExists[0].count === 0) {
      // Table doesn't exist, create it fresh
      console.log('📋 Creating contacts table...');
      await connection.query(`
        CREATE TABLE contacts (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          lead_id VARCHAR(100),
          property_address_full VARCHAR(500),
          property_address_city VARCHAR(100),
          property_address_state VARCHAR(50),
          property_address_zipcode VARCHAR(20),
          property_address_county VARCHAR(100),
          estimated_value DECIMAL(15, 2),
          property_type VARCHAR(100),
          sale_date DATE,
          contact_1_name VARCHAR(255),
          contact_first_name VARCHAR(100),
          contact_last_name VARCHAR(100),
          contact_1_phone1 VARCHAR(50),
          contact_1_email1 VARCHAR(191),
          lead_type INT,
          status_id INT DEFAULT 1,
          deleted_at TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (lead_type) REFERENCES lead_types(id) ON DELETE SET NULL,
          FOREIGN KEY (status_id) REFERENCES statuses(id) ON DELETE SET NULL
        )
      `);
      console.log('✅ Contacts table created successfully');
    } else {
      // Table exists, check if it needs migration
      const [tableCheck] = await connection.query(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'contacts'
        AND COLUMN_NAME = 'property_address_full'
      `);

      if (tableCheck.length === 0) {
        // Old contacts table exists, need to migrate
        console.log('📋 Migrating contacts table to new schema...');

        // Rename old table
        await connection.query(`RENAME TABLE contacts TO contacts_old`);

        // Create new contacts table
        await connection.query(`
          CREATE TABLE contacts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            lead_id VARCHAR(100),
            property_address_full VARCHAR(500),
            property_address_city VARCHAR(100),
            property_address_state VARCHAR(50),
            property_address_zipcode VARCHAR(20),
            property_address_county VARCHAR(100),
            estimated_value DECIMAL(15, 2),
            property_type VARCHAR(100),
            sale_date DATE,
            contact_1_name VARCHAR(255),
            contact_first_name VARCHAR(100),
            contact_last_name VARCHAR(100),
            contact_1_phone1 VARCHAR(50),
            contact_1_email1 VARCHAR(191),
            lead_type INT,
            status_id INT DEFAULT 1,
            deleted_at TIMESTAMP NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (lead_type) REFERENCES lead_types(id) ON DELETE SET NULL,
            FOREIGN KEY (status_id) REFERENCES statuses(id) ON DELETE SET NULL
          )
        `);

        // Migrate old data
        await connection.query(`
          INSERT INTO contacts (
            id, user_id, contact_1_name, contact_1_email1, contact_1_phone1,
            lead_type, status_id, created_at, updated_at
          )
          SELECT
            c.id,
            c.user_id,
            CONCAT(c.first_name, ' ', c.last_name),
            c.email,
            c.phone,
            lt.id,
            1,
            c.created_at,
            c.updated_at
          FROM contacts_old c
          LEFT JOIN lead_types lt ON c.lead_type = lt.name
        `);

        // Drop old table
        await connection.query(`DROP TABLE contacts_old`);

        console.log('✅ Contacts table migrated successfully');
      }
    }

    // Create default admin user (email: admin@labelsalesagents.com, password: Admin123!)
    const [rows] = await connection.query('SELECT id FROM users WHERE email = ?', ['admin@labelsalesagents.com']);

    if (rows.length === 0) {
      const hashedPassword = bcrypt.hashSync('Admin123!', 10);
      const [result] = await connection.query(
        `INSERT INTO users (name, email, password, role, status)
         VALUES (?, ?, ?, ?, ?)`,
        ['Admin User', 'admin@labelsalesagents.com', hashedPassword, 'admin', 'active']
      );

      // Create default permissions for admin
      await connection.query(
        `INSERT INTO permissions (user_id, home, contacts, calls_texts, emails, mailers)
         VALUES (?, 1, 1, 1, 1, 1)`,
        [result.insertId]
      );

      console.log('✅ Default admin user created: admin@labelsalesagents.com / Admin123!');
    }

    connection.release();
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
    console.error('💡 Please ensure:');
    console.error('   1. MySQL server is running');
    console.error('   2. Database "agent_crm" exists (or create it)');
    console.error('   3. Database credentials in .env are correct');
    process.exit(1);
  }
};

initDB();

export default pool;
