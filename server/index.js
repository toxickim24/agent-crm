import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import contactsRoutes from './routes/contacts.js';
import leadTypesRoutes from './routes/leadTypes.js';
import statusesRoutes from './routes/statuses.js';
import apiKeysRoutes from './routes/apiKeys.js';
import webhookRoutes from './routes/webhook.js';
import brevoWebhooksRoutes from './routes/webhooks.js';
import mailersRoutes from './routes/mailers.js';
import mailchimpRoutes from './routes/mailchimp.js';
import brevoRoutes from './routes/brevo.js';
import './config/database.js'; // Initialize database


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased limit for bulk imports

// Global request logger
app.use((req, res, next) => {
  console.log(`🌐 ${req.method} ${req.url}`);
  next();
});

// Serve static files from public directory (for uploaded logos, etc.)
// Use process.cwd() for production reliability - ensures path is relative to project root
const publicPath = process.env.PUBLIC_PATH || path.join(process.cwd(), 'public');
console.log('📁 Static files directory:', publicPath);
console.log('📁 Absolute static path:', path.resolve(publicPath));
console.log('📁 Current working directory:', process.cwd());
console.log('📁 __dirname:', __dirname);

// Ensure public directory exists
if (!fs.existsSync(publicPath)) {
  console.error('❌ Public directory does not exist:', publicPath);
  console.error('❌ Creating public directory...');
  fs.mkdirSync(publicPath, { recursive: true });
}

// Ensure uploads directory exists
const uploadsPath = path.join(publicPath, 'uploads', 'logos');
if (!fs.existsSync(uploadsPath)) {
  console.error('❌ Uploads directory does not exist:', uploadsPath);
  console.error('❌ Creating uploads directory...');
  fs.mkdirSync(uploadsPath, { recursive: true });
}

// Log static file requests
app.use('/uploads', (req, res, next) => {
  console.log('🖼️ Static file request:', req.url);
  const filePath = path.join(publicPath, 'uploads', req.url);
  console.log('📍 Looking for file at:', filePath);
  console.log('📍 File exists:', fs.existsSync(filePath));
  if (!fs.existsSync(filePath)) {
    console.error('❌ File not found at:', filePath);
  }
  next();
});

app.use(express.static(publicPath));

// Request logger
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path}`);
  next();
});
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Log all requests
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url}`);
  next();
});

// Public documentation routes (no authentication required)
// Using /api prefix to avoid conflicts with frontend routing in production
app.get('/api/docs/webhook-documentation', (req, res) => {
  const filePath = path.join(__dirname, '..', 'WEBHOOK_API_DOCUMENTATION.md');
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'text/markdown');
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'Documentation not found' });
  }
});

app.get('/api/docs/webhook-quickstart', (req, res) => {
  const filePath = path.join(__dirname, '..', 'WEBHOOK_QUICKSTART.md');
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'text/markdown');
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'Quick start guide not found' });
  }
});

// Legacy routes for backward compatibility (redirect to new routes)
app.get('/WEBHOOK_API_DOCUMENTATION.md', (req, res) => {
  res.redirect('/api/docs/webhook-documentation');
});

app.get('/WEBHOOK_QUICKSTART.md', (req, res) => {
  res.redirect('/api/docs/webhook-quickstart');
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/lead-types', leadTypesRoutes);
app.use('/api/statuses', statusesRoutes);
app.use('/api/api-keys', apiKeysRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/webhooks', brevoWebhooksRoutes);
app.use('/api/mailers', mailersRoutes);
app.use('/api/mailchimp', mailchimpRoutes);
app.use('/api/brevo', brevoRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ ERROR HANDLER CAUGHT:', err.message);
  console.error('Error stack:', err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Admin credentials: admin@labelsalesagents.com / Admin123!`);
});
