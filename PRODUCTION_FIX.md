# URGENT: Production Logo Upload Fix

## Problem
Logos work initially but fail after a few minutes because Nginx doesn't have a location block for `/uploads`.

## Solution - Update Nginx Configuration

### Step 1: Edit Nginx Config
```bash
sudo nano /etc/nginx/sites-available/agent-crm
```

### Step 2: Add Upload Location Block

**BEFORE the `location /` block**, add this:

```nginx
server {
    listen 80;
    server_name app.labelsalesagents.com;

    # IMPORTANT: Add this block BEFORE the location / block
    # Serve uploaded files directly from public directory
    location /uploads/ {
        alias /var/www/agent-crm/public/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
        access_log off;

        # Security: prevent script execution
        location ~* \.(php|pl|cgi|py|sh|lua)$ {
            deny all;
        }
    }

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

### Step 3: Ensure Uploads Directory Exists
```bash
sudo mkdir -p /var/www/agent-crm/public/uploads/logos
sudo chown -R $USER:$USER /var/www/agent-crm/public
sudo chmod -R 755 /var/www/agent-crm/public
```

### Step 4: Test and Restart Nginx
```bash
# Test configuration
sudo nginx -t

# If test passes, restart
sudo systemctl restart nginx
```

### Step 5: Verify It Works
```bash
# List uploaded files
ls -la /var/www/agent-crm/public/uploads/logos/

# Test accessing a file (replace with actual filename)
curl -I https://app.labelsalesagents.com/uploads/logos/logo-1234567890-123456789.png
# Should return: HTTP/1.1 200 OK
```

---

## Complete Nginx Configuration Example

Here's the full configuration with SSL (after running certbot):

```nginx
server {
    server_name app.labelsalesagents.com;

    # Serve uploaded files
    location /uploads/ {
        alias /var/www/agent-crm/public/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
        access_log off;

        location ~* \.(php|pl|cgi|py|sh|lua)$ {
            deny all;
        }
    }

    # Frontend
    location / {
        root /var/www/agent-crm/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
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

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/app.labelsalesagents.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.labelsalesagents.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    if ($host = app.labelsalesagents.com) {
        return 301 https://$host$request_uri;
    }

    listen 80;
    server_name app.labelsalesagents.com;
    return 404;
}
```

---

## Why This Fix Works

1. **Before**: Nginx tried to find `/uploads/logos/file.png` in the `dist/` folder (doesn't exist)
2. **After**: Nginx serves `/uploads/` directly from `public/uploads/` folder (correct location)
3. **Bonus**: Files are served directly by Nginx (faster than proxying to Node.js)
4. **Security**: PHP and script execution is blocked in uploads directory

---

## Future Deployments

After this fix, your deployment process remains the same:

```bash
cd /var/www/agent-crm
git pull
npm install
npm run build
pm2 restart agent-crm
```

The uploads will persist because:
- They're in `public/uploads/` (outside `dist/`)
- They're gitignored (won't be overwritten by git pull)
- Nginx now serves them directly from the correct location

---

## Backup Uploads Before Deployment (Recommended)

To prevent any data loss during deployments:

```bash
# Create backup script
nano ~/backup-uploads.sh
```

Add:
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/agent-crm-uploads"
SOURCE="/var/www/agent-crm/public/uploads"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"
tar -czf "$BACKUP_DIR/uploads_$DATE.tar.gz" -C /var/www/agent-crm/public uploads/

# Keep only last 10 backups
ls -t "$BACKUP_DIR"/uploads_*.tar.gz | tail -n +11 | xargs -r rm

echo "Backup completed: uploads_$DATE.tar.gz"
```

Make executable:
```bash
chmod +x ~/backup-uploads.sh
```

Run before deployments:
```bash
~/backup-uploads.sh
```

---

## Alternative: Proxy Uploads to Node.js

If you prefer Node.js to handle uploads (less efficient but more flexible):

```nginx
# Instead of the alias method above, use proxy:
location /uploads/ {
    proxy_pass http://localhost:5000/uploads/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

This is less efficient but ensures Node.js has full control over file serving.

---

## Troubleshooting

### Still not working after fix?

```bash
# 1. Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# 2. Check if files exist
ls -la /var/www/agent-crm/public/uploads/logos/

# 3. Check file permissions
stat /var/www/agent-crm/public/uploads/logos/

# 4. Test Nginx config
sudo nginx -t

# 5. Clear browser cache or try incognito mode

# 6. Check PM2 logs
pm2 logs agent-crm
```

### Permission denied errors?

```bash
# Fix ownership
sudo chown -R www-data:www-data /var/www/agent-crm/public/uploads

# Fix permissions
sudo chmod -R 755 /var/www/agent-crm/public/uploads
```

### Want to see upload requests in logs?

Remove `access_log off;` from the uploads location block to see all requests.
