import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token.' });
  }
};

export const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admin only.' });
  }
  next();
};

export const isActive = (req, res, next) => {
  if (req.user.status !== 'active') {
    return res.status(403).json({ error: 'Account is not active. Please contact administrator.' });
  }
  next();
};

// Check if user has specific permission
export const hasPermission = (permissionKey) => {
  return async (req, res, next) => {
    try {
      // Admins have all permissions
      if (req.user.role === 'admin') {
        return next();
      }

      const userId = req.user.id;

      // Get user permissions
      const [permissions] = await pool.query(
        `SELECT ${permissionKey} FROM permissions WHERE user_id = ?`,
        [userId]
      );

      if (!permissions.length || !permissions[0][permissionKey]) {
        return res.status(403).json({ error: 'You do not have permission to perform this action.' });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({ error: 'Server error while checking permissions.' });
    }
  };
};

// Get user permissions and attach to request
export const getUserPermissions = async (req, res, next) => {
  try {
    // Admins have all permissions
    if (req.user.role === 'admin') {
      req.permissions = {
        allowed_lead_types: null // null means all lead types
      };
      return next();
    }

    const userId = req.user.id;

    // Get user permissions
    const [permissions] = await pool.query(
      'SELECT * FROM permissions WHERE user_id = ?',
      [userId]
    );

    if (permissions.length) {
      req.permissions = permissions[0];
      // Parse allowed_lead_types JSON if it exists
      if (req.permissions.allowed_lead_types) {
        try {
          req.permissions.allowed_lead_types = JSON.parse(req.permissions.allowed_lead_types);
        } catch (e) {
          req.permissions.allowed_lead_types = null;
        }
      }
    } else {
      req.permissions = {};
    }

    next();
  } catch (error) {
    console.error('Get permissions error:', error);
    return res.status(500).json({ error: 'Server error while fetching permissions.' });
  }
};
