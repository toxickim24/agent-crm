-- Agent CRM Database Schema
-- SQLite Database

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT CHECK(role IN ('admin', 'client')) NOT NULL DEFAULT 'client',
  status TEXT CHECK(status IN ('pending', 'active', 'suspended')) NOT NULL DEFAULT 'pending',
  product_updates BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  home BOOLEAN DEFAULT 1,
  contacts BOOLEAN DEFAULT 1,
  calls_texts BOOLEAN DEFAULT 1,
  emails BOOLEAN DEFAULT 1,
  mailers BOOLEAN DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- API configurations table
CREATE TABLE IF NOT EXISTS api_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  aloware_api_key TEXT,
  aloware_account_id TEXT,
  mailchimp_api_key TEXT,
  mailchimp_server_prefix TEXT,
  dealmachine_api_key TEXT,
  dealmachine_account_id TEXT,
  landing_page_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  lead_type TEXT CHECK(lead_type IN ('Probate', 'Refi', 'Equity', 'Permit', 'New Home')),
  status TEXT DEFAULT 'new',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Default admin user
-- Email: admin@labelsalesagents.com
-- Password: Admin123! (hashed with bcrypt, salt rounds: 10)
INSERT INTO users (name, email, password, role, status)
VALUES (
  'Admin User',
  'admin@labelsalesagents.com',
  '$2a$10$YourHashedPasswordHere',
  'admin',
  'active'
) ON CONFLICT(email) DO NOTHING;

-- Default permissions for admin user (assuming user_id = 1)
INSERT INTO permissions (user_id, home, contacts, calls_texts, emails, mailers)
VALUES (1, 1, 1, 1, 1, 1)
ON CONFLICT DO NOTHING;
