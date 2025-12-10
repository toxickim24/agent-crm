import axios from 'axios';
import pool from '../config/database.js';

/**
 * Brevo (Sendinblue) Service
 *
 * Handles all READ-ONLY interactions with Brevo API
 * NO data is ever pushed TO Brevo - only pulled FROM Brevo
 *
 * Official Brevo API Docs: https://developers.brevo.com/docs
 */

const BREVO_API_BASE_URL = 'https://api.brevo.com/v3';

class BrevoService {
  /**
   * Create Brevo API client with user's API key
   */
  static createClient(apiKey) {
    return axios.create({
      baseURL: BREVO_API_BASE_URL,
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 seconds
    });
  }

  /**
   * Get user's Brevo API key from database
   */
  static async getUserApiKey(userId) {
    try {
      const [configs] = await pool.query(
        'SELECT brevo_api_key FROM api_configs WHERE user_id = ?',
        [userId]
      );

      if (!configs || configs.length === 0 || !configs[0].brevo_api_key) {
        throw new Error('Brevo API key not configured for this user');
      }

      return configs[0].brevo_api_key;
    } catch (error) {
      console.error('Error fetching Brevo API key:', error);
      throw error;
    }
  }

  /**
   * Test API key validity
   */
  static async testApiKey(apiKey) {
    try {
      const client = this.createClient(apiKey);
      const response = await client.get('/account');
      return {
        valid: true,
        email: response.data.email,
        companyName: response.data.companyName,
        plan: response.data.plan,
      };
    } catch (error) {
      console.error('Brevo API key test failed:', error.response?.data || error.message);
      return {
        valid: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  // =====================================================
  // LISTS - Fetch contact lists from Brevo
  // =====================================================

  /**
   * Fetch all lists from Brevo API
   */
  static async fetchLists(userId) {
    try {
      const apiKey = await this.getUserApiKey(userId);
      const client = this.createClient(apiKey);

      console.log(`📋 Fetching Brevo lists for user ${userId}...`);

      let allLists = [];
      let offset = 0;
      const limit = 50;
      let hasMore = true;

      while (hasMore) {
        const response = await client.get('/contacts/lists', {
          params: { limit, offset },
        });

        const lists = response.data.lists || [];
        allLists = allLists.concat(lists);

        hasMore = lists.length === limit;
        offset += limit;
      }

      console.log(`✅ Fetched ${allLists.length} lists from Brevo`);

      // Cache lists in database
      await this.cacheLists(userId, allLists);

      return allLists;
    } catch (error) {
      console.error('Error fetching Brevo lists:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to fetch lists from Brevo');
    }
  }

  /**
   * Cache fetched lists in database
   */
  static async cacheLists(userId, lists) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      for (const list of lists) {
        await connection.query(
          `INSERT INTO brevo_lists
           (user_id, brevo_list_id, list_name, total_subscribers, total_blacklisted, folder_id, last_synced_at)
           VALUES (?, ?, ?, ?, ?, ?, NOW())
           ON DUPLICATE KEY UPDATE
             list_name = VALUES(list_name),
             total_subscribers = VALUES(total_subscribers),
             total_blacklisted = VALUES(total_blacklisted),
             folder_id = VALUES(folder_id),
             last_synced_at = NOW()`,
          [
            userId,
            list.id,
            list.name,
            list.totalSubscribers || 0,
            list.totalBlacklisted || 0,
            list.folderId || null,
          ]
        );
      }

      await connection.commit();
      console.log(`✅ Cached ${lists.length} lists in database`);
    } catch (error) {
      await connection.rollback();
      console.error('Error caching Brevo lists:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get cached lists from database
   */
  static async getCachedLists(userId) {
    try {
      const [lists] = await pool.query(
        `SELECT * FROM brevo_lists
         WHERE user_id = ?
         ORDER BY list_name ASC`,
        [userId]
      );
      return lists;
    } catch (error) {
      console.error('Error getting cached Brevo lists:', error);
      throw error;
    }
  }

  // =====================================================
  // CONTACTS - Fetch contacts from Brevo
  // =====================================================

  /**
   * Fetch contacts from a specific list
   */
  static async fetchContactsFromList(userId, listId) {
    try {
      const apiKey = await this.getUserApiKey(userId);
      const client = this.createClient(apiKey);

      console.log(`👥 Fetching contacts from Brevo list ${listId}...`);

      let allContacts = [];
      let offset = 0;
      const limit = 50;
      let hasMore = true;

      while (hasMore) {
        const response = await client.get('/contacts', {
          params: {
            listIds: [listId],
            limit,
            offset,
          },
        });

        const contacts = response.data.contacts || [];
        allContacts = allContacts.concat(contacts);

        hasMore = contacts.length === limit;
        offset += limit;
      }

      console.log(`✅ Fetched ${allContacts.length} contacts from Brevo list ${listId}`);

      // Cache contacts
      await this.cacheContacts(userId, allContacts);

      return allContacts;
    } catch (error) {
      console.error('Error fetching Brevo contacts:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to fetch contacts from Brevo');
    }
  }

  /**
   * Fetch ALL contacts (no list filter)
   */
  static async fetchAllContacts(userId) {
    try {
      const apiKey = await this.getUserApiKey(userId);
      const client = this.createClient(apiKey);

      console.log(`👥 Fetching all contacts from Brevo...`);

      let allContacts = [];
      let offset = 0;
      const limit = 50;
      let hasMore = true;

      while (hasMore) {
        const response = await client.get('/contacts', {
          params: { limit, offset },
        });

        const contacts = response.data.contacts || [];
        allContacts = allContacts.concat(contacts);

        hasMore = contacts.length === limit;
        offset += limit;

        // Safety: stop after 10,000 contacts to prevent overload
        if (allContacts.length >= 10000) {
          console.warn('⚠️ Reached 10,000 contact limit. Stopping fetch.');
          break;
        }
      }

      console.log(`✅ Fetched ${allContacts.length} total contacts from Brevo`);

      // Cache contacts
      await this.cacheContacts(userId, allContacts);

      return allContacts;
    } catch (error) {
      console.error('Error fetching all Brevo contacts:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to fetch contacts from Brevo');
    }
  }

  /**
   * Cache fetched contacts in database
   */
  static async cacheContacts(userId, contacts) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      for (const contact of contacts) {
        await connection.query(
          `INSERT INTO brevo_contacts
           (user_id, brevo_contact_id, email, list_ids, attributes, email_blacklisted, sms_blacklisted,
            created_at_brevo, modified_at_brevo, last_synced_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
           ON DUPLICATE KEY UPDATE
             brevo_contact_id = VALUES(brevo_contact_id),
             list_ids = VALUES(list_ids),
             attributes = VALUES(attributes),
             email_blacklisted = VALUES(email_blacklisted),
             sms_blacklisted = VALUES(sms_blacklisted),
             created_at_brevo = VALUES(created_at_brevo),
             modified_at_brevo = VALUES(modified_at_brevo),
             last_synced_at = NOW()`,
          [
            userId,
            contact.id || contact.email,
            contact.email,
            JSON.stringify(contact.listIds || []),
            JSON.stringify(contact.attributes || {}),
            contact.emailBlacklisted || false,
            contact.smsBlacklisted || false,
            contact.createdAt || null,
            contact.modifiedAt || null,
          ]
        );
      }

      await connection.commit();
      console.log(`✅ Cached ${contacts.length} contacts in database`);
    } catch (error) {
      await connection.rollback();
      console.error('Error caching Brevo contacts:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get cached contacts from database
   */
  static async getCachedContacts(userId, filters = {}) {
    try {
      let query = 'SELECT * FROM brevo_contacts WHERE user_id = ?';
      const params = [userId];

      if (filters.listId) {
        query += ' AND JSON_CONTAINS(list_ids, ?)';
        params.push(JSON.stringify([parseInt(filters.listId)]));
      }

      if (filters.search) {
        query += ' AND email LIKE ?';
        params.push(`%${filters.search}%`);
      }

      query += ' ORDER BY email ASC';

      if (filters.limit) {
        query += ' LIMIT ?';
        params.push(parseInt(filters.limit));
      }

      const [contacts] = await pool.query(query, params);
      return contacts;
    } catch (error) {
      console.error('Error getting cached Brevo contacts:', error);
      throw error;
    }
  }

  // =====================================================
  // CAMPAIGNS - Fetch email campaigns from Brevo
  // =====================================================

  /**
   * Fetch all campaigns from Brevo
   */
  static async fetchCampaigns(userId) {
    try {
      const apiKey = await this.getUserApiKey(userId);
      const client = this.createClient(apiKey);

      console.log(`📧 Fetching Brevo campaigns for user ${userId}...`);

      let allCampaigns = [];
      let offset = 0;
      const limit = 50;
      let hasMore = true;

      while (hasMore) {
        const response = await client.get('/emailCampaigns', {
          params: {
            limit,
            offset,
            statistics: 'globalStats'  // Required to fetch campaign statistics
          },
        });

        const campaigns = response.data.campaigns || [];
        allCampaigns = allCampaigns.concat(campaigns);

        hasMore = campaigns.length === limit;
        offset += limit;
      }

      console.log(`✅ Fetched ${allCampaigns.length} campaigns from Brevo`);

      // Fetch statistics for each campaign
      await this.cacheCampaigns(userId, allCampaigns);

      return allCampaigns;
    } catch (error) {
      console.error('Error fetching Brevo campaigns:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to fetch campaigns from Brevo');
    }
  }

  /**
   * Fetch campaign statistics
   */
  static async fetchCampaignStats(apiKey, campaignId) {
    try {
      const client = this.createClient(apiKey);
      const response = await client.get(`/emailCampaigns/${campaignId}`);
      // Brevo API returns statistics nested in globalStats
      return response.data.statistics?.globalStats || {};
    } catch (error) {
      console.error(`Error fetching stats for campaign ${campaignId}:`, error.message);
      return {}; // Return empty stats if failed
    }
  }

  /**
   * Cache campaigns with statistics
   */
  static async cacheCampaigns(userId, campaigns) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      for (const campaign of campaigns) {
        // Use statistics from campaign list response (already has globalStats)
        // No need to make separate API calls!
        let stats = {};
        if (campaign.status === 'sent' && campaign.statistics?.globalStats) {
          stats = campaign.statistics.globalStats;
        }

        // Fix: Brevo API uses uniqueViews for opens, not uniqueOpens
        const openRate = stats.uniqueViews && stats.delivered
          ? ((stats.uniqueViews / stats.delivered) * 100).toFixed(2)
          : 0;
        const clickRate = stats.uniqueClicks && stats.delivered
          ? ((stats.uniqueClicks / stats.delivered) * 100).toFixed(2)
          : 0;
        const bounceRate = stats.hardBounces && stats.sent
          ? (((stats.hardBounces + (stats.softBounces || 0)) / stats.sent) * 100).toFixed(2)
          : 0;

        await connection.query(
          `INSERT INTO brevo_campaigns
           (user_id, brevo_campaign_id, campaign_name, subject, campaign_type, campaign_status,
            sender_name, sender_email, sent_date, total_recipients,
            stats_sent, stats_delivered, stats_opens, stats_unique_opens, stats_clicks, stats_unique_clicks,
            stats_bounces, stats_hard_bounces, stats_soft_bounces, stats_unsubscribes, stats_spam_reports,
            open_rate, click_rate, bounce_rate, last_synced_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
           ON DUPLICATE KEY UPDATE
             campaign_name = VALUES(campaign_name),
             subject = VALUES(subject),
             campaign_type = VALUES(campaign_type),
             campaign_status = VALUES(campaign_status),
             sender_name = VALUES(sender_name),
             sender_email = VALUES(sender_email),
             sent_date = VALUES(sent_date),
             total_recipients = VALUES(total_recipients),
             stats_sent = VALUES(stats_sent),
             stats_delivered = VALUES(stats_delivered),
             stats_opens = VALUES(stats_opens),
             stats_unique_opens = VALUES(stats_unique_opens),
             stats_clicks = VALUES(stats_clicks),
             stats_unique_clicks = VALUES(stats_unique_clicks),
             stats_bounces = VALUES(stats_bounces),
             stats_hard_bounces = VALUES(stats_hard_bounces),
             stats_soft_bounces = VALUES(stats_soft_bounces),
             stats_unsubscribes = VALUES(stats_unsubscribes),
             stats_spam_reports = VALUES(stats_spam_reports),
             open_rate = VALUES(open_rate),
             click_rate = VALUES(click_rate),
             bounce_rate = VALUES(bounce_rate),
             last_synced_at = NOW()`,
          [
            userId,
            campaign.id,
            campaign.name,
            campaign.subject || null,
            campaign.type || 'classic',
            campaign.status,
            campaign.sender?.name || null,
            campaign.sender?.email || null,
            campaign.sentDate || null,
            campaign.recipients?.lists?.length || 0,
            stats.sent || 0,
            stats.delivered || 0,
            stats.trackableViews || 0,      // Total opens (was incorrectly stats.clickers)
            stats.uniqueViews || 0,         // Unique opens (was incorrectly stats.uniqueClicks)
            stats.clickers || 0,            // Total clicks (was incorrectly stats.trackableClicks)
            stats.uniqueClicks || 0,        // Unique clicks (correct)
            (stats.hardBounces || 0) + (stats.softBounces || 0),
            stats.hardBounces || 0,
            stats.softBounces || 0,
            stats.unsubscriptions || 0,
            stats.complaints || 0,
            openRate,
            clickRate,
            bounceRate,
          ]
        );
      }

      await connection.commit();
      console.log(`✅ Cached ${campaigns.length} campaigns in database`);
    } catch (error) {
      await connection.rollback();
      console.error('Error caching Brevo campaigns:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get cached campaigns from database
   */
  static async getCachedCampaigns(userId, filters = {}) {
    try {
      let query = 'SELECT * FROM brevo_campaigns WHERE user_id = ?';
      const params = [userId];

      if (filters.status) {
        query += ' AND campaign_status = ?';
        params.push(filters.status);
      }

      query += ' ORDER BY sent_date DESC, created_at DESC';

      if (filters.limit) {
        query += ' LIMIT ?';
        params.push(parseInt(filters.limit));
      }

      const [campaigns] = await pool.query(query, params);
      return campaigns;
    } catch (error) {
      console.error('Error getting cached Brevo campaigns:', error);
      throw error;
    }
  }

  /**
   * Get single campaign details
   */
  static async getCampaignDetails(userId, campaignId) {
    try {
      const [campaigns] = await pool.query(
        'SELECT * FROM brevo_campaigns WHERE user_id = ? AND brevo_campaign_id = ?',
        [userId, campaignId]
      );
      return campaigns[0] || null;
    } catch (error) {
      console.error('Error getting Brevo campaign details:', error);
      throw error;
    }
  }

  // =====================================================
  // SYNC LOG - Track synchronization operations
  // =====================================================

  /**
   * Log sync operation
   */
  static async logSync(userId, syncType, syncStatus, recordsSynced, errorMessage = null, duration = null) {
    try {
      await pool.query(
        `INSERT INTO brevo_sync_log
         (user_id, sync_type, sync_status, records_synced, error_message, sync_duration_ms)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, syncType, syncStatus, recordsSynced, errorMessage, duration]
      );
    } catch (error) {
      console.error('Error logging Brevo sync:', error);
      // Don't throw - logging failure shouldn't break the sync
    }
  }

  /**
   * Get sync history for user
   */
  static async getSyncHistory(userId, limit = 50) {
    try {
      const [logs] = await pool.query(
        `SELECT * FROM brevo_sync_log
         WHERE user_id = ?
         ORDER BY synced_at DESC
         LIMIT ?`,
        [userId, limit]
      );
      return logs;
    } catch (error) {
      console.error('Error getting Brevo sync history:', error);
      throw error;
    }
  }
}

export default BrevoService;
