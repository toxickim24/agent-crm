import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import API_BASE_URL from '../../config/api';
import {
  Mail,
  Send,
  Eye,
  MousePointer,
  TrendingUp,
  RefreshCw,
  Filter,
  Search,
  Calendar,
  Users,
  BarChart3,
  MapPin,
  Smartphone,
  Link as LinkIcon,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader,
  MoreVertical,
  Trash2,
  Archive,
  RotateCw,
  ArrowUpDown,
  Download
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { toast } from 'sonner';
import ContactDetailsModal from '../../components/ContactDetailsModal';
import CampaignDetailsModal from '../../components/CampaignDetailsModal';
import CampaignComparisonModal from '../../components/CampaignComparisonModal';

const EmailsEnhanced = () => {
  const { user } = useAuth();
  const [configs, setConfigs] = useState([]);
  const [selectedLeadType, setSelectedLeadType] = useState(null);
  const [stats, setStats] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [emailContacts, setEmailContacts] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncingContacts, setSyncingContacts] = useState(false);
  const [syncingCampaigns, setSyncingCampaigns] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [contactStatusFilter, setContactStatusFilter] = useState('all');
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showContactDetailsModal, setShowContactDetailsModal] = useState(false);
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [selectedCampaigns, setSelectedCampaigns] = useState([]);
  const [campaignsToCompare, setCampaignsToCompare] = useState([]);
  const [contactsPage, setContactsPage] = useState(1);
  const contactsPerPage = 25;

  // Sorting state
  const [campaignSortField, setCampaignSortField] = useState('lead_type_name');
  const [campaignSortOrder, setCampaignSortOrder] = useState('asc');
  const [contactSortField, setContactSortField] = useState('last_synced_at');
  const [contactSortOrder, setContactSortOrder] = useState('desc');

  // Advanced filter state
  const [showCampaignFilters, setShowCampaignFilters] = useState(false);
  const [showContactFilters, setShowContactFilters] = useState(false);
  const [campaignDateRange, setCampaignDateRange] = useState({ start: '', end: '' });
  const [contactDateRange, setContactDateRange] = useState({ start: '', end: '' });
  const [minOpenRate, setMinOpenRate] = useState(0);
  const [minClickRate, setMinClickRate] = useState(0);
  const [memberRatingFilter, setMemberRatingFilter] = useState(0);

  // Helper function to check email permissions
  const hasEmailPermission = (permission) => {
    if (!user) return false;
    return user[permission] === 1 || user[permission] === true;
  };

  // Performance data for charts (last 30 days)
  const [performanceData, setPerformanceData] = useState([]);

  useEffect(() => {
    fetchConfigs();
  }, []);

  useEffect(() => {
    if (selectedLeadType) {
      fetchStats();
      fetchCampaigns();
      fetchEmailContacts();
    }
  }, [selectedLeadType]);

  const fetchConfigs = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/mailchimp/configs`);
      setConfigs(response.data.configs);
      if (response.data.configs.length > 0) {
        // Default to "All" if multiple configs exist
        setSelectedLeadType(response.data.configs.length > 1 ? 'all' : response.data.configs[0].lead_type_id);
      }
    } catch (error) {
      console.error('Failed to fetch configs:', error);
      toast.error('Failed to load Mailchimp configurations');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const params = selectedLeadType === 'all' ? {} : { lead_type_id: selectedLeadType };
      const response = await axios.get(`${API_BASE_URL}/mailchimp/stats`, { params });
      setStats(response.data);
      generatePerformanceData(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const params = selectedLeadType === 'all' ? {} : { lead_type_id: selectedLeadType };
      const response = await axios.get(`${API_BASE_URL}/mailchimp/campaigns`, { params });
      setCampaigns(response.data.campaigns || []);
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
    }
  };

  const fetchEmailContacts = async () => {
    try {
      const params = selectedLeadType === 'all' ? {} : { lead_type_id: selectedLeadType };
      const response = await axios.get(`${API_BASE_URL}/mailchimp/contacts`, { params });
      setEmailContacts(response.data.contacts || []);
    } catch (error) {
      console.error('Failed to fetch email contacts:', error);
    }
  };

  const generatePerformanceData = (statsData) => {
    // Group campaigns by month and aggregate stats
    const monthlyStats = {};

    campaigns.forEach(campaign => {
      if (campaign.send_time) {
        const date = new Date(campaign.send_time);
        const monthKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });

        if (!monthlyStats[monthKey]) {
          monthlyStats[monthKey] = { date: monthKey, sent: 0, opens: 0, clicks: 0 };
        }

        monthlyStats[monthKey].sent += campaign.emails_sent || 0;
        monthlyStats[monthKey].opens += campaign.unique_opens || 0;
        monthlyStats[monthKey].clicks += campaign.unique_clicks || 0;
      }
    });

    // Generate last 12 months with actual campaign data where available
    const data = [];
    const today = new Date();
    for (let i = 11; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });

      data.push(monthlyStats[monthKey] || {
        date: monthKey,
        sent: 0,
        opens: 0,
        clicks: 0
      });
    }

    setPerformanceData(data);
  };

  const handleSyncCampaigns = async () => {
    if (!selectedLeadType) {
      toast.error('Please select a lead type');
      return;
    }

    setSyncingCampaigns(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/mailchimp/campaigns/sync`, {
        lead_type_id: selectedLeadType
      });
      toast.success(response.data.message);
      fetchStats();
      fetchCampaigns();
      fetchEmailContacts();
    } catch (error) {
      console.error('Sync error:', error);
      toast.error(error.response?.data?.error || 'Failed to sync campaigns');
    } finally {
      setSyncingCampaigns(false);
    }
  };

  const handleSyncContacts = async () => {
    if (!selectedLeadType) {
      toast.error('Please select a lead type');
      return;
    }

    setSyncingContacts(true);
    toast.info(`Syncing contacts from Mailchimp ${selectedConfig?.lead_type_name}...`);

    try {
      const response = await axios.post(`${API_BASE_URL}/mailchimp/contacts/sync`, {
        lead_type_id: selectedLeadType
      });
      toast.success(response.data.message);
      fetchStats();
      fetchEmailContacts();
    } catch (error) {
      console.error('Sync contacts error:', error);
      toast.error(error.response?.data?.error || 'Failed to sync contacts from Mailchimp');
    } finally {
      setSyncingContacts(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      sent: { color: 'green', icon: CheckCircle, label: 'Sent' },
      sending: { color: 'blue', icon: Clock, label: 'Sending' },
      schedule: { color: 'purple', icon: Calendar, label: 'Scheduled' },
      paused: { color: 'yellow', icon: AlertCircle, label: 'Paused' },
      save: { color: 'gray', icon: Clock, label: 'Draft' }
    };

    const config = statusConfig[status] || statusConfig.save;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 bg-${config.color}-100 dark:bg-${config.color}-900/20 text-${config.color}-700 dark:text-${config.color}-400 rounded-full text-xs font-medium`}>
        <Icon size={12} />
        {config.label}
      </span>
    );
  };

  // Helper function to handle campaign sorting
  const handleCampaignSort = (field) => {
    if (campaignSortField === field) {
      setCampaignSortOrder(campaignSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setCampaignSortField(field);
      setCampaignSortOrder('desc');
    }
  };

  // Helper function to handle contact sorting
  const handleContactSort = (field) => {
    if (contactSortField === field) {
      setContactSortOrder(contactSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setContactSortField(field);
      setContactSortOrder('desc');
    }
  };

  // CSV Export functions
  const exportCampaignsToCSV = () => {
    const headers = ['Campaign', 'Lead Type', 'Status', 'Emails Sent', 'Unique Opens', 'Unique Clicks', 'Open Rate', 'Click Rate', 'Unsubscribe Rate', 'Delivery Rate', 'Send Time'];
    const rows = filteredCampaigns.map(campaign => [
      campaign.subject_line || campaign.title || 'Untitled',
      campaign.lead_type_name || '',
      campaign.status || '',
      campaign.emails_sent || 0,
      campaign.unique_opens || 0,
      campaign.unique_clicks || 0,
      `${typeof campaign.open_rate === 'number' ? campaign.open_rate.toFixed(2) : (campaign.open_rate || '0')}%`,
      `${typeof campaign.click_rate === 'number' ? campaign.click_rate.toFixed(2) : (campaign.click_rate || '0')}%`,
      `${typeof campaign.unsubscribe_rate === 'number' ? campaign.unsubscribe_rate.toFixed(2) : (campaign.unsubscribe_rate || '0')}%`,
      `${typeof campaign.delivery_rate === 'number' ? campaign.delivery_rate.toFixed(2) : (campaign.delivery_rate || '0')}%`,
      campaign.send_time ? new Date(campaign.send_time).toLocaleString() : 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `mailchimp-campaigns-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filteredCampaigns.length} campaigns to CSV`);
  };

  const exportContactsToCSV = () => {
    const headers = ['Name', 'Email', 'Address', 'City', 'State', 'Zip', 'Lead Type', 'Status', 'Member Rating', 'Signup Date', 'Last Synced'];
    const rows = filteredEmailContacts.map(contact => {
      const mergeFields = typeof contact.merge_fields === 'string'
        ? JSON.parse(contact.merge_fields)
        : (contact.merge_fields || {});
      const firstName = mergeFields.FNAME || '';
      const lastName = mergeFields.LNAME || '';
      const fullName = `${firstName} ${lastName}`.trim() || 'N/A';

      // Handle ADDRESS - can be string or object
      let address = '';
      let city = mergeFields.CITY || '';
      let state = mergeFields.STATE || '';
      let zip = mergeFields.ZIP || '';

      if (mergeFields.ADDRESS) {
        if (typeof mergeFields.ADDRESS === 'object') {
          address = mergeFields.ADDRESS.addr1 || '';
          if (!mergeFields.CITY && mergeFields.ADDRESS.city) city = mergeFields.ADDRESS.city;
          if (!mergeFields.STATE && mergeFields.ADDRESS.state) state = mergeFields.ADDRESS.state;
          if (!mergeFields.ZIP && mergeFields.ADDRESS.zip) zip = mergeFields.ADDRESS.zip;
        } else {
          address = mergeFields.ADDRESS;
        }
      }

      return [
        fullName,
        contact.email_address || '',
        address,
        city,
        state,
        zip,
        contact.lead_type_name || '',
        contact.status || '',
        contact.member_rating || 0,
        contact.timestamp_signup ? new Date(contact.timestamp_signup).toLocaleDateString() : 'N/A',
        contact.last_synced_at ? new Date(contact.last_synced_at).toLocaleString() : 'Never'
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `mailchimp-contacts-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filteredEmailContacts.length} contacts to CSV`);
  };

  const filteredCampaigns = campaigns
    .filter(campaign => {
      const matchesSearch = campaign.subject_line?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           campaign.title?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter;

      // Advanced filters
      let matchesDateRange = true;
      if (campaignDateRange.start || campaignDateRange.end) {
        const campaignDate = campaign.send_time ? new Date(campaign.send_time) : null;
        if (campaignDate) {
          if (campaignDateRange.start) {
            const startDate = new Date(campaignDateRange.start);
            matchesDateRange = matchesDateRange && campaignDate >= startDate;
          }
          if (campaignDateRange.end) {
            const endDate = new Date(campaignDateRange.end);
            endDate.setHours(23, 59, 59, 999);
            matchesDateRange = matchesDateRange && campaignDate <= endDate;
          }
        } else {
          matchesDateRange = false;
        }
      }

      const campaignOpenRate = parseFloat(campaign.open_rate) || 0;
      const matchesOpenRate = campaignOpenRate >= minOpenRate;

      const campaignClickRate = parseFloat(campaign.click_rate) || 0;
      const matchesClickRate = campaignClickRate >= minClickRate;

      return matchesSearch && matchesStatus && matchesDateRange && matchesOpenRate && matchesClickRate;
    })
    .sort((a, b) => {
      let aVal = a[campaignSortField];
      let bVal = b[campaignSortField];

      // Handle null/undefined values
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      // Parse numbers for numeric fields
      if (['emails_sent', 'unique_opens', 'unique_clicks', 'open_rate', 'click_rate', 'unsubscribe_rate', 'delivery_rate'].includes(campaignSortField)) {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      }

      // Parse dates
      if (campaignSortField === 'send_time') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      if (aVal < bVal) return campaignSortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return campaignSortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  const filteredEmailContacts = emailContacts
    .filter(contact => {
      const searchLower = contactSearchQuery.toLowerCase();

      // Extract name and address from merge_fields
      let firstName = '';
      let lastName = '';
      let address = '';
      let city = '';
      let state = '';
      let zip = '';
      try {
        const mergeFields = typeof contact.merge_fields === 'string'
          ? JSON.parse(contact.merge_fields)
          : (contact.merge_fields || {});
        firstName = mergeFields.FNAME || '';
        lastName = mergeFields.LNAME || '';

        // Handle ADDRESS - can be string or object
        city = mergeFields.CITY || '';
        state = mergeFields.STATE || '';
        zip = mergeFields.ZIP || '';

        if (mergeFields.ADDRESS) {
          if (typeof mergeFields.ADDRESS === 'object') {
            address = mergeFields.ADDRESS.addr1 || '';
            if (!mergeFields.CITY && mergeFields.ADDRESS.city) city = mergeFields.ADDRESS.city;
            if (!mergeFields.STATE && mergeFields.ADDRESS.state) state = mergeFields.ADDRESS.state;
            if (!mergeFields.ZIP && mergeFields.ADDRESS.zip) zip = mergeFields.ADDRESS.zip;
          } else {
            address = mergeFields.ADDRESS;
          }
        }
      } catch (e) {
        // If parsing fails, just use empty strings
      }

      const matchesSearch = (
        firstName.toLowerCase().includes(searchLower) ||
        lastName.toLowerCase().includes(searchLower) ||
        contact.email_address?.toLowerCase().includes(searchLower) ||
        address.toLowerCase().includes(searchLower) ||
        city.toLowerCase().includes(searchLower) ||
        state.toLowerCase().includes(searchLower) ||
        zip.toLowerCase().includes(searchLower)
      );
      const matchesStatus = contactStatusFilter === 'all' || contact.status === contactStatusFilter;

      // Advanced filters
      let matchesDateRange = true;
      if (contactDateRange.start || contactDateRange.end) {
        const contactDate = contact.last_synced_at ? new Date(contact.last_synced_at) : null;
        if (contactDate) {
          if (contactDateRange.start) {
            const startDate = new Date(contactDateRange.start);
            matchesDateRange = matchesDateRange && contactDate >= startDate;
          }
          if (contactDateRange.end) {
            const endDate = new Date(contactDateRange.end);
            endDate.setHours(23, 59, 59, 999);
            matchesDateRange = matchesDateRange && contactDate <= endDate;
          }
        } else {
          matchesDateRange = false;
        }
      }

      const contactRating = parseInt(contact.member_rating) || 0;
      const matchesRating = contactRating >= memberRatingFilter;

      return matchesSearch && matchesStatus && matchesDateRange && matchesRating;
    })
    .sort((a, b) => {
      let aVal = a[contactSortField];
      let bVal = b[contactSortField];

      // Handle null/undefined values
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      // Parse numbers for numeric fields
      if (['member_rating'].includes(contactSortField)) {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      }

      // Parse dates
      if (['last_synced_at', 'timestamp_signup', 'last_changed'].includes(contactSortField)) {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      if (aVal < bVal) return contactSortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return contactSortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  // Pagination for email contacts
  const totalContactPages = Math.ceil(filteredEmailContacts.length / contactsPerPage);
  const paginatedEmailContacts = filteredEmailContacts.slice(
    (contactsPage - 1) * contactsPerPage,
    contactsPage * contactsPerPage
  );

  const selectedConfig = configs.find(c => c.lead_type_id === selectedLeadType);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  if (configs.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Email Campaigns</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Track your email marketing performance</p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <TrendingUp className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" size={24} />
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
                Mailchimp Integration Required
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                This page will display email campaign data from Mailchimp once the integration is configured by your administrator.
                Please contact your admin to set up Mailchimp for your lead types.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Email Campaigns</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Track your Mailchimp email marketing performance</p>
        </div>
        {selectedLeadType !== 'all' && (
          <div className="flex gap-3">
            {hasEmailPermission('email_sync_contacts') && (
              <button
                onClick={handleSyncContacts}
                disabled={syncingContacts || syncingCampaigns}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                <RefreshCw className={syncingContacts ? 'animate-spin' : ''} size={18} />
                {syncingContacts ? 'Syncing...' : `Sync Mailchimp ${selectedConfig?.lead_type_name || ''}`}
              </button>
            )}
            {hasEmailPermission('email_sync_campaigns') && (
              <button
                onClick={handleSyncCampaigns}
                disabled={syncingContacts || syncingCampaigns}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                <RefreshCw className={syncingCampaigns ? 'animate-spin' : ''} size={18} />
                {syncingCampaigns ? 'Syncing...' : 'Sync Campaigns'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Lead Type Tabs */}
      {configs.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">Lead Type:</span>
            {configs.length > 1 && (
              <button
                onClick={() => setSelectedLeadType('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedLeadType === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                All
              </button>
            )}
            {configs.map(config => (
              <button
                key={config.lead_type_id}
                onClick={() => setSelectedLeadType(config.lead_type_id)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedLeadType === config.lead_type_id
                    ? 'text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                style={selectedLeadType === config.lead_type_id ? { backgroundColor: config.lead_type_color } : {}}
              >
                {config.lead_type_name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Connection Status */}
      {selectedConfig && selectedConfig.connection_status !== 'connected' && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-sm font-medium text-yellow-900 dark:text-yellow-300">
                Mailchimp Connection Issue
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                The Mailchimp connection for {selectedConfig.lead_type_name} is not active. Please contact your administrator to check the configuration.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { label: 'Total Sent', value: stats?.total_sent || 0, icon: Send, color: 'blue' },
          { label: 'Sent Today', value: stats?.sent_today || 0, icon: Send, color: 'green' },
          { label: 'Total Opens', value: stats?.total_opens || 0, icon: Eye, color: 'purple' },
          { label: 'Opens Today', value: stats?.opens_today || 0, icon: Eye, color: 'indigo' },
          { label: 'Total Clicks', value: stats?.total_clicks || 0, icon: MousePointer, color: 'pink' },
          { label: 'Clicks Today', value: stats?.clicks_today || 0, icon: MousePointer, color: 'cyan' },
        ].map((stat, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {stat.value.toLocaleString()}
                </p>
              </div>
              <div className={`p-3 rounded-lg bg-${stat.color}-100 dark:bg-${stat.color}-900/20`}>
                <stat.icon className={`text-${stat.color}-600 dark:text-${stat.color}-400`} size={24} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Open Rate</h3>
            <TrendingUp className="text-green-600 dark:text-green-400" size={18} />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {(stats?.avg_open_rate || 0).toFixed(1)}%
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Click Rate</h3>
            <MousePointer className="text-blue-600 dark:text-blue-400" size={18} />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {(stats?.avg_click_rate || 0).toFixed(1)}%
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Unsub Rate</h3>
            <TrendingUp className="text-red-600 dark:text-red-400" size={18} />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {(stats?.avg_unsubscribe_rate || 0).toFixed(1)}%
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Delivery Rate</h3>
            <TrendingUp className="text-purple-600 dark:text-purple-400" size={18} />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {(stats?.avg_delivery_rate || 0).toFixed(1)}%
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Campaigns</h3>
            <Mail className="text-gray-600 dark:text-gray-400" size={18} />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {campaigns.length}
          </p>
        </div>
      </div>

      {/* Performance Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <BarChart3 size={20} />
          Monthly Performance Trend
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={performanceData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
            <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '0.5rem',
                color: '#fff'
              }}
            />
            <Legend />
            <Line type="monotone" dataKey="sent" stroke="#3b82f6" strokeWidth={2} name="Sent" dot={false} />
            <Line type="monotone" dataKey="opens" stroke="#8b5cf6" strokeWidth={2} name="Opens" dot={false} />
            <Line type="monotone" dataKey="clicks" stroke="#ec4899" strokeWidth={2} name="Clicks" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Performance Insights Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Best Performing Campaigns */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-green-600" />
            Best Performing Campaigns
          </h2>
          <div className="space-y-3">
            {campaigns
              .filter(c => c.status === 'sent' && c.emails_sent > 0)
              .sort((a, b) => (parseFloat(b.open_rate) || 0) - (parseFloat(a.open_rate) || 0))
              .slice(0, 5)
              .map((campaign, index) => (
                <div
                  key={campaign.id}
                  className={`flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${hasEmailPermission('email_view_campaign') ? 'cursor-pointer' : 'cursor-default'}`}
                  onClick={() => {
                    if (hasEmailPermission('email_view_campaign')) {
                      setSelectedCampaign(campaign);
                      setShowCampaignModal(true);
                    }
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400">#{index + 1}</span>
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {campaign.subject_line || campaign.title || 'Untitled'}
                      </p>
                    </div>
                    {campaign.lead_type_name && (
                      <span
                        className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: campaign.lead_type_color }}
                      >
                        {campaign.lead_type_name}
                      </span>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Open Rate</p>
                        <p className="text-lg font-bold text-green-600 dark:text-green-400">
                          {(parseFloat(campaign.open_rate) || 0).toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Click Rate</p>
                        <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          {(parseFloat(campaign.click_rate) || 0).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            {campaigns.filter(c => c.status === 'sent' && c.emails_sent > 0).length === 0 && (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                No sent campaigns yet
              </p>
            )}
          </div>
        </div>

        {/* Top Engaged Contacts */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Users size={20} className="text-purple-600" />
            Top Engaged Contacts
          </h2>
          <div className="space-y-3">
            {emailContacts
              .filter(c => c.member_rating > 0)
              .sort((a, b) => (parseInt(b.member_rating) || 0) - (parseInt(a.member_rating) || 0))
              .slice(0, 5)
              .map((contact, index) => (
                <div
                  key={contact.id}
                  className={`flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${hasEmailPermission('email_view_campaign') ? 'cursor-pointer' : 'cursor-default'}`}
                  onClick={() => {
                    if (hasEmailPermission('email_view_campaign')) {
                      setSelectedContact(contact);
                      setShowContactDetailsModal(true);
                    }
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400">#{index + 1}</span>
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {contact.contact_first_name} {contact.contact_last_name}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                      {contact.email_address}
                    </p>
                    {contact.lead_type_name && (
                      <span
                        className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: contact.lead_type_color }}
                      >
                        {contact.lead_type_name}
                      </span>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Member Rating</p>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <span
                          key={i}
                          className={i < (parseInt(contact.member_rating) || 0) ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 capitalize">
                      {contact.status}
                    </p>
                  </div>
                </div>
              ))}
            {emailContacts.filter(c => c.member_rating > 0).length === 0 && (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                No rated contacts yet
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Campaigns Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Mail size={20} />
              Campaigns
            </h2>
            <div className="flex items-center gap-3 flex-wrap">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search campaigns..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white text-sm"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white text-sm"
              >
                <option value="all">All Status</option>
                <option value="sent">Sent</option>
                <option value="sending">Sending</option>
                <option value="schedule">Scheduled</option>
                <option value="paused">Paused</option>
                <option value="save">Draft</option>
              </select>

              {/* Export CSV Button */}
              {hasEmailPermission('email_export_csv') && (
                <button
                  onClick={exportCampaignsToCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm"
                >
                  <Download size={16} />
                  Export CSV
                </button>
              )}

              {/* Advanced Filters Button */}
              <button
                onClick={() => setShowCampaignFilters(!showCampaignFilters)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm ${
                  showCampaignFilters
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                <Filter size={16} />
                Advanced Filters
              </button>
            </div>
          </div>

          {/* Advanced Filters Panel */}
          {showCampaignFilters && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Advanced Filters</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Date Range */}
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={campaignDateRange.start}
                    onChange={(e) => setCampaignDateRange({ ...campaignDateRange, start: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">End Date</label>
                  <input
                    type="date"
                    value={campaignDateRange.end}
                    onChange={(e) => setCampaignDateRange({ ...campaignDateRange, end: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white text-sm"
                  />
                </div>

                {/* Min Open Rate */}
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                    Min Open Rate: {minOpenRate}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={minOpenRate}
                    onChange={(e) => setMinOpenRate(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-300 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                {/* Min Click Rate */}
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                    Min Click Rate: {minClickRate}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={minClickRate}
                    onChange={(e) => setMinClickRate(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-300 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
              </div>

              {/* Clear Filters Button */}
              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => {
                    setCampaignDateRange({ start: '', end: '' });
                    setMinOpenRate(0);
                    setMinClickRate(0);
                  }}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bulk Actions Toolbar for Campaigns */}
        {selectedCampaigns.length > 0 && (
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border-t border-b border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-purple-900 dark:text-purple-300">
                {selectedCampaigns.length} campaign(s) selected
              </span>
              <div className="flex items-center gap-2">
                {hasEmailPermission('email_view_campaign') && (
                  <button
                    onClick={() => {
                      if (selectedCampaigns.length < 2) {
                        toast.error('Please select at least 2 campaigns to compare');
                        return;
                      }
                      if (selectedCampaigns.length > 4) {
                        toast.error('You can compare up to 4 campaigns at a time');
                        return;
                      }
                      const campaignsData = campaigns.filter(c => selectedCampaigns.includes(c.id));
                      setCampaignsToCompare(campaignsData);
                      setShowComparisonModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                    disabled={selectedCampaigns.length < 2}
                  >
                    <TrendingUp size={16} />
                    Compare ({selectedCampaigns.length})
                  </button>
                )}
                {hasEmailPermission('email_sync_campaigns') && (
                  <button
                    onClick={async () => {
                      try {
                        await Promise.all(
                          selectedCampaigns.map(id =>
                            axios.post(`${API_BASE_URL}/mailchimp/campaigns/${id}/resync`)
                          )
                        );
                        toast.success(`Resynced ${selectedCampaigns.length} campaign(s) successfully`);
                        setSelectedCampaigns([]);
                        fetchCampaigns();
                      } catch (error) {
                        toast.error('Failed to resync campaigns');
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm"
                  >
                    <RotateCw size={16} />
                    Resync Selected
                  </button>
                )}
                {hasEmailPermission('email_archive_campaign') && (
                  <button
                    onClick={async () => {
                      if (confirm(`Are you sure you want to archive ${selectedCampaigns.length} campaign(s)?`)) {
                        try {
                          await Promise.all(
                            selectedCampaigns.map(id =>
                              axios.delete(`${API_BASE_URL}/mailchimp/campaigns/${id}`)
                            )
                          );
                          toast.success(`Archived ${selectedCampaigns.length} campaign(s) successfully`);
                          setSelectedCampaigns([]);
                          fetchCampaigns();
                        } catch (error) {
                          toast.error('Failed to archive campaigns');
                        }
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
                  >
                    <Archive size={16} />
                    Archive Selected
                  </button>
                )}
                <button
                  onClick={() => setSelectedCampaigns([])}
                  className="px-4 py-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-900 dark:text-white rounded-lg transition-colors text-sm"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Campaigns Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedCampaigns.length === filteredCampaigns.length && filteredCampaigns.length > 0}
                    onChange={() => {
                      if (selectedCampaigns.length === filteredCampaigns.length) {
                        setSelectedCampaigns([]);
                      } else {
                        setSelectedCampaigns(filteredCampaigns.map(c => c.id));
                      }
                    }}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Campaign</th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleCampaignSort('lead_type_name')}
                >
                  <div className="flex items-center gap-1">
                    Lead Type
                    {campaignSortField === 'lead_type_name' && (
                      campaignSortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleCampaignSort('emails_sent')}
                >
                  <div className="flex items-center gap-1">
                    Sent
                    {campaignSortField === 'emails_sent' && (
                      campaignSortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                    )}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleCampaignSort('unique_opens')}
                >
                  <div className="flex items-center gap-1">
                    Opens
                    {campaignSortField === 'unique_opens' && (
                      campaignSortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                    )}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleCampaignSort('unique_clicks')}
                >
                  <div className="flex items-center gap-1">
                    Clicks
                    {campaignSortField === 'unique_clicks' && (
                      campaignSortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                    )}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleCampaignSort('open_rate')}
                >
                  <div className="flex items-center gap-1">
                    Open Rate
                    {campaignSortField === 'open_rate' && (
                      campaignSortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                    )}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleCampaignSort('click_rate')}
                >
                  <div className="flex items-center gap-1">
                    Click Rate
                    {campaignSortField === 'click_rate' && (
                      campaignSortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredCampaigns.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    {campaigns.length === 0 ? (
                      <div className="flex flex-col items-center gap-2">
                        <Mail size={48} className="text-gray-400" />
                        <p>No campaigns found</p>
                        <p className="text-sm">Click "Sync Campaigns" to fetch your Mailchimp campaigns</p>
                      </div>
                    ) : (
                      <p>No campaigns match your filters</p>
                    )}
                  </td>
                </tr>
              ) : (
                filteredCampaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedCampaigns.includes(campaign.id)}
                        onChange={() => {
                          if (selectedCampaigns.includes(campaign.id)) {
                            setSelectedCampaigns(selectedCampaigns.filter(id => id !== campaign.id));
                          } else {
                            setSelectedCampaigns([...selectedCampaigns, campaign.id]);
                          }
                        }}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{campaign.subject_line || campaign.title || 'Untitled'}</p>
                        {campaign.title && campaign.subject_line && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">{campaign.title}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {campaign.lead_type_name && (
                        <span
                          className="px-2 py-1 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: campaign.lead_type_color }}
                        >
                          {campaign.lead_type_name}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(campaign.status)}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{(campaign.emails_sent || 0).toLocaleString()}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{(campaign.unique_opens || 0).toLocaleString()}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{(campaign.unique_clicks || 0).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full text-sm font-medium">
                        {typeof campaign.open_rate === 'number' ? campaign.open_rate.toFixed(1) : (campaign.open_rate || '0')}%
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-full text-sm font-medium">
                        {typeof campaign.click_rate === 'number' ? campaign.click_rate.toFixed(1) : (campaign.click_rate || '0')}%
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {hasEmailPermission('email_view_campaign') && (
                          <button
                            onClick={() => {
                              setSelectedCampaign(campaign);
                              setShowCampaignModal(true);
                            }}
                            className="text-blue-600 dark:text-blue-400 hover:underline text-sm flex items-center gap-1"
                            title="View Details"
                          >
                            <Eye size={14} />
                            View
                          </button>
                        )}
                        {hasEmailPermission('email_sync_campaigns') && (
                          <button
                            onClick={async () => {
                              try {
                                await axios.post(`${API_BASE_URL}/mailchimp/campaigns/${campaign.id}/resync`);
                                toast.success('Campaign resynced successfully');
                                fetchCampaigns();
                              } catch (error) {
                                toast.error(error.response?.data?.error || 'Failed to resync campaign');
                              }
                            }}
                            className="text-green-600 dark:text-green-400 hover:underline text-sm flex items-center gap-1"
                            title="Resync"
                          >
                            <RotateCw size={14} />
                          </button>
                        )}
                        {hasEmailPermission('email_archive_campaign') && (
                          <button
                            onClick={async () => {
                              if (confirm('Are you sure you want to archive this campaign from Mailchimp sync?')) {
                                try {
                                  await axios.delete(`${API_BASE_URL}/mailchimp/campaigns/${campaign.id}`);
                                  toast.success('Campaign archived successfully');
                                  fetchCampaigns();
                                } catch (error) {
                                  toast.error(error.response?.data?.error || 'Failed to archive campaign');
                                }
                              }
                            }}
                            className="text-red-600 dark:text-red-400 hover:underline text-sm flex items-center gap-1"
                            title="Archive"
                          >
                            <Archive size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Email Contacts Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Users size={20} />
              Email Contacts ({emailContacts.length})
            </h2>
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search contacts..."
                  value={contactSearchQuery}
                  onChange={(e) => setContactSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white text-sm"
                />
              </div>
              {/* Status Filter */}
              <select
                value={contactStatusFilter}
                onChange={(e) => setContactStatusFilter(e.target.value)}
                className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white text-sm"
              >
                <option value="all">All Status</option>
                <option value="subscribed">Subscribed</option>
                <option value="unsubscribed">Unsubscribed</option>
                <option value="cleaned">Cleaned</option>
                <option value="pending">Pending</option>
                <option value="transactional">Transactional</option>
              </select>

              {/* Export CSV Button */}
              {hasEmailPermission('email_export_csv') && (
                <button
                  onClick={exportContactsToCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm"
                >
                  <Download size={16} />
                  Export CSV
                </button>
              )}

              {/* Advanced Filters Button */}
              <button
                onClick={() => setShowContactFilters(!showContactFilters)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm ${
                  showContactFilters
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                <Filter size={16} />
                Advanced Filters
              </button>
            </div>
          </div>

          {/* Advanced Filters Panel */}
          {showContactFilters && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Advanced Filters</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Date Range */}
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={contactDateRange.start}
                    onChange={(e) => setContactDateRange({ ...contactDateRange, start: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">End Date</label>
                  <input
                    type="date"
                    value={contactDateRange.end}
                    onChange={(e) => setContactDateRange({ ...contactDateRange, end: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white text-sm"
                  />
                </div>

                {/* Min Member Rating */}
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                    Min Member Rating: {memberRatingFilter} {memberRatingFilter > 0 && '⭐'.repeat(memberRatingFilter)}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    value={memberRatingFilter}
                    onChange={(e) => setMemberRatingFilter(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-300 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
              </div>

              {/* Clear Filters Button */}
              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => {
                    setContactDateRange({ start: '', end: '' });
                    setMemberRatingFilter(0);
                  }}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bulk Actions Toolbar */}
        {selectedContacts.length > 0 && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-t border-b border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900 dark:text-blue-300">
                {selectedContacts.length} contact(s) selected
              </span>
              <div className="flex items-center gap-2">
                {hasEmailPermission('email_sync_contacts') && (
                  <button
                    onClick={async () => {
                      try {
                        await Promise.all(
                          selectedContacts.map(id =>
                            axios.post(`${API_BASE_URL}/mailchimp/contacts/${id}/resync`)
                          )
                        );
                        toast.success(`Resynced ${selectedContacts.length} contact(s) successfully`);
                        setSelectedContacts([]);
                        fetchEmailContacts();
                      } catch (error) {
                        toast.error('Failed to resync contacts');
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm"
                  >
                    <RotateCw size={16} />
                    Resync Selected
                  </button>
                )}
                {hasEmailPermission('email_archive_campaign') && (
                  <button
                    onClick={async () => {
                      if (confirm(`Are you sure you want to archive ${selectedContacts.length} contact(s)?`)) {
                        try {
                          await Promise.all(
                            selectedContacts.map(id =>
                              axios.delete(`${API_BASE_URL}/mailchimp/contacts/${id}`)
                            )
                          );
                          toast.success(`Archived ${selectedContacts.length} contact(s) successfully`);
                          setSelectedContacts([]);
                          fetchEmailContacts();
                        } catch (error) {
                          toast.error('Failed to archive contacts');
                        }
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
                  >
                    <Archive size={16} />
                    Archive Selected
                  </button>
                )}
                <button
                  onClick={() => setSelectedContacts([])}
                  className="px-4 py-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-900 dark:text-white rounded-lg transition-colors text-sm"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Contacts Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedContacts.length === paginatedEmailContacts.length && paginatedEmailContacts.length > 0}
                    onChange={() => {
                      if (selectedContacts.length === paginatedEmailContacts.length) {
                        setSelectedContacts([]);
                      } else {
                        setSelectedContacts(paginatedEmailContacts.map(c => c.id));
                      }
                    }}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Address</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">City</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">State</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Zip</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Lead Type</th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleContactSort('status')}
                >
                  <div className="flex items-center gap-1">
                    Status
                    {contactSortField === 'status' && (
                      contactSortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                    )}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleContactSort('member_rating')}
                >
                  <div className="flex items-center gap-1">
                    Rating
                    {contactSortField === 'member_rating' && (
                      contactSortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                    )}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleContactSort('timestamp_signup')}
                >
                  <div className="flex items-center gap-1">
                    Signup Date
                    {contactSortField === 'timestamp_signup' && (
                      contactSortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                    )}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleContactSort('last_synced_at')}
                >
                  <div className="flex items-center gap-1">
                    Last Synced
                    {contactSortField === 'last_synced_at' && (
                      contactSortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedEmailContacts.length === 0 ? (
                <tr>
                  <td colSpan="13" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    {emailContacts.length === 0 ? (
                      <div className="flex flex-col items-center gap-2">
                        <Users size={48} className="text-gray-400" />
                        <p>No Mailchimp contacts found</p>
                        <p className="text-sm">Click "Sync Mailchimp {selectedConfig?.lead_type_name}" to sync all contacts from your Mailchimp audience</p>
                      </div>
                    ) : (
                      <p>No contacts match your search</p>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedEmailContacts.map((contact) => {
                  // Parse merge_fields once per row for better performance
                  let mergeFields = {};
                  try {
                    mergeFields = typeof contact.merge_fields === 'string'
                      ? JSON.parse(contact.merge_fields)
                      : (contact.merge_fields || {});
                  } catch (e) {
                    console.error('Error parsing merge_fields for contact', contact.id, e);
                  }

                  const firstName = mergeFields.FNAME || '';
                  const lastName = mergeFields.LNAME || '';
                  const fullName = `${firstName} ${lastName}`.trim() || 'N/A';

                  // Handle ADDRESS - can be string or object
                  let address = 'N/A';
                  let city = mergeFields.CITY || 'N/A';
                  let state = mergeFields.STATE || 'N/A';
                  let zip = mergeFields.ZIP || 'N/A';

                  if (mergeFields.ADDRESS) {
                    if (typeof mergeFields.ADDRESS === 'object') {
                      // ADDRESS is an object with nested properties
                      address = mergeFields.ADDRESS.addr1 || 'N/A';
                      if (!mergeFields.CITY && mergeFields.ADDRESS.city) city = mergeFields.ADDRESS.city;
                      if (!mergeFields.STATE && mergeFields.ADDRESS.state) state = mergeFields.ADDRESS.state;
                      if (!mergeFields.ZIP && mergeFields.ADDRESS.zip) zip = mergeFields.ADDRESS.zip;
                    } else {
                      // ADDRESS is a string
                      address = mergeFields.ADDRESS;
                    }
                  }

                  return (
                    <tr key={contact.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedContacts.includes(contact.id)}
                          onChange={() => {
                            if (selectedContacts.includes(contact.id)) {
                              setSelectedContacts(selectedContacts.filter(id => id !== contact.id));
                            } else {
                              setSelectedContacts([...selectedContacts, contact.id]);
                            }
                          }}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 text-gray-900 dark:text-white">{fullName}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{contact.email_address || 'N/A'}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{address}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{city}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{state}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{zip}</td>
                    <td className="px-6 py-4">
                      {contact.lead_type_name && (
                        <span
                          className="px-2 py-1 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: contact.lead_type_color }}
                        >
                          {contact.lead_type_name}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {contact.sync_status === 'error' ? (
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-full text-xs w-fit">
                            <XCircle size={12} />
                            Error
                          </span>
                          {contact.sync_error && (
                            <span className="text-xs text-red-600 dark:text-red-400" title={contact.sync_error}>
                              {contact.sync_error.substring(0, 50)}{contact.sync_error.length > 50 ? '...' : ''}
                            </span>
                          )}
                        </div>
                      ) : contact.status === 'subscribed' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full text-xs">
                          <CheckCircle size={12} />
                          Subscribed
                        </span>
                      ) : contact.status === 'unsubscribed' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-full text-xs">
                          <XCircle size={12} />
                          Unsubscribed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full text-xs">
                          <AlertCircle size={12} />
                          {contact.status || 'Unknown'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                      {contact.member_rating > 0 ? '⭐'.repeat(contact.member_rating) : 'No rating'}
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-sm">
                      {contact.timestamp_signup ? new Date(contact.timestamp_signup).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-sm">
                      {contact.last_synced_at ? new Date(contact.last_synced_at).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {hasEmailPermission('email_view_campaign') && (
                          <button
                            onClick={() => {
                              setSelectedContact(contact);
                              setShowContactDetailsModal(true);
                            }}
                            className="text-blue-600 dark:text-blue-400 hover:underline text-sm flex items-center gap-1"
                            title="View Details"
                          >
                            <Eye size={14} />
                            View
                          </button>
                        )}
                        {hasEmailPermission('email_sync_contacts') && (
                          <button
                            onClick={async () => {
                              try {
                                await axios.post(`${API_BASE_URL}/mailchimp/contacts/${contact.id}/resync`);
                                toast.success('Contact resynced successfully');
                                fetchEmailContacts();
                              } catch (error) {
                                toast.error(error.response?.data?.error || 'Failed to resync contact');
                              }
                            }}
                            className="text-green-600 dark:text-green-400 hover:underline text-sm flex items-center gap-1"
                            title="Resync"
                          >
                            <RotateCw size={14} />
                          </button>
                        )}
                        {hasEmailPermission('email_archive_campaign') && (
                          <button
                            onClick={async () => {
                              if (confirm('Are you sure you want to archive this contact from Mailchimp sync?')) {
                                try {
                                  await axios.delete(`${API_BASE_URL}/mailchimp/contacts/${contact.id}`);
                                  toast.success('Contact archived successfully');
                                  fetchEmailContacts();
                                } catch (error) {
                                  toast.error(error.response?.data?.error || 'Failed to archive contact');
                                }
                              }
                            }}
                            className="text-red-600 dark:text-red-400 hover:underline text-sm flex items-center gap-1"
                            title="Archive"
                          >
                            <Archive size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalContactPages > 1 && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing {((contactsPage - 1) * contactsPerPage) + 1} to {Math.min(contactsPage * contactsPerPage, filteredEmailContacts.length)} of {filteredEmailContacts.length} contacts
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setContactsPage(prev => Math.max(1, prev - 1))}
                disabled={contactsPage === 1}
                className="px-3 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm"
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalContactPages }, (_, i) => i + 1)
                  .filter(page => {
                    // Show first page, last page, current page, and pages around current
                    return page === 1 ||
                           page === totalContactPages ||
                           Math.abs(page - contactsPage) <= 1;
                  })
                  .map((page, idx, arr) => {
                    // Add ellipsis if there's a gap
                    const showEllipsisBefore = idx > 0 && page - arr[idx - 1] > 1;
                    return (
                      <div key={page} className="flex items-center gap-1">
                        {showEllipsisBefore && <span className="px-2 text-gray-500">...</span>}
                        <button
                          onClick={() => setContactsPage(page)}
                          className={`px-3 py-1 rounded text-sm ${
                            contactsPage === page
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                          }`}
                        >
                          {page}
                        </button>
                      </div>
                    );
                  })}
              </div>
              <button
                onClick={() => setContactsPage(prev => Math.min(totalContactPages, prev + 1))}
                disabled={contactsPage === totalContactPages}
                className="px-3 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Modals - Rendered outside space-y-6 container to avoid margin issues */}

    <ContactDetailsModal
      contact={selectedContact}
      isOpen={showContactDetailsModal}
      onClose={() => {
        setShowContactDetailsModal(false);
        setSelectedContact(null);
      }}
    />

    <CampaignDetailsModal
      campaign={selectedCampaign}
      isOpen={showCampaignModal}
      onClose={() => {
        setShowCampaignModal(false);
        setSelectedCampaign(null);
      }}
    />

    <CampaignComparisonModal
      campaigns={campaignsToCompare}
      isOpen={showComparisonModal}
      onClose={() => {
        setShowComparisonModal(false);
        setCampaignsToCompare([]);
      }}
    />
    </>
  );
};

export default EmailsEnhanced;
