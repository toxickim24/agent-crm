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
ssh root@YOUR_VPS_IP
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

# Login to MySQL
sudo mysql

# Create database and user
CREATE DATABASE agent_crm;
CREATE USER 'agentcrm_user'@'localhost' IDENTIFIED BY 'YOUR_SECURE_PASSWORD';
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
git clone YOUR_REPOSITORY_URL agent-crm

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
DB_PASSWORD=YOUR_SECURE_PASSWORD
DB_NAME=agent_crm

# JWT Secret (generate a strong random string)
JWT_SECRET=your-very-long-and-secure-random-string-change-this
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
```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;

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

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal is configured automatically
# Test auto-renewal
sudo certbot renew --dry-run
```

---

## 11. Initialize Database

Run the seed script to create tables and initial admin user:
```bash
cd /var/www/agent-crm
npm run seed
```

---

## 12. Verify Deployment

1. **Check server status:**
   ```bash
   pm2 status
   ```

2. **Check logs:**
   ```bash
   pm2 logs agent-crm
   ```

3. **Test the application:**
   - Open `http://YOUR_DOMAIN_OR_IP` in browser
   - Login with default admin: `admin@agentcrm.com` / `Admin123!`
   - **IMPORTANT:** Change the admin password immediately!

4. **Test webhook API:**
   ```bash
   curl http://YOUR_DOMAIN_OR_IP/api/webhook/health
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

### Application not starting
```bash
pm2 logs agent-crm --lines 50
```

### Nginx 502 Bad Gateway
- Check if Node.js app is running: `pm2 status`
- Check app logs: `pm2 logs agent-crm`

### Database connection issues
- Verify MySQL is running: `sudo systemctl status mysql`
- Test connection: `mysql -u agentcrm_user -p -h localhost agent_crm`

### Permission denied errors
```bash
sudo chown -R $USER:$USER /var/www/agent-crm
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

**Node.js:** v20.x LTS
**npm:** v10.x
**Ubuntu:** 24.04 LTS
