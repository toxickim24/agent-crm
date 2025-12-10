import pool from '../config/database.js';

/**
 * Brevo Scoring Service - Phase 3 (Calculated Metrics)
 *
 * READ-ONLY Integration - No Webhooks Required
 *
 * This service provides realistic scoring and benchmarking using ONLY
 * data available from Brevo's REST API (stored in brevo_contacts,
 * brevo_lists, brevo_campaigns tables).
 *
 * SCORING METHODOLOGY:
 * ====================
 *
 * Contact Scoring (0-100):
 * -------------------------
 * Base Score: 50 points
 *
 * + Recently Modified (modified_at_brevo):
 *   - Last 30 days: +20 points (active contact)
 *   - 31-90 days: +10 points (moderately active)
 *   - 90+ days: -10 points (stale contact)
 *
 * + Email Status:
 *   - NOT blacklisted: +20 points
 *   - Blacklisted: Score = 0 (dead contact)
 *
 * + List Membership (list_ids count):
 *   - 1 list: +0 points
 *   - 2 lists: +5 points
 *   - 3+ lists: +10 points (highly engaged/segmented)
 *
 * + Has Attributes (FIRSTNAME, LASTNAME, etc.):
 *   - Complete profile: +10 points
 *   - Partial profile: +5 points
 *   - Empty profile: +0 points
 *
 * ENGAGEMENT TIERS:
 * -----------------
 * - Champion: 80-100 (highly engaged, multi-list, recent activity)
 * - Warm: 40-79 (active contact, good profile)
 * - Cold: 0-39 (blacklisted, stale, minimal engagement)
 *
 * WHY THIS WORKS:
 * ---------------
 * - modified_at_brevo updates when contact engages with campaigns
 * - List membership indicates contact value/segmentation
 * - Complete attributes show data quality
 * - No webhook/event data needed
 *
 * LIMITATIONS:
 * ------------
 * - Cannot track individual opens/clicks (no event data)
 * - Cannot determine exact engagement dates
 * - Scores are ESTIMATES based on available signals
 * - Less accurate than webhook-based scoring
 */

class BrevoScoringService {

  // ====================
  // CONTACT SCORING
  // ====================

