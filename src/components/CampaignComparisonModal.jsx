import { X, Mail, TrendingUp, Eye, MousePointer, Users, Send } from 'lucide-react';

const CampaignComparisonModal = ({ campaigns, isOpen, onClose }) => {
  if (!isOpen || !campaigns || campaigns.length === 0) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const formatPercentage = (value) => {
    if (typeof value === 'number') return value.toFixed(2);
    return parseFloat(value || 0).toFixed(2);
  };

  const metrics = [
    { label: 'Emails Sent', key: 'emails_sent', icon: Send, format: (v) => v?.toLocaleString() || '0' },
    { label: 'Unique Opens', key: 'unique_opens', icon: Eye, format: (v) => v?.toLocaleString() || '0' },
    { label: 'Open Rate', key: 'open_rate', icon: TrendingUp, format: (v) => `${formatPercentage(v)}%` },
    { label: 'Unique Clicks', key: 'unique_clicks', icon: MousePointer, format: (v) => v?.toLocaleString() || '0' },
    { label: 'Click Rate', key: 'click_rate', icon: TrendingUp, format: (v) => `${formatPercentage(v)}%` },
    { label: 'Total Opens', key: 'opens_total', icon: Eye, format: (v) => v?.toLocaleString() || '0' },
    { label: 'Total Clicks', key: 'clicks_total', icon: MousePointer, format: (v) => v?.toLocaleString() || '0' },
    { label: 'Subscriber Clicks', key: 'unique_subscriber_clicks', icon: Users, format: (v) => v?.toLocaleString() || '0' },
  ];

  // Find best value for each metric to highlight
  const getBestValue = (metricKey) => {
    if (['open_rate', 'click_rate'].includes(metricKey)) {
      return Math.max(...campaigns.map(c => parseFloat(c[metricKey]) || 0));
    }
    return Math.max(...campaigns.map(c => parseInt(c[metricKey]) || 0));
  };

  const isBestValue = (campaign, metricKey) => {
    const value = ['open_rate', 'click_rate'].includes(metricKey)
      ? parseFloat(campaign[metricKey]) || 0
      : parseInt(campaign[metricKey]) || 0;
    return value === getBestValue(metricKey) && value > 0;
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg max-w-6xl w-full p-6 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp size={24} />
              Campaign Comparison
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Comparing {campaigns.length} campaign{campaigns.length > 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        {/* Campaign Headers */}
        <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: `200px repeat(${campaigns.length}, 1fr)` }}>
          <div></div>
          {campaigns.map((campaign, idx) => (
            <div key={idx} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-start gap-2 mb-2">
                <Mail size={16} className="text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2">
                    {campaign.subject_line || campaign.title || 'Untitled'}
                  </p>
                  {campaign.lead_type_name && (
                    <span
                      className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: campaign.lead_type_color }}
                    >
                      {campaign.lead_type_name}
                    </span>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {formatDate(campaign.send_time)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    Status: {campaign.status}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Metrics Comparison */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {metrics.map((metric, idx) => (
            <div
              key={idx}
              className="grid gap-4 items-center"
              style={{ gridTemplateColumns: `200px repeat(${campaigns.length}, 1fr)` }}
            >
              <div className="flex items-center gap-2 py-3">
                <metric.icon size={16} className="text-gray-600 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {metric.label}
                </span>
              </div>
              {campaigns.map((campaign, campaignIdx) => {
                const isWinner = isBestValue(campaign, metric.key);
                return (
                  <div
                    key={campaignIdx}
                    className={`py-3 px-4 rounded-lg text-center ${
                      isWinner
                        ? 'bg-green-100 dark:bg-green-900/20 border-2 border-green-500'
                        : 'bg-gray-50 dark:bg-gray-700/30'
                    }`}
                  >
                    <p className={`text-lg font-bold ${
                      isWinner
                        ? 'text-green-700 dark:text-green-400'
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      {metric.format(campaign[metric.key])}
                      {isWinner && ' 🏆'}
                    </p>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Engagement Summary */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Engagement Summary
          </h3>
          <div className="grid gap-4" style={{ gridTemplateColumns: `200px repeat(${campaigns.length}, 1fr)` }}>
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Unsubscribed</div>
            {campaigns.map((campaign, idx) => (
              <div key={idx} className="text-center text-gray-900 dark:text-white">
                {campaign.unsubscribed || 0}
              </div>
            ))}
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Hard Bounces</div>
            {campaigns.map((campaign, idx) => (
              <div key={idx} className="text-center text-gray-900 dark:text-white">
                {campaign.hard_bounces || 0}
              </div>
            ))}
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Soft Bounces</div>
            {campaigns.map((campaign, idx) => (
              <div key={idx} className="text-center text-gray-900 dark:text-white">
                {campaign.soft_bounces || 0}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end">
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

export default CampaignComparisonModal;
