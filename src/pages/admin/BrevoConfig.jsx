import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import Logo from '../../components/Logo';
import {
  Webhook,
  RefreshCw,
  Copy,
  Check,
  X,
  Power,
  Trash2,
  AlertTriangle,
  ArrowLeft,
  Sun,
  Moon,
  Settings as SettingsIcon,
  LogOut,
  Loader
} from 'lucide-react';
import API_BASE_URL from '../../config/api';

const BrevoConfig = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [webhooks, setWebhooks] = useState([]);
  const [usersWithoutWebhooks, setUsersWithoutWebhooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const [processing, setProcessing] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const fetchWebhooks = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/admin/brevo-webhooks`);
      setWebhooks(res.data.webhooks || []);
      setUsersWithoutWebhooks(res.data.usersWithoutWebhooks || []);
    } catch (error) {
      console.error('Error fetching webhooks:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateWebhook = async (userId) => {
    try {
      setProcessing(userId);
      await axios.post(`${API_BASE_URL}/admin/brevo-webhooks/${userId}/generate`);
      await fetchWebhooks();
      alert('Webhook generated successfully!');
    } catch (error) {
      console.error('Error generating webhook:', error);
      alert('Failed to generate webhook');
    } finally {
      setProcessing(null);
    }
  };

  const toggleWebhook = async (userId, currentStatus) => {
    try {
      setProcessing(userId);
      await axios.put(`${API_BASE_URL}/admin/brevo-webhooks/${userId}/toggle`, {
        is_active: !currentStatus
      });
      await fetchWebhooks();
    } catch (error) {
      console.error('Error toggling webhook:', error);
      alert('Failed to toggle webhook status');
    } finally {
      setProcessing(null);
    }
  };

  const deleteWebhook = async (userId, userEmail) => {
    if (!confirm(`Are you sure you want to delete the webhook for ${userEmail}?`)) {
      return;
    }

    try {
      setProcessing(userId);
      await axios.delete(`${API_BASE_URL}/admin/brevo-webhooks/${userId}`);
      await fetchWebhooks();
    } catch (error) {
      console.error('Error deleting webhook:', error);
      alert('Failed to delete webhook');
    } finally {
      setProcessing(null);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-40">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <Logo className="h-8" />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              <ArrowLeft size={18} />
              Dashboard
            </button>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <div className="relative">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <SettingsIcon size={20} />
              </button>
              {showSettings && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
                  <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    <p className="font-medium text-gray-900 dark:text-white">{user?.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                  >
                    <LogOut size={18} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Title and Description */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Brevo Webhook Configuration
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage user-specific Brevo webhook URLs for receiving real-time email events
          </p>
        </div>

      {/* Users Without Webhooks */}
      {usersWithoutWebhooks.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start gap-3 mb-3">
            <AlertTriangle className="text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                Users with Brevo API Keys but No Webhooks
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                The following users have Brevo API keys configured but no webhook URLs yet. Click "Generate" to create one.
              </p>
              <div className="space-y-2">
                {usersWithoutWebhooks.map((user) => (
                  <div key={user.user_id} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg p-3 border border-yellow-200 dark:border-yellow-700">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {user.user_name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {user.user_email}
                      </div>
                    </div>
                    <button
                      onClick={() => generateWebhook(user.user_id)}
                      disabled={processing === user.user_id}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      {processing === user.user_id ? (
                        <RefreshCw className="animate-spin" size={16} />
                      ) : (
                        <Webhook size={16} />
                      )}
                      Generate Webhook
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Alert */}
      <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium mb-1">How to Setup Brevo Webhooks:</p>
            <ol className="list-decimal ml-4 space-y-1">
              <li>Generate a unique webhook URL for each user below</li>
              <li>Log into the user's Brevo account</li>
              <li>Go to Settings → Webhooks → Add a new webhook</li>
              <li>Paste the webhook URL and select events: <strong>opened</strong>, <strong>click</strong>, <strong>unsubscribe</strong>, <strong>hard_bounce</strong></li>
              <li>Save and test the webhook</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Webhooks Table */}
      {webhooks.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
          <Webhook className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No webhooks configured
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Webhooks will be auto-generated for users with Brevo API keys
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Webhook URL
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Events Received
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Last Event
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {webhooks.map((webhook) => (
                <tr key={webhook.id}>
                  {/* User */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {webhook.user_name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {webhook.user_email}
                      </div>
                    </div>
                  </td>

                  {/* Webhook URL */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded font-mono text-gray-800 dark:text-gray-200 max-w-md overflow-hidden text-ellipsis">
                        {webhook.webhook_url}
                      </code>
                      <button
                        onClick={() => copyToClipboard(webhook.webhook_url, webhook.id)}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        title="Copy webhook URL"
                      >
                        {copiedId === webhook.id ? (
                          <Check className="text-green-600" size={16} />
                        ) : (
                          <Copy className="text-gray-500" size={16} />
                        )}
                      </button>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        webhook.is_active
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}
                    >
                      {webhook.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>

                  {/* Events Count */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {webhook.events_received.toLocaleString()}
                  </td>

                  {/* Last Event */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(webhook.last_event_at)}
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      {/* Toggle Active/Inactive */}
                      <button
                        onClick={() => toggleWebhook(webhook.user_id, webhook.is_active)}
                        disabled={processing === webhook.user_id}
                        className={`p-2 rounded ${
                          webhook.is_active
                            ? 'text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
                            : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                        } disabled:opacity-50`}
                        title={webhook.is_active ? 'Deactivate' : 'Activate'}
                      >
                        <Power size={18} />
                      </button>

                      {/* Regenerate */}
                      <button
                        onClick={() => generateWebhook(webhook.user_id)}
                        disabled={processing === webhook.user_id}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded disabled:opacity-50"
                        title="Regenerate webhook URL"
                      >
                        <RefreshCw size={18} />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => deleteWebhook(webhook.user_id, webhook.user_email)}
                        disabled={processing === webhook.user_id}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded disabled:opacity-50"
                        title="Delete webhook"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </div>
  );
};

export default BrevoConfig;
