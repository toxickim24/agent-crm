# Agent CRM - Hostinger VPS Deployment Guide

Deploy Agent CRM on Hostinger VPS with Ubuntu 24.04 LTS.

## Requirements

- Hostinger VPS with Ubuntu 24.04 LTS
- Domain name (optional but recommended)
- SSH access to your VPS

---

## 1. Initial Server Setup

### Connect to your VPS
```bash
ssh root@31.97.211.184
```

### Update system packages
```bash
apt update && apt upgrade -y
```

### Create a non-root user (recommended)
```bash
adduser agentcrm
usermod -aG sudo agentcrm
su - agentcrm
```

---

## 2. Install Node.js 20

```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node -v   # Should show v20.x.x
npm -v    # Should show 10.x.x
```

---

## 3. Install MySQL

```bash
# Install MySQL Server
sudo apt install -y mysql-server

# Secure MySQL installation
sudo mysql_secure_installation

VALIDATE PASSWORD PLUGIN? → n
Remove anonymous users? → y
Disallow remote root login? → y
Remove test database? → y
Reload privileges? → y

# Login to MySQL
sudo mysql

# Create database and user
CREATE DATABASE agent_crm;
CREATE USER 'agentcrm_user'@'localhost' IDENTIFIED BY 'Thelabel99??';
GRANT ALL PRIVILEGES ON agent_crm.* TO 'agentcrm_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## 4. Install Git and Clone Project

```bash
# Install Git
sudo apt install -y git

# Create project directory
sudo mkdir -p /var/www/agent-crm
sudo chown $USER:$USER /var/www/agent-crm

# Clone your repository (or upload files)
cd /var/www
git clone https://github.com/toxickim24/agent-crm.git agent-crm

# Or upload via SFTP to /var/www/agent-crm
```

---

## 5. Configure Environment Variables

```bash
cd /var/www/agent-crm

# Create .env file
nano .env
```

Add the following (update with your values):
```env
PORT=5000
NODE_ENV=production

# Database
DB_HOST=localhost
DB_USER=agentcrm_user
DB_PASSWORD=Thelabel99??
DB_NAME=agent_crm

# JWT Secret (generate a strong random string)
JWT_SECRET=Nw$8Pq!eR2u@5kMn%Tz#4Hc^Bb9Xy*Vj3Ff&7Da+Lp0sGgQm!r6WzC1Yt$KhP
```

Save and exit: `Ctrl+X`, then `Y`, then `Enter`

---

## 6. Install Dependencies and Build

```bash
cd /var/www/agent-crm

# Install dependencies
npm install

# Build frontend
npm run build
```
---

## 7. Set Up PM2 Process Manager

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start the application
cd /var/www/agent-crm
pm2 start server/index.js --name "agent-crm"
```

**Note:** On first start, the server automatically creates:
- All database tables (users, contacts, permissions, api_keys, lead_types, statuses, etc.)
- Admin user: `admin@labelsalesagents.com` / `Admin123!`
- Default lead types: Probate, Refi, Equity, Permit, Home
- Default statuses: New, Contacted, Qualified, Negotiating, Closed

**IMPORTANT:** Run the granular permissions migration:
```bash
# This adds detailed permission columns needed for the app to work
node server/migrations/addGranularPermissions.js

# Restart the application
pm2 restart agent-crm
```

```bash
# Configure PM2 to start on boot
pm2 startup
pm2 save

# Useful PM2 commands
pm2 status          # Check status
pm2 logs agent-crm  # View logs
pm2 restart agent-crm
pm2 stop agent-crm
```

---

## 8. Install and Configure Nginx

```bash
# Install Nginx
sudo apt install -y nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/agent-crm
```

Add the following configuration:

**IMPORTANT:** Replace `app.labelsalesagents.com` with your actual domain name.
Do NOT use an IP address - use your domain name for SSL to work properly in step 10.

```nginx
server {
    listen 80;
    server_name app.labelsalesagents.com;  # Replace with YOUR domain

    # Frontend - serve built React app
    location / {
        root /var/www/agent-crm/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API proxy
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
```

Save and exit: `Ctrl+X`, then `Y`, then `Enter`

Enable the configuration:
```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/agent-crm /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

---

## 9. Configure Firewall

```bash
# Allow SSH, HTTP, and HTTPS
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Check status
sudo ufw status
```

---

## 10. SSL Certificate (HTTPS) with Let's Encrypt

**Prerequisites:**
- Your domain DNS A record must point to your VPS IP address
- Nginx configuration must use your domain name (not IP address) in `server_name`

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d yourdomain.com

# If you get "Could not find matching server block" error:
# Make sure your Nginx config has the correct server_name (step 8)
# Then run: sudo certbot install --cert-name yourdomain.com

# Auto-renewal is configured automatically
# Test auto-renewal
sudo certbot renew --dry-run
```

