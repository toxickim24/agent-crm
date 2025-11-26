import pool from './config/database.js';

const checkTable = async () => {
  try {
    const [cols] = await pool.query('DESCRIBE contacts');
    console.log('Contacts table columns:');
    cols.forEach(c => console.log('  -', c.Field));
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkTable();
