-- Agent CRM Database Schema
-- MySQL Database

-- Create database
CREATE DATABASE IF NOT EXISTS agent_crm;
USE agent_crm;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'client') NOT NULL DEFAULT 'client',
  status ENUM('pending', 'active', 'suspended') NOT NULL DEFAULT 'pending',
  product_updates BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role (role),
  INDEX idx_status (status)
);

-- Permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  home BOOLEAN DEFAULT 1,
  contacts BOOLEAN DEFAULT 1,
  calls_texts BOOLEAN DEFAULT 1,
  emails BOOLEAN DEFAULT 1,
  mailers BOOLEAN DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id)
);

-- API configurations table
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
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id)
);

-- Lead Types table
CREATE TABLE IF NOT EXISTS lead_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  color VARCHAR(7) DEFAULT '#3B82F6',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name)
);

-- Insert default lead types
INSERT INTO lead_types (name, color) VALUES
  ('Probate', '#8B5CF6'),
  ('Refi', '#3B82F6'),
  ('Equity', '#10B981'),
  ('Permit', '#F59E0B'),
  ('Home', '#EF4444')
ON DUPLICATE KEY UPDATE name=name;

-- Statuses table
CREATE TABLE IF NOT EXISTS statuses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  color VARCHAR(7) DEFAULT '#3B82F6',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name)
);

-- Insert default statuses
INSERT INTO statuses (name, color) VALUES
  ('New', '#3B82F6'),
  ('Contacted', '#8B5CF6'),
  ('Qualified', '#10B981'),
  ('Negotiating', '#F59E0B'),
  ('Closed', '#EF4444')
ON DUPLICATE KEY UPDATE name=name;

-- Contacts table
CREATE TABLE IF NOT EXISTS contacts (
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
  contact_first_name VARCHAR(255),
  contact_last_name VARCHAR(255),
  contact_1_phone1 VARCHAR(50),
  contact_1_email1 VARCHAR(255),
  lead_type INT,
  status_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (lead_type) REFERENCES lead_types(id) ON DELETE SET NULL,
  FOREIGN KEY (status_id) REFERENCES statuses(id) ON DELETE SET NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_lead_id (lead_id),
  INDEX idx_lead_type (lead_type),
  INDEX idx_status_id (status_id),
  INDEX idx_contact_name (contact_1_name),
  INDEX idx_property_city (property_address_city),
  INDEX idx_property_state (property_address_state)
);
