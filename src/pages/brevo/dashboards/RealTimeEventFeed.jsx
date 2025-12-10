import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Activity,
  Mail,
  MousePointer,
  CheckCircle,
  XCircle,
  UserX,
  AlertTriangle,
  Radio,
  Pause,
  Play,
  RotateCcw,
  Clock,
  TrendingUp
} from 'lucide-react';
import { StatCard, ChartCard, AlertBanner } from '../components/Widgets';
import API_BASE_URL from '../../../config/api';

/**
 * Real-time Event Feed Dashboard
 * Shows a live stream of incoming webhook events with auto-refresh
 */
const RealTimeEventFeed = () => {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLive, setIsLive] = useState(true);
  const [lastFetchTime, setLastFetchTime] = useState(null);
  const [newEventsCount, setNewEventsCount] = useState(0);
  const intervalRef = useRef(null);
  const previousEventsRef = useRef([]);

  // Fetch events from the backend
  const fetchEvents = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/brevo/analytics/events/recent?limit=50`);
      const newEvents = res.data.events || [];
      const newStats = res.data.stats || null;

      // Check if there are new events
      if (previousEventsRef.current.length > 0 && newEvents.length > 0) {
        const latestPreviousId = previousEventsRef.current[0]?.id;
        const newEventIndex = newEvents.findIndex(e => e.id === latestPreviousId);
        if (newEventIndex > 0) {
          setNewEventsCount(prev => prev + newEventIndex);
        }
      }

      previousEventsRef.current = newEvents;
      setEvents(newEvents);
      setStats(newStats);
      setLastFetchTime(new Date());
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Setup auto-refresh
  useEffect(() => {
    fetchEvents();

    if (isLive) {
      intervalRef.current = setInterval(() => {
        fetchEvents(true);
      }, 5000); // Refresh every 5 seconds
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isLive]);

  const toggleLive = () => {
    setIsLive(!isLive);
    setNewEventsCount(0);
  };

  const resetNewEventsCount = () => {
    setNewEventsCount(0);
  };

  const getEventIcon = (event) => {
    if (event.clicked_at) return <MousePointer size={18} className="text-purple-500" />;
    if (event.opened_at) return <Mail size={18} className="text-green-500" />;
    return <Activity size={18} className="text-gray-400" />;
  };

  const getEventType = (event) => {
    if (event.opened_at && event.clicked_at) return 'Opened & Clicked';
    if (event.clicked_at) return 'Clicked';
    if (event.opened_at) return 'Opened';
    return 'Unknown';
  };

  const getEventColor = (event) => {
    if (event.clicked_at) return 'border-l-purple-500 bg-purple-50 dark:bg-purple-900/10';
    if (event.opened_at) return 'border-l-green-500 bg-green-50 dark:bg-green-900/10';
    return 'border-l-gray-300 bg-gray-50 dark:bg-gray-800/50';
  };

  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const eventTime = new Date(timestamp);
    const diffMs = now - eventTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-600 dark:text-gray-400">Loading event feed...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Live Status Banner */}
      <div className={`rounded-lg p-4 border ${isLive
        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isLive ? (
              <Radio className="text-green-500 animate-pulse" size={20} />
            ) : (
              <Pause className="text-gray-500" size={20} />
            )}
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {isLive ? 'Live Feed Active' : 'Feed Paused'}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {isLive ? 'Auto-refreshing every 5 seconds' : 'Click Play to resume live updates'}
                {lastFetchTime && ` • Last updated: ${lastFetchTime.toLocaleTimeString()}`}
              </div>
            </div>
            {newEventsCount > 0 && (
              <div className="ml-4 px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-full animate-bounce">
                +{newEventsCount} new
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {newEventsCount > 0 && (
              <button
                onClick={resetNewEventsCount}
                className="px-3 py-2 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
              >
                Clear Badge
              </button>
            )}
            <button
              onClick={toggleLive}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                isLive
                  ? 'bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300'
                  : 'bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-700 dark:text-green-300'
              }`}
            >
              {isLive ? (
                <>
                  <Pause size={16} />
                  Pause
                </>
              ) : (
                <>
                  <Play size={16} />
                  Resume
                </>
              )}
            </button>
            <button
              onClick={() => fetchEvents()}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg flex items-center gap-2 transition-colors"
            >
              <RotateCcw size={16} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Events (24h)"
            value={stats.events_24h?.toLocaleString() || '0'}
            icon={<Activity className="text-blue-500" />}
          />
          <StatCard
            title="Opens (24h)"
            value={stats.opens_24h?.toLocaleString() || '0'}
            icon={<Mail className="text-green-500" />}
          />
          <StatCard
            title="Clicks (24h)"
            value={stats.clicks_24h?.toLocaleString() || '0'}
            icon={<MousePointer className="text-purple-500" />}
          />
          <StatCard
            title="Active Contacts (24h)"
            value={stats.active_contacts_24h?.toLocaleString() || '0'}
            icon={<TrendingUp className="text-orange-500" />}
          />
        </div>
      )}

      {/* Event Feed */}
      <ChartCard title="Live Event Stream">
        {events.length === 0 ? (
          <div className="text-center py-12">
            <Activity size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Recent Events
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Waiting for webhook events to arrive from Brevo...
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {events.map((event, index) => (
              <div
                key={event.id}
                className={`border-l-4 p-3 rounded-r-lg transition-all ${getEventColor(event)} ${
                  index < newEventsCount ? 'animate-pulse' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-0.5">
                      {getEventIcon(event)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {getEventType(event)}
                        </span>
                        {index < newEventsCount && (
                          <span className="px-2 py-0.5 bg-blue-500 text-white text-xs font-bold rounded">
                            NEW
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 font-mono truncate">
                        {event.email}
                      </div>
                      {event.campaign_name && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Campaign: {event.campaign_name}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {event.opened_at && (
                          <div className="flex items-center gap-1">
                            <Mail size={12} className="text-green-500" />
                            <span>{new Date(event.opened_at).toLocaleString()}</span>
                          </div>
                        )}
                        {event.clicked_at && (
                          <div className="flex items-center gap-1">
                            <MousePointer size={12} className="text-purple-500" />
                            <span>{new Date(event.clicked_at).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Clock size={12} />
                      {getTimeAgo(event.created_at)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ChartCard>

      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Activity className="text-blue-500 mt-0.5" size={20} />
          <div className="text-sm text-blue-900 dark:text-blue-200">
            <p className="font-medium mb-1">Real-time Event Monitoring</p>
            <p className="text-blue-700 dark:text-blue-300">
              This feed automatically refreshes every 5 seconds to show the latest webhook events from Brevo.
              You can pause/resume live updates using the controls above. The most recent 50 events are shown.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealTimeEventFeed;
