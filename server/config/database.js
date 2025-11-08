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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

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

    // Contacts table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NOT NULL,
        email VARCHAR(191),
        phone VARCHAR(50),
        lead_type ENUM('Probate', 'Refi', 'Equity', 'Permit', 'New Home'),
        status VARCHAR(50) DEFAULT 'new',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create default admin user (email: admin@agentcrm.com, password: Admin123!)
    const [rows] = await connection.query('SELECT id FROM users WHERE email = ?', ['admin@agentcrm.com']);

    if (rows.length === 0) {
      const hashedPassword = bcrypt.hashSync('Admin123!', 10);
      const [result] = await connection.query(
        `INSERT INTO users (name, email, password, role, status)
         VALUES (?, ?, ?, ?, ?)`,
        ['Admin User', 'admin@agentcrm.com', hashedPassword, 'admin', 'active']
      );

      // Create default permissions for admin
      await connection.query(
        `INSERT INTO permissions (user_id, home, contacts, calls_texts, emails, mailers)
         VALUES (?, 1, 1, 1, 1, 1)`,
        [result.insertId]
      );

      console.log('✅ Default admin user created: admin@agentcrm.com / Admin123!');
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