---

## 11. Verify Deployment

1. **Check server status:**
   ```bash
   pm2 status
   ```

2. **Check logs:**
   ```bash
   pm2 logs agent-crm
   ```

3. **Test the application:**
   - Open `https://yourdomain.com` in browser (use HTTPS after SSL setup)
   - Login with default admin: `admin@labelsalesagents.com` / `Admin123!`
   - **IMPORTANT:** Change the admin password immediately!

4. **Test webhook API:**
   ```bash
   curl https://yourdomain.com/api/webhook/health
   # Should return: {"status":"OK","message":"Webhook endpoint is working"}
   ```

---

## Quick Reference Commands

| Task | Command |
|------|---------|
| Restart app | `pm2 restart agent-crm` |
| View logs | `pm2 logs agent-crm` |
| Stop app | `pm2 stop agent-crm` |
| Start app | `pm2 start agent-crm` |
| Restart Nginx | `sudo systemctl restart nginx` |
| Check Nginx status | `sudo systemctl status nginx` |
| MySQL login | `sudo mysql -u agentcrm_user -p agent_crm` |

---

## Troubleshooting

### Application not starting (PM2 shows "errored" status)
```bash
# Check the logs for detailed error messages
pm2 logs agent-crm --lines 50

# Common causes:
# 1. Missing granular permissions - Run: node server/migrations/addGranularPermissions.js
# 2. Database connection failed - Check MySQL is running and .env credentials
# 3. Contacts table doesn't exist - Server should create it automatically on first start
```

### "Unknown column 'p.contact_view'" Error
This means the granular permissions migration wasn't run:
```bash
cd /var/www/agent-crm
node server/migrations/addGranularPermissions.js
pm2 restart agent-crm
```

### Login shows "Connection Refused" or tries to connect to localhost:5000
The frontend API configuration needs to be updated (this is now fixed in the codebase):
- Make sure you have the latest code from the repository
- Rebuild the frontend: `npm run build`
- The API calls should use `/api` (relative URLs) not `http://localhost:5000/api`

### SSL Certificate Error: "Could not find matching server block"
The Nginx configuration is using an IP address instead of domain name:
```bash
# Edit Nginx config
sudo nano /etc/nginx/sites-available/agent-crm

# Change: server_name 123.45.67.89;
# To: server_name yourdomain.com;

# Restart Nginx
sudo nginx -t
sudo systemctl restart nginx

# Install certificate
sudo certbot install --cert-name yourdomain.com
```

### Nginx 502 Bad Gateway
- Check if Node.js app is running: `pm2 status`
- Check app logs: `pm2 logs agent-crm`
- Verify backend is listening on port 5000: `curl http://localhost:5000/api/health`

### Database connection issues
- Verify MySQL is running: `sudo systemctl status mysql`
- Test connection: `mysql -u agentcrm_user -p -h localhost agent_crm`
- Check .env file has correct credentials

### Permission denied errors
```bash
sudo chown -R $USER:$USER /var/www/agent-crm
```

### Check what tables exist in database
```bash
mysql -u agentcrm_user -p agent_crm
# Then in MySQL:
SHOW TABLES;
DESCRIBE permissions;  # Check permissions table structure
exit;
```

---

## Security Checklist

- [ ] Change default admin password
- [ ] Use strong database password
- [ ] Generate secure JWT_SECRET (use `openssl rand -hex 32`)
- [ ] Enable UFW firewall
- [ ] Install SSL certificate
- [ ] Keep system updated: `sudo apt update && sudo apt upgrade`
- [ ] Disable root SSH login (optional)

---

## Updating the Application

```bash
cd /var/www/agent-crm

# Pull latest changes
git pull origin main

# Install new dependencies
npm install

# Rebuild frontend
npm run build

# Restart server
pm2 restart agent-crm
```

---

## Optional: Install phpMyAdmin (Secure Online Access)

If you want a web interface to manage your MySQL database, follow these steps to install phpMyAdmin securely.

### Step 1: Install phpMyAdmin and PHP

```bash
# Install Apache (required for phpMyAdmin)
sudo apt install -y apache2

# Install PHP and required extensions
sudo apt install -y php php-mbstring php-zip php-gd php-json php-curl php-mysql libapache2-mod-php

# Install phpMyAdmin
sudo apt install -y phpmyadmin

# During installation:
# - Web server: Select "apache2" (use spacebar to select)
# - Configure database with dbconfig-common: Yes
# - Enter a password for phpMyAdmin database user
```

