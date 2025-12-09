# Production Deployment Guide

## Logo Upload Fix - Critical Configuration

### Problem
Logo uploads work in localhost but fail in production because the static file paths are not accessible.

### Root Cause
The application uses `process.cwd()` (current working directory) to locate the `public` folder for serving static files. In production, if the server is started from a different directory or the folder structure differs, uploaded logos become inaccessible.

### Solution Implemented

#### 1. Updated Static File Serving (server/index.js)
- Changed from `path.join(__dirname, '../public')` to `process.env.PUBLIC_PATH || path.join(process.cwd(), 'public')`
- Added directory existence checks with automatic creation
- Added comprehensive logging for debugging
- Now respects `PUBLIC_PATH` environment variable for custom configurations

#### 2. Updated Upload Routes (server/routes/admin.js)
- Synchronized upload destination with static file serving logic
- Uses same `PUBLIC_PATH` environment variable
- Added logging for file operations

#### 3. Updated Vite Configuration (vite.config.js)
- Added `/uploads` proxy for development
- Configured proper build output directory

## Production Deployment Instructions

### Method 1: Standard Deployment (Recommended)

1. **Set Working Directory**
   ```bash
   cd /path/to/agent-crm
   ```

2. **Build Frontend**
   ```bash
   npm run build
   ```

3. **Ensure Public Directory Exists**
   ```bash
   mkdir -p public/uploads/logos
   chmod 755 public/uploads/logos
   ```

4. **Start Server from Project Root**
   ```bash
   # IMPORTANT: Run from project root, not from server directory
   node server/index.js
   ```

### Method 2: Custom Public Path

If your production environment requires the `public` folder to be in a different location:

1. **Set Environment Variable**
   ```bash
   export PUBLIC_PATH=/var/www/uploads
   # or in .env file:
   PUBLIC_PATH=/var/www/uploads
   ```

2. **Create Directory Structure**
   ```bash
   mkdir -p /var/www/uploads/uploads/logos
   chmod 755 /var/www/uploads/uploads/logos
   ```

3. **Start Server**
   ```bash
   node server/index.js
   ```

### Method 3: Using PM2 (Recommended for Production)

1. **Create PM2 Ecosystem File** (`ecosystem.config.js`)
   ```javascript
   module.exports = {
     apps: [{
       name: 'agent-crm',
       script: 'server/index.js',
       cwd: '/path/to/agent-crm', // IMPORTANT: Project root
       env: {
         NODE_ENV: 'production',
         PORT: 5000,
         PUBLIC_PATH: '/path/to/agent-crm/public' // Optional: custom path
       }
     }]
   };
   ```

2. **Start with PM2**
   ```bash
   pm2 start ecosystem.config.js
   ```

### Method 4: Docker Deployment

```dockerfile
FROM node:18

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Build frontend
RUN npm run build

# Create uploads directory
RUN mkdir -p /app/public/uploads/logos && \
    chmod 755 /app/public/uploads/logos

# Set working directory to app root
WORKDIR /app

# Expose port
EXPOSE 5000

# Start server from project root
CMD ["node", "server/index.js"]
```

### Method 5: Nginx Reverse Proxy

If using Nginx as a reverse proxy:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Serve uploaded files directly from Nginx (more efficient)
    location /uploads/ {
        alias /path/to/agent-crm/public/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Proxy API requests to Node.js
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Serve frontend static files
    location / {
        root /path/to/agent-crm/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

## Troubleshooting

### Issue: Logos not showing in production

1. **Check Server Logs**
   Look for these log messages when starting the server:
   ```
   📁 Static files directory: /path/to/public
   📁 Current working directory: /path/to/agent-crm
   📁 __dirname: /path/to/agent-crm/server
   ```

2. **Verify Directory Structure**
   ```bash
   ls -la /path/to/agent-crm/public/uploads/logos
   ```

3. **Check File Permissions**
   ```bash
   chmod -R 755 /path/to/agent-crm/public
   ```

4. **Test File Access**
   Try accessing a logo directly:
   ```bash
   curl http://your-domain.com/uploads/logos/test-file.png
   ```

5. **Check Environment Variables**
   ```bash
   echo $PUBLIC_PATH
   printenv | grep PUBLIC
   ```

### Issue: "Directory does not exist" error

The server will automatically create missing directories. If it fails:
- Check write permissions on parent directory
- Verify the user running the server has appropriate permissions
- Manually create the directory: `mkdir -p public/uploads/logos`

### Issue: Uploads work but old logos don't show

This means the logos were uploaded to a different location. To fix:
1. Find where old logos are stored
2. Move them to the new location:
   ```bash
   mv /old/path/uploads/logos/* /path/to/agent-crm/public/uploads/logos/
   ```

## Environment Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `PUBLIC_PATH` | Custom path to public directory | `{projectRoot}/public` | `/var/www/uploads` |
| `PORT` | Server port | `5000` | `3000` |
| `NODE_ENV` | Environment mode | `development` | `production` |

## Best Practices

1. **Always start the server from the project root directory**
2. **Use absolute paths in environment variables**
3. **Ensure write permissions on public/uploads/logos**
4. **Use a persistent volume for uploads in containerized environments**
5. **Regularly backup the uploads directory**
6. **Consider using object storage (S3, etc.) for production uploads**

## Monitoring

When uploads request comes in, you'll see detailed logs:
```
🖼️ Static file request: /logos/filename.png
📍 Looking for file at: /path/to/public/uploads/logos/filename.png
📍 File exists: true
```

If a file is not found:
```
❌ File not found at: /path/to/public/uploads/logos/filename.png
```

## Security Considerations

1. **Validate file types on upload** (already implemented)
2. **Limit file sizes** (already set to 5MB)
3. **Sanitize filenames** (already using timestamps)
4. **Set proper file permissions** (755 for directories, 644 for files)
5. **Consider using a CDN** for production deployments

## Rollback Instructions

If you need to revert to the old behavior:

1. Change `server/index.js` line 33:
   ```javascript
   const publicPath = path.join(__dirname, '../public');
   ```

2. Restart the server

However, this will reintroduce the production path issue.
