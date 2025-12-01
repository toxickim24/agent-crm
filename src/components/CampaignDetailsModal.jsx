import { X, Mail, Users, TrendingUp, Calendar, ExternalLink, MousePointer, Eye, Target, Settings } from 'lucide-react';

const CampaignDetailsModal = ({ campaign, isOpen, onClose }) => {
  if (!isOpen || !campaign) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const formatPercentage = (value) => {
    if (typeof value === 'number') return value.toFixed(2);
    return parseFloat(value || 0).toFixed(2);
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full p-6 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Mail size={24} />
              Campaign Details
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {campaign.subject_line || campaign.title || 'Untitled Campaign'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        {/* Campaign Info */}
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase">
              Campaign Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Subject Line</label>
                <p className="text-gray-900 dark:text-white font-medium">
                  {campaign.subject_line || 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Title</label>
                <p className="text-gray-900 dark:text-white font-medium">
                  {campaign.title || 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Lead Type</label>
                <div>
                  {campaign.lead_type_name && (
                    <span
                      className="px-2 py-1 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: campaign.lead_type_color }}
                    >
                      {campaign.lead_type_name}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Status</label>
                <p className="text-gray-900 dark:text-white font-medium capitalize">
                  {campaign.status || 'Unknown'}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Campaign Type</label>
                <p className="text-gray-900 dark:text-white font-medium capitalize">
                  {campaign.type || 'Regular'}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Preview Text</label>
                <p className="text-gray-900 dark:text-white font-medium">
                  {campaign.preview_text || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Sender Info */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase">
              Sender Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">From Name</label>
                <p className="text-gray-900 dark:text-white font-medium">
                  {campaign.from_name || 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Reply To</label>
                <p className="text-gray-900 dark:text-white font-medium">
                  {campaign.reply_to || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Performance Stats */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase flex items-center gap-2">
              <TrendingUp size={16} />
              Performance Metrics
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Mail size={12} />
                  Emails Sent
                </label>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {(campaign.emails_sent || 0).toLocaleString()}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Eye size={12} />
                  Unique Opens
                </label>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {(campaign.unique_opens || 0).toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatPercentage(campaign.open_rate)}% rate
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <MousePointer size={12} />
                  Unique Clicks
                </label>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {(campaign.unique_clicks || 0).toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatPercentage(campaign.click_rate)}% rate
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Users size={12} />
                  Subscriber Clicks
                </label>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {(campaign.unique_subscriber_clicks || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Engagement Details */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase">
              Engagement Details
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Total Opens</label>
                <p className="text-gray-900 dark:text-white font-medium">
                  {(campaign.opens_total || 0).toLocaleString()}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Total Clicks</label>
                <p className="text-gray-900 dark:text-white font-medium">
                  {(campaign.clicks_total || 0).toLocaleString()}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Unsubscribed</label>
                <p className="text-gray-900 dark:text-white font-medium">
                  {(campaign.unsubscribed || 0).toLocaleString()}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Abuse Reports</label>
                <p className="text-gray-900 dark:text-white font-medium">
                  {(campaign.abuse_reports || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Bounce Info */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase">
              Bounce Information
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Hard Bounces</label>
                <p className="text-gray-900 dark:text-white font-medium">
                  {(campaign.hard_bounces || 0).toLocaleString()}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Soft Bounces</label>
                <p className="text-gray-900 dark:text-white font-medium">
                  {(campaign.soft_bounces || 0).toLocaleString()}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Syntax Errors</label>
                <p className="text-gray-900 dark:text-white font-medium">
                  {(campaign.syntax_errors || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Tracking Settings */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase flex items-center gap-2">
              <Settings size={16} />
              Tracking Settings
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Opens Tracking</label>
                <p className="text-gray-900 dark:text-white font-medium">
                  {campaign.opens ? '✓ Enabled' : '✗ Disabled'}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">HTML Clicks</label>
                <p className="text-gray-900 dark:text-white font-medium">
                  {campaign.html_clicks ? '✓ Enabled' : '✗ Disabled'}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Text Clicks</label>
                <p className="text-gray-900 dark:text-white font-medium">
                  {campaign.text_clicks ? '✓ Enabled' : '✗ Disabled'}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Goal Tracking</label>
                <p className="text-gray-900 dark:text-white font-medium">
                  {campaign.goal_tracking ? '✓ Enabled' : '✗ Disabled'}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Ecommerce360</label>
                <p className="text-gray-900 dark:text-white font-medium">
                  {campaign.ecomm360 ? '✓ Enabled' : '✗ Disabled'}
                </p>
              </div>
              {campaign.google_analytics && (
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">Google Analytics</label>
                  <p className="text-gray-900 dark:text-white font-medium text-xs">
                    {campaign.google_analytics}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Timestamps */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase flex items-center gap-2">
              <Calendar size={16} />
              Timeline
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Send Time</label>
                <p className="text-gray-900 dark:text-white font-medium">
                  {formatDate(campaign.send_time)}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Last Synced</label>
                <p className="text-gray-900 dark:text-white font-medium">
                  {formatDate(campaign.last_synced_at)}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Created</label>
                <p className="text-gray-900 dark:text-white font-medium">
                  {formatDate(campaign.created_at)}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Updated</label>
                <p className="text-gray-900 dark:text-white font-medium">
                  {formatDate(campaign.updated_at)}
                </p>
              </div>
            </div>
          </div>

          {/* IDs */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase">
              Identifiers
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Campaign ID</label>
                <p className="text-gray-900 dark:text-white font-mono text-xs">
                  {campaign.campaign_id || 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Web ID</label>
                <p className="text-gray-900 dark:text-white font-mono text-xs">
                  {campaign.web_id || 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">List ID</label>
                <p className="text-gray-900 dark:text-white font-mono text-xs">
                  {campaign.list_id || 'N/A'}
                </p>
              </div>
              {campaign.segment_id && (
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">Segment ID</label>
                  <p className="text-gray-900 dark:text-white font-mono text-xs">
                    {campaign.segment_id}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-3 justify-end">
          {campaign.web_id && (
            <a
              href={`https://admin.mailchimp.com/campaigns/show?id=${campaign.web_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              View in Mailchimp
              <ExternalLink size={16} />
            </a>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-900 dark:text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CampaignDetailsModal;