### Step 2: Create Secure Access URL

For security, we'll use a custom URL instead of `/phpmyadmin`:

```bash
# Create a symbolic link with a custom name
sudo ln -s /usr/share/phpmyadmin /var/www/html/secure-db-2024

# The URL will be: https://yourdomain.com/secure-db-2024
# Change "secure-db-2024" to something unique and hard to guess
```

### Step 3: Configure Apache

```bash
# Enable Apache to run on a different port (8080) since Nginx uses 80
sudo nano /etc/apache2/ports.conf
```

Change:
```apache
Listen 80
```

To:
```apache
Listen 127.0.0.1:8080
```

Save and exit.

Then edit the default site:
```bash
sudo nano /etc/apache2/sites-available/000-default.conf
```

Change:
```apache
<VirtualHost *:80>
```

To:
```apache
<VirtualHost 127.0.0.1:8080>
```

Save and exit.

### Step 4: Create HTTP Basic Authentication

Add an extra security layer with password protection:

```bash
# Create password file
sudo htpasswd -c /etc/apache2/.htpasswd dbadmin

# Enter a strong password when prompted
# Username: dbadmin (you can change this)
```

Create Apache configuration for phpMyAdmin:
```bash
sudo nano /etc/apache2/conf-available/phpmyadmin.conf
```

Add:
```apache
<Directory /usr/share/phpmyadmin>
    AuthType Basic
    AuthName "Database Administration"
    AuthUserFile /etc/apache2/.htpasswd
    Require valid-user
</Directory>
```

Enable the configuration:
```bash
sudo a2enconf phpmyadmin
sudo systemctl restart apache2
```

### Step 5: Configure Nginx as Reverse Proxy

Update your Nginx configuration:
```bash
sudo nano /etc/nginx/sites-available/agent-crm
```

Add this location block inside your server block (after the /api location):
```nginx
    # phpMyAdmin access (change URL to match your custom name)
    location /secure-db-2024 {
        proxy_pass http://127.0.0.1:8080/secure-db-2024;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Optional: Restrict by IP address
        # allow 123.45.67.89;  # Your office/home IP
        # deny all;
    }
```

Test and restart Nginx:
```bash
sudo nginx -t
sudo systemctl restart nginx
```

### Step 6: Configure phpMyAdmin for Remote Access

```bash
sudo nano /etc/phpmyadmin/config.inc.php
```

Find and update these lines:
```php
$cfg['Servers'][$i]['host'] = 'localhost';
$cfg['Servers'][$i]['AllowNoPassword'] = false;
```

### Step 7: Restart Services

```bash
sudo systemctl restart apache2
sudo systemctl restart nginx
```

### Step 8: Access phpMyAdmin

1. Open your browser and go to: `https://yourdomain.com/secure-db-2024`
2. Enter HTTP Basic Auth credentials (username: `dbadmin`, password: what you set)
3. Then login with MySQL credentials:
   - **Username**: `agentcrm_user`
   - **Password**: `Thelabel99??` (from your .env file)
   - **Server**: Leave blank (uses localhost)

### Security Checklist for phpMyAdmin

- [x] Custom URL (not `/phpmyadmin`)
- [x] HTTP Basic Authentication enabled
- [x] Apache only listens on localhost (not exposed directly)
- [x] Proxied through Nginx with HTTPS
- [ ] Optional: IP whitelist (uncomment the allow/deny lines in Nginx)
- [ ] Change default MySQL credentials if concerned
- [ ] Monitor access logs: `sudo tail -f /var/log/apache2/access.log`

### Troubleshooting phpMyAdmin

**404 Not Found**
```bash
# Check symbolic link exists
ls -la /var/www/html/secure-db-2024

# Verify Apache is running
sudo systemctl status apache2
```

**Cannot login / Access denied**
```bash
# Verify MySQL user exists
sudo mysql -e "SELECT User, Host FROM mysql.user WHERE User='agentcrm_user';"

# Test MySQL connection
mysql -u agentcrm_user -p agent_crm
```

**Connection refused**
```bash
# Check Apache is listening on 8080
sudo netstat -tlnp | grep :8080

# Check Apache error logs
sudo tail -f /var/log/apache2/error.log
```

---

**Node.js:** v20.x LTS
**npm:** v10.x
**Ubuntu:** 24.04 LTS
