import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Activity,
  Mail,
  MousePointer,
  CheckCircle,
  XCircle,
  UserX,
  AlertTriangle,
  RefreshCw,
  Filter,
  Search
} from 'lucide-react';
import { StatCard, DataTable, ChartCard, AlertBanner } from '../components/Widgets';
import ContactEventTimeline from '../components/ContactEventTimeline';
import API_BASE_URL from '../../../config/api';

const EventLogDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedContactEmail, setSelectedContactEmail] = useState(null);
  const [filters, setFilters] = useState({
    eventType: 'all',
    search: '',
    dateRange: 'all'
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, events]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      // Fetch all events from brevo_campaign_activity table
      const res = await axios.get(`${API_BASE_URL}/brevo/analytics/events`);
      setEvents(res.data.events || []);
      setStats(res.data.stats || null);
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...events];

    // Filter by event type
    if (filters.eventType !== 'all') {
      filtered = filtered.filter(event => {
        if (filters.eventType === 'opened') return event.opened_at !== null;
        if (filters.eventType === 'clicked') return event.clicked_at !== null;
        if (filters.eventType === 'both') return event.opened_at !== null && event.clicked_at !== null;
        return true;
      });
    }

    // Filter by search (email or campaign name)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(event =>
        event.email.toLowerCase().includes(searchLower) ||
        (event.campaign_name && event.campaign_name.toLowerCase().includes(searchLower))
      );
    }

    // Filter by date range
    if (filters.dateRange !== 'all') {
      const now = new Date();
      const cutoff = new Date();

      if (filters.dateRange === '24h') cutoff.setHours(now.getHours() - 24);
      else if (filters.dateRange === '7d') cutoff.setDate(now.getDate() - 7);
      else if (filters.dateRange === '30d') cutoff.setDate(now.getDate() - 30);

      filtered = filtered.filter(event => {
        const eventDate = new Date(event.created_at);
        return eventDate >= cutoff;
      });
    }

    setFilteredEvents(filtered);
  };

  const getEventType = (event) => {
    if (event.opened_at && event.clicked_at) return 'Opened & Clicked';
    if (event.clicked_at) return 'Clicked';
    if (event.opened_at) return 'Opened';
    return 'Unknown';
  };

  const getEventIcon = (event) => {
    if (event.clicked_at) return <MousePointer size={16} className="text-purple-500" />;
    if (event.opened_at) return <Mail size={16} className="text-green-500" />;
    return <Activity size={16} className="text-gray-400" />;
  };

  const eventColumns = [
    {
      header: 'Type',
      key: 'type',
      render: (row) => (
        <div className="flex items-center gap-2">
          {getEventIcon(row)}
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {getEventType(row)}
          </span>
        </div>
      )
    },
    {
      header: 'Email',
      key: 'email',
      render: (row) => (
        <button
          onClick={() => setSelectedContactEmail(row.email)}
          className="text-sm text-blue-600 dark:text-blue-400 font-mono hover:underline cursor-pointer"
        >
          {row.email}
        </button>
      )
    },
    {
      header: 'Campaign',
      key: 'campaign_name',
      render: (row) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {row.campaign_name || 'N/A'}
        </span>
      )
    },
    {
      header: 'Opened At',
      key: 'opened_at',
      render: (row) => row.opened_at ? (
        <span className="text-xs text-green-600 dark:text-green-400">
          {new Date(row.opened_at).toLocaleString()}
        </span>
      ) : (
        <span className="text-xs text-gray-400">-</span>
      )
    },
    {
      header: 'Clicked At',
      key: 'clicked_at',
      render: (row) => row.clicked_at ? (
        <span className="text-xs text-purple-600 dark:text-purple-400">
          {new Date(row.clicked_at).toLocaleString()}
        </span>
      ) : (
        <span className="text-xs text-gray-400">-</span>
      )
    },
    {
      header: 'Received',
      key: 'created_at',
      render: (row) => (
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {new Date(row.created_at).toLocaleString()}
        </span>
      )
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-600 dark:text-gray-400">Loading event log...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alert if no events */}
      {events.length === 0 && (
        <AlertBanner
          type="warning"
          message="No webhook events captured yet. Configure the webhook in Brevo dashboard and send a test campaign to see events here."
        />
      )}

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Events"
            value={stats.total_events?.toLocaleString() || '0'}
            icon={<Activity className="text-blue-500" />}
          />
          <StatCard
            title="Unique Contacts"
            value={stats.unique_contacts?.toLocaleString() || '0'}
            icon={<Mail className="text-green-500" />}
          />
          <StatCard
            title="Total Opens"
            value={stats.total_opens?.toLocaleString() || '0'}
            icon={<Mail className="text-purple-500" />}
          />
          <StatCard
            title="Total Clicks"
            value={stats.total_clicks?.toLocaleString() || '0'}
            icon={<MousePointer className="text-orange-500" />}
          />
        </div>
      )}

      {/* Filters */}
      <ChartCard title="Filters & Search">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search Email or Campaign
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Search..."
                className="w-full pl-10 pr-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Event Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Event Type
            </label>
            <select
              value={filters.eventType}
              onChange={(e) => setFilters({ ...filters, eventType: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white"
            >
              <option value="all">All Events</option>
              <option value="opened">Opens Only</option>
              <option value="clicked">Clicks Only</option>
              <option value="both">Opens & Clicks</option>
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Time Range
            </label>
            <select
              value={filters.dateRange}
              onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white"
            >
              <option value="all">All Time</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>
        </div>

        {/* Active Filters Summary */}
        <div className="mt-4 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <span>
            Showing <strong>{filteredEvents.length}</strong> of <strong>{events.length}</strong> events
          </span>
          {(filters.eventType !== 'all' || filters.search || filters.dateRange !== 'all') && (
            <button
              onClick={() => setFilters({ eventType: 'all', search: '', dateRange: 'all' })}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Clear Filters
            </button>
          )}
        </div>
      </ChartCard>

      {/* Event Log Table */}
      <ChartCard title="Event Log">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Real-time webhook events captured from Brevo
          </p>
          <button
            onClick={fetchEvents}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg flex items-center gap-2 transition-colors"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>

        {filteredEvents.length > 0 ? (
          <DataTable
            columns={eventColumns}
            data={filteredEvents}
          />
        ) : (
          <div className="text-center py-12">
            <Activity size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Events Match Filters
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Try adjusting your filters or clearing them to see more events.
            </p>
          </div>
        )}
      </ChartCard>

      {/* Event Type Legend */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Event Types</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            <Mail size={16} className="text-green-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Email Opened</span>
          </div>
          <div className="flex items-center gap-2">
            <MousePointer size={16} className="text-purple-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Link Clicked</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle size={16} className="text-blue-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Delivered</span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle size={16} className="text-red-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Bounced</span>
          </div>
          <div className="flex items-center gap-2">
            <UserX size={16} className="text-orange-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Unsubscribed</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-yellow-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Marked as Spam</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
          Note: Currently tracking Opens and Clicks. Other events are logged in server console.
        </p>
      </div>

      {/* Contact Event Timeline Modal */}
      {selectedContactEmail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <ContactEventTimeline
                email={selectedContactEmail}
                onClose={() => setSelectedContactEmail(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventLogDashboard;
