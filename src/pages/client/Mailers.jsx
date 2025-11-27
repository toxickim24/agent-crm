import { useState, useEffect } from 'react';
import { Send, DollarSign, Package, AlertTriangle, Plus, Download, Eye, RefreshCw, Play, Pause, StopCircle, Trash2, RotateCcw, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import axios from 'axios';
import API_BASE_URL from '../../config/api';
import { useAuth } from '../../contexts/AuthContext';

const Mailers = () => {
  const { user } = useAuth();
  const [mailers, setMailers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [leadTypes, setLeadTypes] = useState([]);
  const [stats, setStats] = useState({ total: 0, today: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedLeadType, setSelectedLeadType] = useState('');
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [contactSearchTerm, setContactSearchTerm] = useState('');
  const [viewingMailer, setViewingMailer] = useState(null);
  const [syncingIds, setSyncingIds] = useState({});
  const [syncingAll, setSyncingAll] = useState(false);
  const [configError, setConfigError] = useState(false);
  const [configStatus, setConfigStatus] = useState({ configured: true, missing: [] });

  // Don't call fetchConfigStatus if it's going to fail due to proxy issues
  // The warning will show if mailers API calls fail with 400 error
  const shouldCheckConfig = true; // Enabled for troubleshooting
  const [showDeleted, setShowDeleted] = useState(false);
  const [showSyncProgressModal, setShowSyncProgressModal] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ completed: 0, total: 0, current: null });

  // Pagination and filtering
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLeadTypeFilter, setSelectedLeadTypeFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [selectedSyncStatusFilter, setSelectedSyncStatusFilter] = useState('all');

  useEffect(() => {
    fetchMailers();
    fetchStats();
    fetchContacts();
    fetchLeadTypes();
    if (shouldCheckConfig) {
      fetchConfigStatus();
    }
  }, [showDeleted]);

  const fetchMailers = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/mailers?showDeleted=${showDeleted}`);
      setMailers(response.data);
    } catch (error) {
      console.error('Failed to fetch mailers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/mailers/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchContacts = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/contacts`);
      setContacts(response.data.contacts || []);
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
    }
  };

  const fetchLeadTypes = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/lead-types`);
      setLeadTypes(response.data);
    } catch (error) {
      console.error('Failed to fetch lead types:', error);
    }
  };

  const fetchConfigStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/mailers/config-status`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      console.log('Config status response:', response.data);
      setConfigStatus(response.data);
      setConfigError(!response.data.configured);
      console.log('configError set to:', !response.data.configured);
    } catch (error) {
      console.error('Failed to fetch config status:', error);
      // If endpoint fails (404 or other error), assume config is missing and show warning
      setConfigError(true);
      setConfigStatus({
        configured: false,
        missing: [
          'DealMachine Bearer Token',
          'Get Lead API Endpoint',
          'Start Mail API Endpoint',
          'Pause Mail API Endpoint',
          'End Mail API Endpoint',
          'Mailer Campaign ID'
        ]
      });
    }
  };

  const handleImportByLeadType = async () => {
    if (!selectedLeadType) {
      toast.error('Please select a lead type');
      return;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/mailers/import-by-lead-type`, {
        lead_type: selectedLeadType
      });
      toast.success(response.data.message);
      setShowImportModal(false);
      setSelectedLeadType('');
      fetchMailers();
      fetchStats();
    } catch (error) {
      console.error('Import failed:', error);
      toast.error(error.response?.data?.error || 'Failed to import contacts');
    }
  };

  const handleAddContact = async () => {
    if (selectedContacts.length === 0) {
      toast.error('Please select at least one contact');
      return;
    }

    try {
      // Add all selected contacts sequentially
      let successCount = 0;
      let failCount = 0;

      for (const contactId of selectedContacts) {
        try {
          await axios.post(`${API_BASE_URL}/mailers/add-contact`, {
            contact_id: contactId
          });
          successCount++;
        } catch (error) {
          console.error(`Failed to add contact ${contactId}:`, error);
          failCount++;
        }
      }

      // Show results
      if (successCount > 0 && failCount === 0) {
        toast.success(`${successCount} contact${successCount > 1 ? 's' : ''} added successfully`);
      } else if (successCount > 0 && failCount > 0) {
        toast.warning(`${successCount} added, ${failCount} failed`);
      } else {
        toast.error('Failed to add contacts');
      }

      setShowAddContactModal(false);
      setSelectedContacts([]);
      setContactSearchTerm('');
      fetchMailers();
      fetchStats();
    } catch (error) {
      console.error('Add contacts failed:', error);
      toast.error(error.response?.data?.error || 'Failed to add contacts');
    }
  };

  const handleSync = async (mailerId) => {
    setSyncingIds(prev => ({ ...prev, [mailerId]: true }));
    try {
      const response = await axios.post(`${API_BASE_URL}/mailers/sync/${mailerId}`);
      toast.success('Contact synced successfully');
      fetchMailers();
      fetchStats();
    } catch (error) {
      console.error('Sync failed:', error);
      toast.error(error.response?.data?.error || 'Failed to sync contact');
    } finally {
      setSyncingIds(prev => {
        const newState = { ...prev };
        delete newState[mailerId];
        return newState;
      });
    }
  };

  const handleSyncAll = async () => {
    setSyncingAll(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/mailers/sync-all`);
      const totalContacts = response.data.count;

      // Show progress modal
      setShowSyncProgressModal(true);
      setSyncProgress({ completed: 0, total: totalContacts, current: null });

      let hasNotified = false; // Track if we've shown completion notification

      // Poll for progress updates from sync status endpoint
      const pollInterval = setInterval(async () => {
        try {
          // Fetch sync queue status
          const statusResponse = await axios.get(`${API_BASE_URL}/mailers/sync-status`);
          const status = statusResponse.data;

          // Update progress
          setSyncProgress({
            completed: status.completed,
            total: status.total,
            current: status.current
          });

          // Stop polling when all done - check if processing is complete AND we have valid counts
          if (!status.processing && status.completed > 0 && status.completed >= status.total && !hasNotified) {
            hasNotified = true;
            clearInterval(pollInterval);

            // Fetch final mailer data to get success/fail counts
            const mailersResponse = await axios.get(`${API_BASE_URL}/mailers?showDeleted=false`);
            const updatedMailers = mailersResponse.data;

            const successCount = updatedMailers.filter(m => m.sync_status === 'Success').length;
            const failedCount = updatedMailers.filter(m => m.sync_status === 'Failed').length;

            setShowSyncProgressModal(false);
            setSyncingAll(false);
            fetchMailers();
            fetchStats();

            // Show detailed notification
            if (failedCount > 0) {
              toast.success(`Sync complete! ${successCount} successful, ${failedCount} failed.`, { duration: 5000 });
            } else {
              toast.success(`All ${status.total} contacts synced successfully!`, { duration: 5000 });
            }
          }
        } catch (error) {
          console.error('Error polling sync progress:', error);
        }
      }, 1000); // Poll every second

      // Safety timeout - stop polling after 10 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        if (!hasNotified) {
          setShowSyncProgressModal(false);
          setSyncingAll(false);
          fetchMailers();
          fetchStats();
          toast.info('Sync timeout reached. Check sync status column for results.');
        }
      }, 600000); // 10 minutes (600000ms)

    } catch (error) {
      console.error('Sync all failed:', error);
      toast.error(error.response?.data?.error || 'Failed to sync contacts');
      setSyncingAll(false);
      setShowSyncProgressModal(false);
    }
  };

  const handleStart = async (mailerId) => {
    if (!confirm('Are you sure you want to start the mail sequence for this contact?')) return;

    try {
      await axios.post(`${API_BASE_URL}/mailers/start/${mailerId}`);
      toast.success('Mail sequence started');
      fetchMailers();
      fetchStats();
    } catch (error) {
      console.error('Start failed:', error);
      toast.error(error.response?.data?.error || 'Failed to start mail sequence');
    }
  };

  const handlePause = async (mailerId) => {
    if (!confirm('Are you sure you want to pause the mail sequence for this contact?')) return;

    try {
      await axios.post(`${API_BASE_URL}/mailers/pause/${mailerId}`);
      toast.success('Mail sequence paused');
      fetchMailers();
      fetchStats();
    } catch (error) {
      console.error('Pause failed:', error);
      toast.error(error.response?.data?.error || 'Failed to pause mail sequence');
    }
  };

  const handleEnd = async (mailerId) => {
    if (!confirm('Are you sure you want to end the mail sequence for this contact? This action cannot be undone.')) return;

    try {
      await axios.post(`${API_BASE_URL}/mailers/end/${mailerId}`);
      toast.success('Mail sequence ended');
      fetchMailers();
      fetchStats();
    } catch (error) {
      console.error('End failed:', error);
      toast.error(error.response?.data?.error || 'Failed to end mail sequence');
    }
  };

  const handleRemove = async (mailerId) => {
    if (!confirm('Are you sure you want to remove this contact from mailers?')) return;

    try {
      await axios.delete(`${API_BASE_URL}/mailers/${mailerId}`);
      toast.success('Contact removed from mailers');
      fetchMailers();
      fetchStats();
    } catch (error) {
      console.error('Remove failed:', error);
      toast.error(error.response?.data?.error || 'Failed to remove contact');
    }
  };

  const handleRestore = async (mailerId) => {
    if (!confirm('Are you sure you want to restore this contact?')) return;

    try {
      await axios.post(`${API_BASE_URL}/mailers/${mailerId}/restore`);
      toast.success('Contact restored successfully');
      fetchMailers();
      fetchStats();
    } catch (error) {
      console.error('Restore failed:', error);
      toast.error(error.response?.data?.error || 'Failed to restore contact');
    }
  };

  const handleView = (mailer) => {
    setViewingMailer(mailer);
    setShowViewModal(true);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const totalCost = mailers.reduce((sum, m) => sum + (parseFloat(m.cost) || 0), 0);

  const statsDisplay = [
    { label: 'Total Mailers Sent', value: stats.total.toString(), icon: Send, color: 'blue' },
    { label: 'Mailers Sent Today', value: stats.today.toString(), icon: Send, color: 'green' },
    { label: 'Total Campaign Cost', value: formatCurrency(totalCost), icon: DollarSign, color: 'red' },
    { label: 'Pending Delivery', value: stats.pending.toString(), icon: Package, color: 'yellow' },
  ];

  // Generate monthly performance chart data
  const getMonthlyChartData = () => {
    const monthlyData = {};
    const months = [];

    // Get last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      months.push(monthKey);
      monthlyData[monthKey] = { sent: 0, cost: 0 };
    }

    // Aggregate mailer data by month
    mailers.forEach(mailer => {
      if (mailer.last_mail_sent_date) {
        const date = new Date(mailer.last_mail_sent_date);
        const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        if (monthlyData[monthKey]) {
          monthlyData[monthKey].sent += mailer.total_times_mail_was_sent || 0;
          monthlyData[monthKey].cost += parseFloat(mailer.cost) || 0;
        }
      }
    });

    return months.map(month => ({
      month,
      sent: monthlyData[month].sent,
      cost: monthlyData[month].cost
    }));
  };

  const chartData = getMonthlyChartData();

  // Filtering and pagination logic
  const filteredMailers = mailers.filter(mailer => {
    const matchesSearch =
      `${mailer.first_name} ${mailer.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mailer.property_address_full?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mailer.lead_id?.toString().includes(searchTerm);

    const matchesLeadType = selectedLeadTypeFilter === 'all' || mailer.lead_type?.toString() === selectedLeadTypeFilter;

    const matchesStatus = selectedStatusFilter === 'all' ||
      (selectedStatusFilter === 'not_started' && (!mailer.campaign_status_label || mailer.campaign_status_label === 'Not Started')) ||
      (selectedStatusFilter === 'in_progress' && mailer.campaign_status_label?.includes('Progress')) ||
      (selectedStatusFilter === 'paused' && mailer.campaign_status_label?.includes('Paused')) ||
      (selectedStatusFilter === 'ended' && mailer.campaign_status_label?.includes('Ended'));

    const matchesSyncStatus = selectedSyncStatusFilter === 'all' ||
      (selectedSyncStatusFilter === 'pending' && (!mailer.sync_status || mailer.sync_status === 'Pending')) ||
      (selectedSyncStatusFilter === 'success' && mailer.sync_status === 'Success') ||
      (selectedSyncStatusFilter === 'failed' && mailer.sync_status === 'Failed');

    return matchesSearch && matchesLeadType && matchesStatus && matchesSyncStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredMailers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedMailers = filteredMailers.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedLeadTypeFilter, selectedStatusFilter, selectedSyncStatusFilter, itemsPerPage]);

  // Filter out contacts that are already in mailers (use lead_id)
  const availableContacts = contacts.filter(c =>
    !mailers.some(m => m.lead_id === c.lead_id)
  );

  // Filter contacts based on search term in the modal
  const filteredAvailableContacts = availableContacts.filter(contact => {
    const searchLower = contactSearchTerm.toLowerCase();
    const fullName = `${contact.contact_first_name || ''} ${contact.contact_last_name || ''}`.toLowerCase();
    const leadId = contact.lead_id?.toString() || '';
    const address = contact.property_address_full?.toLowerCase() || '';

    return fullName.includes(searchLower) ||
           leadId.includes(searchLower) ||
           address.includes(searchLower);
  });

  // Helper function to check permissions
  const hasPermission = (permission) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return user[permission] === 1 || user[permission] === true;
  };

  // Filter lead types based on user permissions
  const allowedLeadTypes = (() => {
    if (!user || user.role === 'admin') return leadTypes;

    try {
      const allowed = user.allowed_lead_types;
      if (!allowed) return leadTypes;

      const allowedIds = typeof allowed === 'string' ? JSON.parse(allowed) : allowed;
      if (!Array.isArray(allowedIds) || allowedIds.length === 0) return leadTypes;

      return leadTypes.filter(lt => allowedIds.includes(lt.id));
    } catch (e) {
      console.error('Error parsing allowed_lead_types:', e);
      return leadTypes;
    }
  })();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Direct Mail Campaigns</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Track your direct mail marketing with DealMachine</p>
        </div>
        <div className="flex gap-2">
          {hasPermission('mailer_import') && (
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Download size={18} />
              Import by Lead Type
            </button>
          )}
          {hasPermission('mailer_add') && (
            <button
              onClick={() => setShowAddContactModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <Plus size={18} />
              Add Contact
            </button>
          )}
          {hasPermission('mailer_sync_all') && (
            <button
              onClick={handleSyncAll}
              disabled={syncingAll || mailers.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={18} className={syncingAll ? 'animate-spin' : ''} />
              {syncingAll ? 'Syncing...' : 'Sync All'}
            </button>
          )}
        </div>
      </div>

      {/* DealMachine Integration Warning */}
      {configError && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" size={24} />
            <div className="flex-1">
              <h3 className="text-base font-semibold text-yellow-900 dark:text-yellow-300 mb-2">
                DealMachine Integration Required
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-400 mb-3">
                This page will display mailer campaign data from DealMachine once the API is configured by your administrator.
              </p>
              {configStatus.missing.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-2">
                    Missing Configuration:
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    {configStatus.missing.map((item, index) => (
                      <li key={index} className="text-sm text-yellow-700 dark:text-yellow-400">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-3">
                Please contact your administrator to set up the integration.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsDisplay.map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg bg-${stat.color}-100 dark:bg-${stat.color}-900/20`}>
                <stat.icon className={`text-${stat.color}-600 dark:text-${stat.color}-400`} size={24} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Monthly Performance Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Monthly Performance</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="dark:opacity-20" />
            <XAxis dataKey="month" tick={{ fill: 'currentColor' }} className="text-gray-600 dark:text-gray-400" />
            <YAxis yAxisId="left" tick={{ fill: 'currentColor' }} className="text-gray-600 dark:text-gray-400" />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: 'currentColor' }} className="text-gray-600 dark:text-gray-400" />
            <Tooltip contentStyle={{ backgroundColor: 'var(--tooltip-bg)', border: '1px solid var(--tooltip-border)' }} />
            <Legend />
            <Bar yAxisId="left" dataKey="sent" name="Mailers Sent" fill="#3b82f6" />
            <Bar yAxisId="right" dataKey="cost" name="Total Cost ($)" fill="#10b981" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Mailers Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Mailers Contacts</h2>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showDeleted}
              onChange={(e) => setShowDeleted(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">Show Deleted</span>
          </label>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search by name, address, or lead ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Lead Type Filter */}
            <select
              value={selectedLeadTypeFilter}
              onChange={(e) => setSelectedLeadTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Lead Types</option>
              {allowedLeadTypes.map((type) => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="paused">Paused</option>
              <option value="ended">Ended</option>
            </select>

            {/* Sync Status Filter */}
            <select
              value={selectedSyncStatusFilter}
              onChange={(e) => setSelectedSyncStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Sync Status</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
            </select>

            {/* Items Per Page */}
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value={10}>Show 10</option>
              <option value={25}>Show 25</option>
              <option value={50}>Show 50</option>
              <option value={100}>Show 100</option>
            </select>
          </div>

          {/* Results count */}
          <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            Showing {startIndex + 1}-{Math.min(endIndex, filteredMailers.length)} of {filteredMailers.length} mailers
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading campaigns...</div>
          ) : filteredMailers.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              {showDeleted ? 'No deleted campaigns found.' : 'No mailers found. Try adjusting your filters or import contacts to get started.'}
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Lead ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Lead Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Sync Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Mail Design</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Times Sent</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Last Sent</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Cost</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedMailers.map((mailer) => (
                  <tr
                    key={mailer.id}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                      mailer.deleted_at ? 'bg-red-50 dark:bg-red-900/10 opacity-60' : ''
                    }`}
                  >
                    <td className="px-6 py-4 text-gray-900 dark:text-white font-mono text-sm">{mailer.lead_id}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {mailer.first_name} {mailer.last_name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                        {mailer.property_address_full}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-900 dark:text-white">
                      {leadTypes.find(lt => lt.id === mailer.lead_type)?.name || mailer.lead_type || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        mailer.campaign_status_label?.includes('Progress')
                          ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                          : mailer.campaign_status_label?.includes('Paused')
                          ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
                          : mailer.campaign_status_label?.includes('Ended')
                          ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                          : 'bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-400'
                      }`}>
                        {mailer.campaign_status_label || 'Not Started'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        mailer.sync_status === 'Success'
                          ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                          : mailer.sync_status === 'Failed'
                          ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                          : 'bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-400'
                      }`} title={mailer.sync_error || ''}>
                        {mailer.sync_status || 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {mailer.mail_design_label || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-gray-900 dark:text-white">{mailer.total_times_mail_was_sent || 0}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{formatDate(mailer.last_mail_sent_date)}</td>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{formatCurrency(mailer.cost)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {mailer.deleted_at ? (
                          <button
                            onClick={() => handleRestore(mailer.id)}
                            className="p-1 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                            title="Restore"
                          >
                            <RotateCcw size={16} />
                          </button>
                        ) : (
                          <>
                            {hasPermission('mailer_view') && (
                              <button
                                onClick={() => handleView(mailer)}
                                className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                title="View Details"
                              >
                                <Eye size={16} />
                              </button>
                            )}
                            {hasPermission('mailer_sync') && (
                              <button
                                onClick={() => handleSync(mailer.id)}
                                disabled={syncingIds[mailer.id]}
                                className="p-1 text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 disabled:opacity-50"
                                title="Sync"
                              >
                                <RefreshCw size={16} className={syncingIds[mailer.id] ? 'animate-spin' : ''} />
                              </button>
                            )}
                            {hasPermission('mailer_start') && (
                              <button
                                onClick={() => handleStart(mailer.id)}
                                className="p-1 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                                title="Start"
                              >
                                <Play size={16} />
                              </button>
                            )}
                            {hasPermission('mailer_pause') && (
                              <button
                                onClick={() => handlePause(mailer.id)}
                                className="p-1 text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-300"
                                title="Pause"
                              >
                                <Pause size={16} />
                              </button>
                            )}
                            {hasPermission('mailer_end') && (
                              <button
                                onClick={() => handleEnd(mailer.id)}
                                className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                title="End"
                              >
                                <StopCircle size={16} />
                              </button>
                            )}
                            {hasPermission('mailer_delete') && (
                              <button
                                onClick={() => handleRemove(mailer.id)}
                                className="p-1 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300"
                                title="Remove"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!loading && filteredMailers.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <ChevronLeft size={16} />
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Import by Lead Type Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Import Contacts by Lead Type</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Select Lead Type
                </label>
                <select
                  value={selectedLeadType}
                  onChange={(e) => setSelectedLeadType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Choose a lead type...</option>
                  {allowedLeadTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setSelectedLeadType('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportByLeadType}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Import
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Contact Modal */}
      {showAddContactModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full p-6 max-h-[90vh] flex flex-col">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Add Contact to Mailers</h2>
            <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Search and Select Contact
                </label>
                {/* Search Input */}
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search by name, address, or lead ID..."
                    value={contactSearchTerm}
                    onChange={(e) => setContactSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {/* Results count and selection */}
                <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <span>{filteredAvailableContacts.length} contact{filteredAvailableContacts.length !== 1 ? 's' : ''} available</span>
                  {selectedContacts.length > 0 && (
                    <span className="font-medium text-green-600 dark:text-green-400">
                      {selectedContacts.length} selected
                    </span>
                  )}
                </div>

                {/* Scrollable Contact List */}
                <div className="border border-gray-300 dark:border-gray-600 rounded-lg max-h-96 overflow-y-auto">
                  {filteredAvailableContacts.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                      {contactSearchTerm ? 'No contacts found matching your search.' : 'No available contacts to add.'}
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredAvailableContacts.map((contact) => {
                        const isSelected = selectedContacts.includes(contact.id);
                        return (
                          <div
                            key={contact.id}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedContacts(selectedContacts.filter(id => id !== contact.id));
                              } else {
                                setSelectedContacts([...selectedContacts, contact.id]);
                              }
                            }}
                            className={`p-4 cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-green-50 dark:bg-green-900/20 border-l-4 border-green-600'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {contact.contact_first_name} {contact.contact_last_name}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  Lead ID: {contact.lead_id}
                                </div>
                                {contact.property_address_full && (
                                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    {contact.property_address_full}
                                  </div>
                                )}
                              </div>
                              {isSelected && (
                                <div className="ml-4 flex-shrink-0">
                                  <div className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center">
                                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-3 pt-4 flex-shrink-0">
                <button
                  onClick={() => {
                    setShowAddContactModal(false);
                    setSelectedContacts([]);
                    setContactSearchTerm('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddContact}
                  disabled={selectedContacts.length === 0}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add {selectedContacts.length > 0 ? `${selectedContacts.length} Contact${selectedContacts.length > 1 ? 's' : ''}` : 'Contacts'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {showViewModal && viewingMailer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Campaign Details</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Contact Name</label>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {viewingMailer.first_name} {viewingMailer.last_name}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Lead Type</label>
                  <p className="text-gray-900 dark:text-white">
                    {leadTypes.find(lt => lt.id === viewingMailer.lead_type)?.name || viewingMailer.lead_type || 'N/A'}
                  </p>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Property Address</label>
                  <p className="text-gray-900 dark:text-white">{viewingMailer.property_address_full || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Campaign Status</label>
                  <p className="text-gray-900 dark:text-white">{viewingMailer.campaign_status_label || 'Not Started'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Mail Sequence</label>
                  <p className="text-gray-900 dark:text-white">{viewingMailer.mail_sequence_value || 'N/A'}</p>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Mail Design</label>
                  <p className="text-gray-900 dark:text-white">{viewingMailer.mail_design_label || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Times Sent</label>
                  <p className="text-gray-900 dark:text-white">{viewingMailer.total_times_mail_was_sent || 0}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Last Sent Date</label>
                  <p className="text-gray-900 dark:text-white">{formatDate(viewingMailer.last_mail_sent_date)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Mailing Addresses</label>
                  <p className="text-gray-900 dark:text-white">{viewingMailer.number_of_mailing_addresses > 0 ? 'True' : 'False'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">USPS Address</label>
                  <p className="text-gray-900 dark:text-white">{viewingMailer.has_usps_address ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total Cost</label>
                  <p className="text-gray-900 dark:text-white font-bold text-lg">{formatCurrency(viewingMailer.cost)}</p>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setViewingMailer(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sync Progress Modal */}
      {showSyncProgressModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Syncing Contacts</h2>
              <button
                onClick={() => setShowSyncProgressModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                title="Close (sync continues in background)"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              {/* Progress Bar */}
              <div>
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <span>Progress</span>
                  <span>{syncProgress.completed} / {syncProgress.total}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-blue-600 h-full transition-all duration-300 ease-out"
                    style={{ width: `${(syncProgress.completed / syncProgress.total) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Current Contact */}
              {syncProgress.current && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-sm text-blue-900 dark:text-blue-300 font-medium">Currently syncing:</p>
                  <p className="text-blue-700 dark:text-blue-400 mt-1">{syncProgress.current}</p>
                </div>
              )}

              {/* Status Message */}
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <RefreshCw size={18} className="animate-spin" />
                <span className="text-sm">
                  {syncProgress.completed === syncProgress.total
                    ? 'Finishing up...'
                    : 'Syncing contacts with DealMachine...'}
                </span>
              </div>

              {/* Note */}
              <p className="text-xs text-gray-500 dark:text-gray-400">
                This process runs in the background. You can close this dialog, but the sync will continue.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Mailers;
