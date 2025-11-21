# MySQL Database Setup

This application has been configured to use MySQL instead of SQLite.

## Prerequisites

- MySQL Server installed and running
- MySQL client or phpMyAdmin (if using WAMP)

## Setup Steps

### 1. Create Database

Open your MySQL client (or phpMyAdmin) and create the database:

```sql
CREATE DATABASE agent_crm;
```

### 2. Configure Environment Variables

Update the `.env` file in the root directory with your MySQL credentials:

```env
# Database Configuration
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_NAME=agent_crm
DB_USER=root
DB_PASSWORD=your_mysql_password_here
```

**Important:** Replace `your_mysql_password_here` with your actual MySQL root password.

### 3. Initialize Database Tables

The application will automatically create all necessary tables when you start the server for the first time.

However, if you want to manually run the schema, you can import the SQL file:

```bash
mysql -u root -p agent_crm < server/schema-mysql.sql
```

### 4. Start the Server

```bash
npm run server
# or
npm run server:dev
```

The server will:
- Connect to MySQL
- Create all necessary tables
- Create a default admin user

### Default Admin Credentials

After the server starts, you can log in with:

- **Email:** admin@labelsalesagents.com
- **Password:** Admin123!

## Troubleshooting

### Connection Error

If you see a connection error:

1. **Check MySQL is running:**
   - On WAMP: Make sure MySQL service is started (green icon)
   - Command line: `mysql -u root -p` (should connect)

2. **Verify credentials:**
   - Check DB_USER and DB_PASSWORD in `.env`
   - Try connecting with these credentials using MySQL client

3. **Check database exists:**
   ```sql
   SHOW DATABASES;
   ```
   If `agent_crm` is not listed, create it.

4. **Check port:**
   - Default MySQL port is 3306
   - Verify in `.env` file

### Permission Errors

If you get permission errors, ensure your MySQL user has proper privileges:

```sql
GRANT ALL PRIVILEGES ON agent_crm.* TO 'root'@'localhost';
FLUSH PRIVILEGES;
```

## Database Schema

The following tables will be created:

- **users** - User accounts (admin and clients)
- **permissions** - User permissions for different features
- **api_configs** - API configuration for each user
- **contacts** - Contact/lead information

## Migration from SQLite

If you were previously using SQLite (`database.db`):

1. The old SQLite database file is now ignored by git
2. You'll need to manually migrate data if needed
3. A fresh MySQL database will be created with just the admin user

## Additional Configuration

### Connection Pool Settings

The application uses connection pooling with these defaults:
- Connection Limit: 10
- Queue Limit: 0 (unlimited)

You can modify these in `server/config/database.js` if needed.
