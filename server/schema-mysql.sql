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

-- Contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  lead_type ENUM('Probate', 'Refi', 'Equity', 'Permit', 'New Home'),
  status VARCHAR(50) DEFAULT 'new',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_lead_type (lead_type),
  INDEX idx_status (status)
);
