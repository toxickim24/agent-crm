import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Mail,
  Users,
  BarChart3,
  RefreshCw,
  Settings,
  List,
  TrendingUp,
  Eye,
  MousePointer,
  UserMinus
} from 'lucide-react';
import { toast } from 'sonner';
import API_BASE_URL from '../../config/api';
import { useAuth } from '../../contexts/AuthContext';

const BrevoDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [recentCampaigns, setRecentCampaigns] = useState([]);
  const [accountInfo, setAccountInfo] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch account info
      const accountResponse = await axios.get(`${API_BASE_URL}/brevo/account`);
      setAccountInfo(accountResponse.data);

      // Check if configured
      if (!accountResponse.data.configured) {
        // Not configured - will show "Integration Required" message
        return;
      }

      if (accountResponse.data.configured && accountResponse.data.valid) {
        // Fetch statistics
        const statsResponse = await axios.get(`${API_BASE_URL}/brevo/stats/overview`);
        setStats(statsResponse.data);

        // Fetch recent campaigns
        const campaignsResponse = await axios.get(`${API_BASE_URL}/brevo/stats/recent?limit=5`);
        setRecentCampaigns(campaignsResponse.data.campaigns);
      } else if (accountResponse.data.configured && !accountResponse.data.valid) {
        // API key is configured but invalid
        setError('Brevo API key is invalid or unauthorized. Please check your API configuration.');
      }
    } catch (error) {
      // Actual error - show error message
      console.error('Error fetching Brevo dashboard data:', error);
      setError(error.response?.data?.error || 'Failed to connect to Brevo');
      setAccountInfo({ configured: false });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="animate-spin h-8 w-8 text-blue-500" />
      </div>
    );
  }

  // Not configured state
  if (!accountInfo?.configured) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Brevo Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">View your Brevo email marketing performance</p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <TrendingUp className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" size={24} />
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
                Brevo Integration Required
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                This page will display email campaign data from Brevo once the integration is configured by your administrator.
                Please contact your admin to set up Brevo API access.
              </p>
              {user.role === 'admin' && (
                <button
                  onClick={() => navigate('/admin/api-keys')}
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg inline-flex items-center gap-2 text-sm"
                >
                  <Settings size={16} />
                  Configure Brevo API
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state (configured but failing)
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Brevo Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">View your Brevo email marketing performance</p>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <Mail className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={24} />
            <div>
              <p className="text-sm font-medium text-red-900 dark:text-red-300">
                Brevo Connection Error
              </p>
              <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                {error}
              </p>
              {user.role === 'admin' && (
                <button
                  onClick={() => navigate('/admin/api-keys')}
                  className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg inline-flex items-center gap-2 text-sm"
                >
                  <Settings size={16} />
                  Update API Configuration
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Brevo Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {accountInfo.email} - {accountInfo.companyName}
          </p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg inline-flex items-center gap-2"
        >
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Campaigns"
          value={stats?.campaigns.total_campaigns || 0}
          icon={<Mail className="text-blue-500" />}
        />
        <StatCard
          title="Total Contacts"
          value={stats?.totalContacts || 0}
          icon={<Users className="text-green-500" />}
        />
        <StatCard
          title="Total Lists"
          value={stats?.totalLists || 0}
          icon={<List className="text-purple-500" />}
        />
        <StatCard
          title="Avg Open Rate"
          value={`${parseFloat(stats?.campaigns.avg_open_rate || 0).toFixed(1)}%`}
          icon={<Eye className="text-orange-500" />}
        />
      </div>

      {/* Overall Statistics */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          Campaign Performance Overview
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <MetricBox
            label="Total Sent"
            value={stats?.campaigns.total_sent?.toLocaleString() || 0}
            icon={<Mail size={20} className="text-blue-500" />}
          />
          <MetricBox
            label="Total Delivered"
            value={stats?.campaigns.total_delivered?.toLocaleString() || 0}
            icon={<TrendingUp size={20} className="text-green-500" />}
          />
          <MetricBox
            label="Unique Opens"
            value={stats?.campaigns.total_unique_opens?.toLocaleString() || 0}
            icon={<Eye size={20} className="text-purple-500" />}
          />
          <MetricBox
            label="Unique Clicks"
            value={stats?.campaigns.total_unique_clicks?.toLocaleString() || 0}
            icon={<MousePointer size={20} className="text-orange-500" />}
          />
          <MetricBox
            label="Bounces"
            value={stats?.campaigns.total_bounces?.toLocaleString() || 0}
            icon={<UserMinus size={20} className="text-red-500" />}
          />
          <MetricBox
            label="Unsubscribes"
            value={stats?.campaigns.total_unsubscribes?.toLocaleString() || 0}
            icon={<UserMinus size={20} className="text-gray-500" />}
          />
          <MetricBox
            label="Avg Click Rate"
            value={`${parseFloat(stats?.campaigns.avg_click_rate || 0).toFixed(1)}%`}
            icon={<BarChart3 size={20} className="text-indigo-500" />}
          />
          <MetricBox
            label="Avg Bounce Rate"
            value={`${parseFloat(stats?.campaigns.avg_bounce_rate || 0).toFixed(1)}%`}
            icon={<TrendingUp size={20} className="text-yellow-500" />}
          />
        </div>
      </div>

      {/* Recent Campaigns */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Recent Campaigns
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Campaign
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Sent Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Sent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Opens
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Clicks
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Open Rate
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {recentCampaigns.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    No campaigns found. Sync data from Brevo to see campaigns.
                  </td>
                </tr>
              ) : (
                recentCampaigns.map((campaign) => (
                  <tr key={campaign.brevo_campaign_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {campaign.campaign_name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                        {campaign.subject}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {campaign.sent_date ? new Date(campaign.sent_date).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {campaign.stats_sent?.toLocaleString() || 0}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {campaign.stats_unique_opens?.toLocaleString() || 0}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {campaign.stats_unique_clicks?.toLocaleString() || 0}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        parseFloat(campaign.open_rate) > 20
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : parseFloat(campaign.open_rate) > 10
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                      }`}>
                        {campaign.open_rate}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Helper Components
const StatCard = ({ title, value, icon, onClick }) => (
  <div
    onClick={onClick}
    className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700 transition-shadow ${
      onClick ? 'hover:shadow-lg cursor-pointer' : ''
    }`}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
        <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
          {value}
        </p>
      </div>
      <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
        {icon}
      </div>
    </div>
  </div>
);

const MetricBox = ({ label, value, icon }) => (
  <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
    <div className="flex justify-center mb-2">{icon}</div>
    <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{label}</p>
  </div>
);

export default BrevoDashboard;
