import pool from '../config/database.js';

/**
 * Brevo Analytics Service
 *
 * Advanced analytics calculations including:
 * - Engagement scoring (0-100)
 * - Contact segmentation
 * - List health scoring
 * - Performance analytics
 */

class BrevoAnalyticsService {
  /**
   * Calculate engagement score for a contact (0-100)
   *
   * Formula:
   * Base: 50
   * + Opens (last 30 days): +2 per open (max +20)
   * + Clicks (last 30 days): +5 per click (max +25)
   * + Recent activity: +10 (active in last 7 days)
   * - No activity 30-60 days: -10
   * - No activity 60-90 days: -20
   * - No activity 90+ days: -30
   */
  static calculateEngagementScore(contact, recentActivity) {
    let score = 50; // Base score

    // Recent opens (last 30 days)
    const recentOpens = recentActivity?.opens30d || 0;
    score += Math.min(20, recentOpens * 2);

    // Recent clicks (last 30 days)
    const recentClicks = recentActivity?.clicks30d || 0;
    score += Math.min(25, recentClicks * 5);

    // Recent activity bonus (last 7 days)
    if (recentActivity?.lastActivity && this.daysSince(recentActivity.lastActivity) <= 7) {
      score += 10;
    }

    // Inactivity penalties
    const daysSinceActivity = recentActivity?.daysSinceLastActivity || 999;
    if (daysSinceActivity > 90) score -= 30;
    else if (daysSinceActivity > 60) score -= 20;
    else if (daysSinceActivity > 30) score -= 10;

    // Ensure score is within 0-100
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Get engagement tier based on score
   */
  static getEngagementTier(score) {
    if (score >= 80) return 'Champion';
    if (score >= 60) return 'Loyal';
    if (score >= 40) return 'Potential';
    if (score >= 20) return 'At-Risk';
    return 'Dormant';
  }

  /**
   * Calculate days since a date
   */
  static daysSince(date) {
    if (!date) return 999;
    const now = new Date();
    const then = new Date(date);
    const diffTime = Math.abs(now - then);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Get engagement overview statistics
   */
  static async getEngagementOverview(userId) {
    try {
      // Get all contacts with their campaign activity
      const [contacts] = await pool.query(
        `SELECT
           c.id,
           c.email,
           COUNT(DISTINCT CASE
             WHEN ca.opened_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
             THEN ca.id END) as opens_30d,
           COUNT(DISTINCT CASE
             WHEN ca.clicked_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
             THEN ca.id END) as clicks_30d,
           MAX(GREATEST(COALESCE(ca.opened_at, '1970-01-01'), COALESCE(ca.clicked_at, '1970-01-01'))) as last_activity
         FROM brevo_contacts c
         LEFT JOIN brevo_campaign_activity ca ON c.email = ca.email AND ca.user_id = ?
         WHERE c.user_id = ?
         GROUP BY c.id, c.email`,
        [userId, userId]
      );

      // Calculate scores for all contacts
      const scoredContacts = contacts.map(contact => {
        const recentActivity = {
          opens30d: contact.opens_30d || 0,
          clicks30d: contact.clicks_30d || 0,
          lastActivity: contact.last_activity,
          daysSinceLastActivity: this.daysSince(contact.last_activity)
        };

        const score = this.calculateEngagementScore(contact, recentActivity);
        const tier = this.getEngagementTier(score);

        return {
          contactId: contact.id,
          email: contact.email,
          score,
          tier,
          opens: contact.opens_30d || 0,
          clicks: contact.clicks_30d || 0
        };
      });

      // Calculate tier counts
      const tiers = {
        champions: scoredContacts.filter(c => c.tier === 'Champion').length,
        loyal: scoredContacts.filter(c => c.tier === 'Loyal').length,
        potential: scoredContacts.filter(c => c.tier === 'Potential').length,
        atRisk: scoredContacts.filter(c => c.tier === 'At-Risk').length,
        dormant: scoredContacts.filter(c => c.tier === 'Dormant').length
      };

      // Calculate average score
      const avgScore = scoredContacts.length > 0
        ? Math.round(scoredContacts.reduce((sum, c) => sum + c.score, 0) / scoredContacts.length)
        : 0;

      return {
        totalContacts: contacts.length,
        avgScore,
        ...tiers,
        championsPercent: contacts.length > 0 ? ((tiers.champions / contacts.length) * 100).toFixed(1) : 0,
        scoredContacts // Return for caching/further use
      };
    } catch (error) {
      console.error('Error calculating engagement overview:', error);
      throw error;
    }
  }

  /**
   * Get top engaged contacts
   */
  static async getTopContacts(userId, limit = 20) {
    try {
      const overview = await this.getEngagementOverview(userId);
      const topContacts = overview.scoredContacts
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((contact, index) => ({
          rank: index + 1,
          email: contact.email,
          score: contact.score,
          tier: contact.tier,
          total_opens: contact.opens,
          total_clicks: contact.clicks
        }));

      return { contacts: topContacts };
    } catch (error) {
      console.error('Error getting top contacts:', error);
      throw error;
    }
  }

  /**
   * Calculate list health score (0-100)
   */
  static async calculateListHealth(userId, listId = null) {
    try {
      let query = `
        SELECT
          l.id,
          l.list_name,
          l.total_subscribers,
          COUNT(DISTINCT c.id) as active_contacts,
          AVG(CASE WHEN c.email_blacklisted = 0 THEN 1 ELSE 0 END) * 100 as non_blacklisted_percent
        FROM brevo_lists l
        LEFT JOIN brevo_contacts c ON JSON_CONTAINS(c.list_ids, CAST(l.brevo_list_id AS JSON))
        WHERE l.user_id = ?
      `;
      const params = [userId];

      if (listId) {
        query += ' AND l.id = ?';
        params.push(listId);
      }

      query += ' GROUP BY l.id, l.list_name, l.total_subscribers';

      const [lists] = await pool.query(query, params);

      const healthScores = lists.map(list => {
        let score = 50; // Base score

        // Active subscriber ratio
        const activeRatio = list.total_subscribers > 0
          ? (list.active_contacts / list.total_subscribers)
          : 0;
        score += activeRatio * 30; // Up to +30

        // Non-blacklisted percentage
        score += (list.non_blacklisted_percent / 100) * 20; // Up to +20

        return {
          listId: list.id,
          listName: list.list_name,
          healthScore: Math.round(Math.max(0, Math.min(100, score))),
          totalSubscribers: list.total_subscribers,
          activeContacts: list.active_contacts
        };
      });

      return listId ? healthScores[0] : healthScores;
    } catch (error) {
      console.error('Error calculating list health:', error);
      throw error;
    }
  }

  /**
   * Get time-of-day engagement analysis
   * Returns heatmap data showing engagement patterns by hour and day of week
   */
  static async getTimeOfDayAnalysis(userId, daysBack = 90) {
    try {
      // Query campaign activity for opens and clicks
      const [activity] = await pool.query(
        `SELECT
           HOUR(opened_at) as hour,
           DAYOFWEEK(opened_at) as day_of_week,
           COUNT(*) as opens
         FROM brevo_campaign_activity
         WHERE user_id = ?
           AND opened_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
           AND opened_at IS NOT NULL
         GROUP BY HOUR(opened_at), DAYOFWEEK(opened_at)

         UNION ALL

         SELECT
           HOUR(clicked_at) as hour,
           DAYOFWEEK(clicked_at) as day_of_week,
           COUNT(*) as clicks
         FROM brevo_campaign_activity
         WHERE user_id = ?
           AND clicked_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
           AND clicked_at IS NOT NULL
         GROUP BY HOUR(clicked_at), DAYOFWEEK(clicked_at)`,
        [userId, daysBack, userId, daysBack]
      );

      // Initialize heatmap grid (7 days x 24 hours)
      const heatmap = {};
      for (let day = 1; day <= 7; day++) {
        heatmap[day] = {};
        for (let hour = 0; hour < 24; hour++) {
          heatmap[day][hour] = { opens: 0, clicks: 0, total: 0 };
        }
      }

      // Populate heatmap with activity data
      activity.forEach(row => {
        const day = row.day_of_week; // 1 = Sunday, 2 = Monday, ..., 7 = Saturday
        const hour = row.hour;
        const count = parseInt(row.opens || row.clicks || 0);

        if (row.opens) {
          heatmap[day][hour].opens += count;
        } else {
          heatmap[day][hour].clicks += count;
        }
        heatmap[day][hour].total += count;
      });

      // Find max value for normalization
      let maxValue = 0;
      Object.values(heatmap).forEach(dayData => {
        Object.values(dayData).forEach(hourData => {
          if (hourData.total > maxValue) {
            maxValue = hourData.total;
          }
        });
      });

      // Calculate best time to send (hour with highest engagement)
      let bestHour = 0;
      let bestDay = 1;
      let bestValue = 0;
      Object.keys(heatmap).forEach(day => {
        Object.keys(heatmap[day]).forEach(hour => {
          if (heatmap[day][hour].total > bestValue) {
            bestValue = heatmap[day][hour].total;
            bestHour = parseInt(hour);
            bestDay = parseInt(day);
          }
        });
      });

      // Convert day number to name
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const bestDayName = dayNames[bestDay - 1];

      // Format hour as 12-hour time
      const formatHour = (hour) => {
        const period = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour === 0 ? 12 : (hour > 12 ? hour - 12 : hour);
        return `${hour12}:00 ${period}`;
      };

      return {
        heatmap,
        maxValue,
        bestTime: {
          day: bestDayName,
          dayNumber: bestDay,
          hour: bestHour,
          hourFormatted: formatHour(bestHour),
          engagementCount: bestValue
        },
        totalEngagements: activity.reduce((sum, row) => sum + parseInt(row.opens || row.clicks || 0), 0),
        daysAnalyzed: daysBack
      };
    } catch (error) {
      console.error('Error calculating time-of-day analysis:', error);
      throw error;
    }
  }
}

export default BrevoAnalyticsService;
