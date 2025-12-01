import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import Logo from '../../components/Logo';
import API_BASE_URL from '../../config/api';
import {
  ArrowLeft,
  Mail,
  Key,
  Check,
  X,
  RefreshCw,
  Settings as SettingsIcon,
  Sun,
  Moon,
  LogOut,
  Save,
  TestTube,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader
} from 'lucide-react';
import { toast } from 'sonner';

const MailchimpConfig = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [leadTypes, setLeadTypes] = useState([]);
  const [selectedLeadType, setSelectedLeadType] = useState(null);
  const [config, setConfig] = useState(null);
  const [audiences, setAudiences] = useState([]);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testResult, setTestResult] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  const [formData, setFormData] = useState({
    api_key: '',
    server_prefix: '',
    default_audience_id: '',
    default_from_name: '',
    default_from_email: '',
    default_reply_to: '',
    auto_sync_enabled: false,
    sync_frequency_minutes: 60,
    enable_campaigns: true,
    enable_automations: true,
    enable_transactional: false,
    enable_ab_testing: true
  });

  useEffect(() => {
    fetchUsers();
    fetchLeadTypes();
  }, []);

  useEffect(() => {
    if (selectedUser && selectedLeadType) {
      fetchConfig();
    }
  }, [selectedUser, selectedLeadType]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/users`);
      setUsers(response.data.users);
      if (response.data.users.length > 0) {
        setSelectedUser(response.data.users[0]);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeadTypes = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/lead-types`);
      setLeadTypes(response.data);
      if (response.data.length > 0) {
        setSelectedLeadType(response.data[0]);
      }
    } catch (error) {
      console.error('Failed to fetch lead types:', error);
      toast.error('Failed to load lead types');
    }
  };

  const fetchConfig = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/mailchimp/admin/configs/${selectedUser.id}/${selectedLeadType.id}`
      );

      if (response.data.config) {
        setConfig(response.data.config);
        setFormData({
          api_key: response.data.config.api_key || '',
          server_prefix: response.data.config.server_prefix || '',
          default_audience_id: response.data.config.default_audience_id || '',
          default_from_name: response.data.config.default_from_name || '',
          default_from_email: response.data.config.default_from_email || '',
          default_reply_to: response.data.config.default_reply_to || '',
          auto_sync_enabled: Boolean(response.data.config.auto_sync_enabled),
          sync_frequency_minutes: response.data.config.sync_frequency_minutes || 60,
          enable_campaigns: Boolean(response.data.config.enable_campaigns),
          enable_automations: Boolean(response.data.config.enable_automations),
          enable_transactional: Boolean(response.data.config.enable_transactional),
          enable_ab_testing: Boolean(response.data.config.enable_ab_testing)
        });
      } else {
        setConfig(null);
        setFormData({
          api_key: '',
          server_prefix: '',
          default_audience_id: '',
          default_from_name: '',
          default_from_email: '',
          default_reply_to: '',
          auto_sync_enabled: false,
          sync_frequency_minutes: 60,
          enable_campaigns: true,
          enable_automations: true,
          enable_transactional: false,
          enable_ab_testing: true
        });
      }
      setTestResult(null);
      setAudiences([]);
    } catch (error) {
      console.error('Failed to fetch config:', error);
    }
  };

  const handleTestConnection = async () => {
    if (!formData.api_key || !formData.server_prefix) {
      toast.error('Please enter API key and server prefix');
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/mailchimp/admin/configs/test`, {
        api_key: formData.api_key,
        server_prefix: formData.server_prefix
      });

      setTestResult({
        success: true,
        message: response.data.message
      });
      setAudiences(response.data.audiences || []);
      toast.success('Connection successful!');
    } catch (error) {
      setTestResult({
        success: false,
        message: error.response?.data?.error || 'Connection failed'
      });
      setAudiences([]);
      toast.error('Connection failed');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    console.log('handleSave called');
    console.log('selectedUser:', selectedUser);
    console.log('selectedLeadType:', selectedLeadType);
    console.log('formData:', formData);

    if (!selectedUser || !selectedLeadType) {
      toast.error('Please select a user and lead type');
      return;
    }

    if (!formData.api_key || !formData.server_prefix) {
      toast.error('API key and server prefix are required');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        user_id: selectedUser.id,
        lead_type_id: selectedLeadType.id,
        ...formData
      };
      console.log('Sending payload:', payload);

      const response = await axios.post(`${API_BASE_URL}/mailchimp/admin/configs`, payload);
      console.log('Save response:', response.data);

      toast.success('Configuration saved successfully!');
      fetchConfig();
    } catch (error) {
      console.error('Failed to save config:', error);
      console.error('Error response:', error.response?.data);
      toast.error(error.response?.data?.error || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getConnectionStatusBadge = () => {
    if (!config) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full text-sm">
          <AlertCircle size={14} />
          Not Configured
        </span>
      );
    }

    switch (config.connection_status) {
      case 'connected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full text-sm">
            <CheckCircle size={14} />
            Connected
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-full text-sm">
            <XCircle size={14} />
            Error
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full text-sm">
            <AlertCircle size={14} />
            Disconnected
          </span>
        );
    }
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
            <div className="flex items-center gap-2">
              <Mail className="text-blue-600" size={24} />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Mailchimp Configuration</h1>
            </div>
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
        {/* User and Lead Type Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select User
            </label>
            <select
              value={selectedUser?.id || ''}
              onChange={(e) => {
                const user = users.find(u => u.id === parseInt(e.target.value));
                setSelectedUser(user);
              }}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
            >
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Lead Type
            </label>
            <select
              value={selectedLeadType?.id || ''}
              onChange={(e) => {
                const leadType = leadTypes.find(lt => lt.id === parseInt(e.target.value));
                setSelectedLeadType(leadType);
              }}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
            >
              {leadTypes.map(leadType => (
                <option key={leadType.id} value={leadType.id}>
                  {leadType.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Connection Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Connection Status</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {selectedUser?.name} - {selectedLeadType?.name}
              </p>
            </div>
            {getConnectionStatusBadge()}
          </div>
        </div>

        {/* Configuration Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Key size={20} />
              API Configuration
            </h2>
          </div>

          <div className="p-6 space-y-6">
            {/* API Key */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Mailchimp API Key *
              </label>
              <input
                type="password"
                value={formData.api_key}
                onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                placeholder="Enter your Mailchimp API key"
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Get your API key from Mailchimp Account Settings
              </p>
            </div>

            {/* Server Prefix */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Server Prefix *
              </label>
              <input
                type="text"
                value={formData.server_prefix}
                onChange={(e) => setFormData({ ...formData, server_prefix: e.target.value })}
                placeholder="us1, us2, us3, etc."
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Found in your API key (e.g., us1, us2)
              </p>
            </div>

            {/* Test Connection Button */}
            <div>
              <button
                onClick={handleTestConnection}
                disabled={testing || !formData.api_key || !formData.server_prefix}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                {testing ? (
                  <>
                    <Loader className="animate-spin" size={18} />
                    Testing...
                  </>
                ) : (
                  <>
                    <TestTube size={18} />
                    Test Connection
                  </>
                )}
              </button>
            </div>

            {/* Test Result */}
            {testResult && (
              <div className={`p-4 rounded-lg border ${
                testResult.success
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              }`}>
                <div className="flex items-start gap-2">
                  {testResult.success ? (
                    <CheckCircle className="text-green-600 dark:text-green-400 flex-shrink-0" size={20} />
                  ) : (
                    <XCircle className="text-red-600 dark:text-red-400 flex-shrink-0" size={20} />
                  )}
                  <p className={`text-sm ${
                    testResult.success
                      ? 'text-green-700 dark:text-green-300'
                      : 'text-red-700 dark:text-red-300'
                  }`}>
                    {testResult.message}
                  </p>
                </div>
              </div>
            )}

            {/* Audiences Dropdown */}
            {audiences.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Default Audience
                </label>
                <select
                  value={formData.default_audience_id}
                  onChange={(e) => setFormData({ ...formData, default_audience_id: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                >
                  <option value="">Select an audience</option>
                  {audiences.map(audience => (
                    <option key={audience.id} value={audience.id}>
                      {audience.name} ({audience.member_count} members)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Default Sender Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Default From Name
                </label>
                <input
                  type="text"
                  value={formData.default_from_name}
                  onChange={(e) => setFormData({ ...formData, default_from_name: e.target.value })}
                  placeholder="Your Company Name"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Default From Email
                </label>
                <input
                  type="email"
                  value={formData.default_from_email}
                  onChange={(e) => setFormData({ ...formData, default_from_email: e.target.value })}
                  placeholder="your@email.com"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Default Reply-To Email
              </label>
              <input
                type="email"
                value={formData.default_reply_to}
                onChange={(e) => setFormData({ ...formData, default_reply_to: e.target.value })}
                placeholder="reply@yourdomain.com"
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
              />
            </div>

            {/* Sync Settings */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-4">Sync Settings</h3>

              <div className="space-y-4">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.auto_sync_enabled}
                    onChange={(e) => setFormData({ ...formData, auto_sync_enabled: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Enable automatic sync</span>
                </label>

                {formData.auto_sync_enabled && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Sync Frequency (minutes)
                    </label>
                    <input
                      type="number"
                      value={formData.sync_frequency_minutes}
                      onChange={(e) => setFormData({ ...formData, sync_frequency_minutes: parseInt(e.target.value) })}
                      min="15"
                      max="1440"
                      className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Feature Toggles */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-4">Enabled Features</h3>

              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.enable_campaigns}
                    onChange={(e) => setFormData({ ...formData, enable_campaigns: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Email Campaigns</span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.enable_automations}
                    onChange={(e) => setFormData({ ...formData, enable_automations: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Automation Workflows</span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.enable_ab_testing}
                    onChange={(e) => setFormData({ ...formData, enable_ab_testing: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">A/B Testing</span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.enable_transactional}
                    onChange={(e) => setFormData({ ...formData, enable_transactional: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Transactional Emails (Mandrill)</span>
                </label>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-4 flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving || !formData.api_key || !formData.server_prefix}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                {saving ? (
                  <>
                    <Loader className="animate-spin" size={18} />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Save Configuration
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MailchimpConfig;
