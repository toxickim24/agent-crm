import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Mail,
  MousePointer,
  Clock,
  TrendingUp,
  Calendar,
  Activity,
  X,
  RefreshCw
} from 'lucide-react';
import { StatCard, ChartCard } from './Widgets';
import API_BASE_URL from '../../../config/api';

/**
 * Contact Event Timeline
 * Shows complete engagement history for a specific contact
 * Can be used as standalone component or in a modal
 */
const ContactEventTimeline = ({ email, onClose = null }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (email) {
      fetchContactEvents();
    }
  }, [email]);

  const fetchContactEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_BASE_URL}/brevo/analytics/events/contact/${email}`);
      setData(res.data);
    } catch (err) {
      console.error('Error fetching contact events:', err);
      setError('Failed to load contact event timeline');
    } finally {
      setLoading(false);
    }
  };

  const formatEventType = (event) => {
    if (event.opened_at && event.clicked_at) return 'Opened & Clicked';
    if (event.clicked_at) return 'Clicked';
    if (event.opened_at) return 'Opened';
    return 'Unknown';
  };

  const getEventIcon = (event) => {
    if (event.clicked_at) return <MousePointer size={20} className="text-purple-500" />;
    if (event.opened_at) return <Mail size={20} className="text-green-500" />;
    return <Activity size={20} className="text-gray-400" />;
  };

  const getEventColor = (event) => {
    if (event.clicked_at) return 'border-purple-500 bg-purple-50 dark:bg-purple-900/20';
    if (event.opened_at) return 'border-green-500 bg-green-50 dark:bg-green-900/20';
    return 'border-gray-300 bg-gray-50 dark:bg-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-600 dark:text-gray-400">Loading timeline for {email}...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-red-600 dark:text-red-400">{error}</div>
      </div>
    );
  }

  if (!data || data.events.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Activity size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Events Found
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No webhook events have been captured for {email} yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Event Timeline
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 font-mono">
            {email}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchContactEvents}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw size={18} />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Close"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Statistics */}
      {data.stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            title="Total Events"
            value={data.stats.total_events?.toLocaleString() || '0'}
            icon={<Activity className="text-blue-500" />}
          />
          <StatCard
            title="Email Opens"
            value={data.stats.total_opens?.toLocaleString() || '0'}
            icon={<Mail className="text-green-500" />}
          />
          <StatCard
            title="Link Clicks"
            value={data.stats.total_clicks?.toLocaleString() || '0'}
            icon={<MousePointer className="text-purple-500" />}
          />
          <StatCard
            title="Campaigns"
            value={data.stats.unique_campaigns?.toLocaleString() || '0'}
            icon={<TrendingUp className="text-orange-500" />}
          />
          <StatCard
            title="Engagement Rate"
            value={data.stats.total_events > 0
              ? `${Math.round((data.stats.total_clicks / data.stats.total_events) * 100)}%`
              : '0%'}
            icon={<Calendar className="text-indigo-500" />}
          />
        </div>
      )}

      {/* Activity Timeline */}
      <ChartCard title="Activity Timeline">
        <div className="space-y-3">
          {data.events.map((event, index) => (
            <div
              key={event.id}
              className={`border-l-4 p-4 rounded-r-lg ${getEventColor(event)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className="mt-1">
                    {getEventIcon(event)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatEventType(event)}
                      </h4>
                      <span className="text-xs px-2 py-0.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-gray-600 dark:text-gray-400">
                        Campaign #{event.campaign_id}
                      </span>
                    </div>
                    {event.campaign_name && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {event.campaign_name}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
                      {event.opened_at && (
                        <div className="flex items-center gap-1">
                          <Mail size={12} className="text-green-500" />
                          <span>Opened: {new Date(event.opened_at).toLocaleString()}</span>
                        </div>
                      )}
                      {event.clicked_at && (
                        <div className="flex items-center gap-1">
                          <MousePointer size={12} className="text-purple-500" />
                          <span>Clicked: {new Date(event.clicked_at).toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Clock size={12} />
                        <span>Received: {new Date(event.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500">
                  #{index + 1}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ChartCard>

      {/* Timeline Summary */}
      {data.stats.first_activity && data.stats.last_activity && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">First Activity</div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {new Date(data.stats.first_activity).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Last Activity</div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {new Date(data.stats.last_activity).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactEventTimeline;
