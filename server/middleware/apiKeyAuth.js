import pool from '../config/database.js';

export const authenticateApiKey = async (req, res, next) => {
  try {
    // Get API key from Authorization header (Bearer token format)
    const authHeader = req.headers['authorization'];
    const apiKey = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : null;

    // Also check for x-api-key header as alternative
    const apiKeyFromHeader = req.headers['x-api-key'];
    const finalApiKey = apiKey || apiKeyFromHeader;

    if (!finalApiKey) {
      return res.status(401).json({
        error: 'API key required. Provide it via Authorization: Bearer YOUR_API_KEY or X-API-Key header.'
      });
    }

    // Validate API key and get user info
    const [apiKeys] = await pool.query(
      `SELECT ak.id, ak.user_id, ak.is_active, u.status as user_status, u.id as user_id, u.email, u.name
       FROM api_keys ak
       JOIN users u ON ak.user_id = u.id
       WHERE ak.api_key = ? AND ak.is_active = 1`,
      [finalApiKey]
    );

    if (apiKeys.length === 0) {
      return res.status(401).json({ error: 'Invalid or inactive API key.' });
    }

    const apiKeyData = apiKeys[0];

    // Check if user account is active
    if (apiKeyData.user_status !== 'active') {
      return res.status(403).json({ error: 'User account is not active.' });
    }

    // Update last_used_at timestamp (non-blocking)
    pool.query(
      'UPDATE api_keys SET last_used_at = NOW() WHERE id = ?',
      [apiKeyData.id]
    ).catch(err => console.error('[API Key Auth] Failed to update last_used_at:', err.message));

    // Attach user info to request
    req.user = {
      id: apiKeyData.user_id,
      email: apiKeyData.email,
      name: apiKeyData.name,
      status: apiKeyData.user_status
    };

    next();
  } catch (error) {
    console.error('API key authentication error:', error);
    return res.status(500).json({ error: 'Authentication failed.' });
  }
};