  /**
   * Calculate realistic contact score (0-100)
   * Uses ONLY data from brevo_contacts table
   */
  static calculateContactScore(contact) {
    // Blacklisted contacts = 0 score (dead)
    if (contact.email_blacklisted === 1) {
      return 0;
    }

    let score = 50; // Base score

    // 1. RECENCY: Activity based on modified_at_brevo
    const daysSinceModified = this.calculateDaysSince(contact.modified_at_brevo);

    if (daysSinceModified <= 30) {
      score += 20; // Very recent activity
    } else if (daysSinceModified <= 90) {
      score += 10; // Moderately recent
    } else if (daysSinceModified > 180) {
      score -= 10; // Very stale
    }
    // 90-180 days: no bonus/penalty

    // 2. NOT BLACKLISTED: Already handled above (blacklisted = 0)
    score += 20; // Reward for being deliverable

    // 3. LIST MEMBERSHIP: More lists = more engaged/valuable
    const listCount = Array.isArray(contact.list_ids)
      ? contact.list_ids.length
      : (contact.list_ids ? JSON.parse(contact.list_ids).length : 0);

    if (listCount >= 3) {
      score += 10;
    } else if (listCount === 2) {
      score += 5;
    }
    // 1 list or 0: no bonus

    // 4. PROFILE COMPLETENESS: Has attributes filled out?
    const attributes = typeof contact.attributes === 'string'
      ? JSON.parse(contact.attributes || '{}')
      : (contact.attributes || {});

    const filledAttributes = Object.keys(attributes).filter(
      key => attributes[key] && attributes[key].trim() !== ''
    ).length;

    if (filledAttributes >= 3) {
      score += 10; // Complete profile
    } else if (filledAttributes >= 1) {
      score += 5; // Partial profile
    }

    // Ensure score is 0-100
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Get engagement tier based on score
   *
   * 3-tier system: Champion, Warm, Cold
   */
  static getEngagementTier(score) {
    if (score >= 80) return 'Champion';
    if (score >= 40) return 'Warm';
    return 'Cold';
  }

  /**
   * Get tier color for UI display
   */
  static getTierColor(tier) {
    const colors = {
      'Champion': '#10b981', // Green
      'Warm': '#f59e0b',     // Orange
      'Cold': '#6b7280'      // Gray
    };
    return colors[tier] || '#6b7280';
  }

  /**
   * Calculate days since a date
   */
  static calculateDaysSince(date) {
    if (!date) return 999;
    const now = new Date();
    const then = new Date(date);
    const diffMs = now - then;
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  // ====================
  // BATCH CONTACT SCORING
  // ====================

  /**
   * Get all scored contacts for a user
   * Returns contacts with calculated scores and tiers
   */
  static async getScoredContacts(userId, limit = null) {
    try {
      let query = `
        SELECT
          id,
          email,
          list_ids,
          attributes,
          email_blacklisted,
          modified_at_brevo,
          created_at_brevo
        FROM brevo_contacts
        WHERE user_id = ?
        ORDER BY id DESC
      `;

      const params = [userId];

      if (limit) {
        query += ' LIMIT ?';
        params.push(limit);
      }

      const [contacts] = await pool.query(query, params);

      // Calculate scores for all contacts
      const scoredContacts = contacts.map(contact => {
        const score = this.calculateContactScore(contact);
        const tier = this.getEngagementTier(score);

        // Parse list_ids safely
        let listCount = 0;
        try {
          const listIds = typeof contact.list_ids === 'string'
            ? JSON.parse(contact.list_ids)
            : contact.list_ids;
          listCount = Array.isArray(listIds) ? listIds.length : 0;
        } catch (e) {
          listCount = 0;
        }

        return {
          id: contact.id,
          email: contact.email,
          score,
          tier,
          tierColor: this.getTierColor(tier),
          isBlacklisted: contact.email_blacklisted === 1,
          listCount,
          daysSinceModified: this.calculateDaysSince(contact.modified_at_brevo),
          modifiedAt: contact.modified_at_brevo,
          createdAt: contact.created_at_brevo
        };
      });

      return scoredContacts;
    } catch (error) {
      console.error('Error getting scored contacts:', error);
      throw error;
    }
  }

  /**
   * Get contact scoring overview/summary
   * Returns tier distribution and statistics
   */
  static async getContactScoringOverview(userId) {
    try {
      const scoredContacts = await this.getScoredContacts(userId);

      // Calculate tier distribution
      const tiers = {
        champion: scoredContacts.filter(c => c.tier === 'Champion').length,
        warm: scoredContacts.filter(c => c.tier === 'Warm').length,
        cold: scoredContacts.filter(c => c.tier === 'Cold').length
      };

      // Calculate average score
      const totalContacts = scoredContacts.length;
      const avgScore = totalContacts > 0
        ? Math.round(scoredContacts.reduce((sum, c) => sum + c.score, 0) / totalContacts)
        : 0;

      // Calculate blacklisted count
      const blacklistedCount = scoredContacts.filter(c => c.isBlacklisted).length;

      // Get top performers
      const topContacts = scoredContacts
        .filter(c => !c.isBlacklisted)
        .sort((a, b) => b.score - a.score)
        .slice(0, 20)
        .map((c, index) => ({
          rank: index + 1,
          email: c.email,
          score: c.score,
          tier: c.tier,
          listCount: c.listCount,
          daysSinceModified: c.daysSinceModified
        }));

      return {
        totalContacts,
        avgScore,
        tiers,
        tiersPercent: {
          champion: totalContacts > 0 ? ((tiers.champion / totalContacts) * 100).toFixed(1) : 0,
          warm: totalContacts > 0 ? ((tiers.warm / totalContacts) * 100).toFixed(1) : 0,
          cold: totalContacts > 0 ? ((tiers.cold / totalContacts) * 100).toFixed(1) : 0
        },
        blacklistedCount,
        blacklistedPercent: totalContacts > 0 ? ((blacklistedCount / totalContacts) * 100).toFixed(1) : 0,
        topContacts
      };
    } catch (error) {
      console.error('Error getting contact scoring overview:', error);
      throw error;
    }
  }

  // ====================
  // CAMPAIGN BENCHMARKING
  // ====================

  /**
   * Calculate campaign performance benchmarks
   * Returns global averages and top/bottom performers
   */
  static async getCampaignBenchmarks(userId) {
    try {
      // Get all sent campaigns with stats
      const [campaigns] = await pool.query(`
        SELECT
          id,
          brevo_campaign_id,
          campaign_name,
          subject,
          sent_date,
          stats_sent,
          stats_delivered,
          stats_unique_opens,
          stats_unique_clicks,
          stats_hard_bounces,
          stats_soft_bounces,
          stats_unsubscribes,
          stats_spam_reports,
          open_rate,
          click_rate,
          bounce_rate
        FROM brevo_campaigns
        WHERE user_id = ?
          AND campaign_status = 'sent'
          AND stats_sent > 0
        ORDER BY sent_date DESC
      `, [userId]);

      if (campaigns.length === 0) {
        return {
          totalCampaigns: 0,
          averages: {
            openRate: 0,
            clickRate: 0,
            bounceRate: 0,
            unsubscribeRate: 0
          },
          industryBenchmarks: this.getIndustryBenchmarks(),
          topPerformers: [],
          bottomPerformers: []
        };
      }

      // Calculate global averages
      const totalSent = campaigns.reduce((sum, c) => sum + c.stats_sent, 0);
      const totalDelivered = campaigns.reduce((sum, c) => sum + c.stats_delivered, 0);
      const totalOpens = campaigns.reduce((sum, c) => sum + c.stats_unique_opens, 0);
      const totalClicks = campaigns.reduce((sum, c) => sum + c.stats_unique_clicks, 0);
      const totalBounces = campaigns.reduce((sum, c) => sum + c.stats_hard_bounces + c.stats_soft_bounces, 0);
      const totalUnsubscribes = campaigns.reduce((sum, c) => sum + c.stats_unsubscribes, 0);

      const avgOpenRate = totalDelivered > 0 ? ((totalOpens / totalDelivered) * 100).toFixed(2) : 0;
      const avgClickRate = totalDelivered > 0 ? ((totalClicks / totalDelivered) * 100).toFixed(2) : 0;
      const avgBounceRate = totalSent > 0 ? ((totalBounces / totalSent) * 100).toFixed(2) : 0;
      const avgUnsubscribeRate = totalDelivered > 0 ? ((totalUnsubscribes / totalDelivered) * 100).toFixed(2) : 0;

      // Calculate engagement score for each campaign
      const campaignsWithScores = campaigns.map(c => {
        // Engagement score: weighted combination of open %, click %, and low bounce %
        const openRate = parseFloat(c.open_rate) || 0;
        const clickRate = parseFloat(c.click_rate) || 0;
        const bounceRate = parseFloat(c.bounce_rate) || 0;

        // Formula: (open_rate * 40%) + (click_rate * 50%) - (bounce_rate * 10%)
        const engagementScore = (openRate * 0.4) + (clickRate * 0.5) - (bounceRate * 0.1);

        return {
          ...c,
          engagementScore: Math.max(0, engagementScore).toFixed(2)
        };
      });

      // Sort by engagement score
      const sortedByEngagement = [...campaignsWithScores].sort((a, b) =>
        parseFloat(b.engagementScore) - parseFloat(a.engagementScore)
      );

      // Get top 5 and bottom 5
      const topPerformers = sortedByEngagement.slice(0, 5).map((c, index) => ({
        rank: index + 1,
        campaignId: c.id,
        campaignName: c.campaign_name,
        subject: c.subject,
        sentDate: c.sent_date,
        openRate: parseFloat(c.open_rate).toFixed(2),
        clickRate: parseFloat(c.click_rate).toFixed(2),
        bounceRate: parseFloat(c.bounce_rate).toFixed(2),
        engagementScore: c.engagementScore,
        totalSent: c.stats_sent,
        uniqueOpens: c.stats_unique_opens,
        uniqueClicks: c.stats_unique_clicks
      }));

      const bottomPerformers = sortedByEngagement.slice(-5).reverse().map((c, index) => ({
        rank: campaigns.length - 4 + index,
        campaignId: c.id,
        campaignName: c.campaign_name,
        subject: c.subject,
        sentDate: c.sent_date,
        openRate: parseFloat(c.open_rate).toFixed(2),
        clickRate: parseFloat(c.click_rate).toFixed(2),
        bounceRate: parseFloat(c.bounce_rate).toFixed(2),
        engagementScore: c.engagementScore,
        totalSent: c.stats_sent,
        uniqueOpens: c.stats_unique_opens,
        uniqueClicks: c.stats_unique_clicks
      }));

      return {
        totalCampaigns: campaigns.length,
        averages: {
          openRate: parseFloat(avgOpenRate),
          clickRate: parseFloat(avgClickRate),
          bounceRate: parseFloat(avgBounceRate),
          unsubscribeRate: parseFloat(avgUnsubscribeRate)
        },
        industryBenchmarks: this.getIndustryBenchmarks(),
        topPerformers,
        bottomPerformers,
        performance: {
          vs_industry_open: parseFloat(avgOpenRate) - this.getIndustryBenchmarks().openRate,
          vs_industry_click: parseFloat(avgClickRate) - this.getIndustryBenchmarks().clickRate
        }
      };
    } catch (error) {
      console.error('Error calculating campaign benchmarks:', error);
      throw error;
    }
  }

  /**
   * Industry benchmark data (static)
   * Source: Mailchimp Email Marketing Benchmarks 2024
   * These are conservative averages across all industries
   */
  static getIndustryBenchmarks() {
    return {
      openRate: 21.5,        // 21.5% average open rate
      clickRate: 2.3,        // 2.3% average click rate
      bounceRate: 0.7,       // 0.7% average bounce rate
      unsubscribeRate: 0.25, // 0.25% average unsubscribe rate
      source: 'Industry Average 2024'
    };
  }

  // ====================
  // LIST HEALTH SCORING (Enhanced)
  // ====================

  /**
   * Calculate enhanced list health scores
   * Returns health scores for all lists with detailed breakdowns
   */
  static async getListHealthScores(userId) {
    try {
      const [lists] = await pool.query(`
        SELECT
          l.id,
          l.brevo_list_id,
          l.list_name,
          l.total_subscribers,
          l.unique_subscribers
        FROM brevo_lists l
        WHERE l.user_id = ?
        ORDER BY l.total_subscribers DESC
      `, [userId]);

      if (lists.length === 0) {
        return [];
      }

      // For each list, count contacts and calculate metrics
      const listHealthScores = await Promise.all(lists.map(async (list) => {
        const [contacts] = await pool.query(`
          SELECT
            email_blacklisted,
            modified_at_brevo
          FROM brevo_contacts
          WHERE user_id = ?
            AND JSON_CONTAINS(list_ids, ?, '$')
        `, [userId, list.brevo_list_id.toString()]);

        const totalContacts = contacts.length;
        const blacklistedCount = contacts.filter(c => c.email_blacklisted === 1).length;
        const activeCount = totalContacts - blacklistedCount;

        // Calculate average recency
        const avgDaysSinceModified = totalContacts > 0
          ? contacts.reduce((sum, c) => sum + this.calculateDaysSince(c.modified_at_brevo), 0) / totalContacts
          : 999;

        // Health score calculation
        let healthScore = 50; // Base

        // Size factor (larger lists are valuable)
        if (totalContacts >= 1000) healthScore += 15;
        else if (totalContacts >= 500) healthScore += 10;
        else if (totalContacts >= 100) healthScore += 5;

        // Blacklist rate (lower is better)
        const blacklistRate = totalContacts > 0 ? (blacklistedCount / totalContacts) : 0;
        if (blacklistRate <= 0.01) healthScore += 20; // <1% blacklisted
        else if (blacklistRate <= 0.05) healthScore += 10; // <5%
        else if (blacklistRate > 0.10) healthScore -= 20; // >10% is bad

        // Recency factor (recently updated = healthy)
        if (avgDaysSinceModified <= 30) healthScore += 15;
        else if (avgDaysSinceModified <= 90) healthScore += 10;
        else if (avgDaysSinceModified > 180) healthScore -= 15;

        const finalScore = Math.max(0, Math.min(100, Math.round(healthScore)));

        return {
          listId: list.id,
          brevoListId: list.brevo_list_id,
          listName: list.list_name,
          healthScore: finalScore,
          healthGrade: this.getHealthGrade(finalScore),
          totalSubscribers: list.total_subscribers,
          activeContacts: activeCount,
          blacklistedContacts: blacklistedCount,
          blacklistRate: (blacklistRate * 100).toFixed(2),
          avgDaysSinceModified: Math.round(avgDaysSinceModified)
        };
      }));

      return listHealthScores.sort((a, b) => b.healthScore - a.healthScore);
    } catch (error) {
      console.error('Error calculating list health scores:', error);
      throw error;
    }
  }

  /**
   * Get health grade (A, B, C, D, F)
   */
  static getHealthGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }
}

export default BrevoScoringService;
