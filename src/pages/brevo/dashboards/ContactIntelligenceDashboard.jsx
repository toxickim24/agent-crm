import { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, TrendingUp, Award, AlertCircle, Search, Eye, X, RefreshCw, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { StatCard, EngagementGauge, ChartCard, AlertBanner, EmptyState } from '../components/Widgets';
import { useAuth } from '../../../contexts/AuthContext';
import API_BASE_URL from '../../../config/api';

const ContactIntelligenceDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [engagementData, setEngagementData] = useState(null);

  // Contacts list state
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTier, setSelectedTier] = useState(''); // '', 'Champion', 'Warm', 'Cold'
  const [selectedContact, setSelectedContact] = useState(null);
  const [lists, setLists] = useState([]); // Brevo lists for mapping list IDs to names

  useEffect(() => {
    fetchContactIntelligence();
    fetchContacts();
    fetchLists();
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [pagination.page, pagination.limit, searchTerm, selectedTier]);

  // Reset to page 1 when search term or tier changes
  useEffect(() => {
    if (searchTerm !== '' || selectedTier !== '') {
      setPagination(prev => ({ ...prev, page: 1 }));
    }
  }, [searchTerm, selectedTier]);

  const fetchContactIntelligence = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch PHASE 3 scoring data (READ-ONLY - no webhooks required)
      const scoresRes = await axios.get(`${API_BASE_URL}/brevo/analytics/contact-scoring`);

      setEngagementData(scoresRes.data);
    } catch (err) {
      console.error('Error fetching contact intelligence:', err);
      setError('Failed to load contact intelligence data');
    } finally {
      setLoading(false);
    }
  };

  const fetchContacts = async () => {
    setContactsLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/brevo/contacts/paginated`, {
        params: {
          page: pagination.page,
          limit: pagination.limit,
          search: searchTerm,
          tier: selectedTier,
        },
      });

      // Debug: Log first contact to see data format
      if (response.data.contacts.length > 0) {
        console.log('Sample contact data:', response.data.contacts[0]);
        console.log('Attributes type:', typeof response.data.contacts[0].attributes);
        console.log('List IDs type:', typeof response.data.contacts[0].list_ids);
      }

      setContacts(response.data.contacts);
      setPagination(prev => ({
        ...prev,
        ...response.data.pagination,
      }));
    } catch (err) {
      console.error('Error fetching contacts:', err);
    } finally {
      setContactsLoading(false);
    }
  };

  const fetchLists = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/brevo/lists`);
      console.log('Fetched Brevo lists:', response.data);
      setLists(response.data.lists || []);
    } catch (err) {
      console.error('Error fetching Brevo lists:', err);
    }
  };

  const getListName = (listId) => {
    if (!listId || lists.length === 0) return null;

    const numericId = parseInt(listId);
    console.log('Getting list name for Brevo List ID:', listId, '(numeric:', numericId, ')');
    console.log('Available lists:', lists.map(l => ({ db_id: l.id, brevo_list_id: l.brevo_list_id, list_name: l.list_name })));

    // ONLY match on brevo_list_id (not the database auto-increment id)
    const list = lists.find(l => parseInt(l.brevo_list_id) === numericId);

    console.log('Found list:', list);
    return list ? list.list_name : null;
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    // Don't call fetchContacts() here - the useEffect will handle it when page changes to 1
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatLists = (listIds) => {
    if (!listIds) return [];

    // If it's already an array, return it
    if (Array.isArray(listIds)) {
      return listIds;
    }

    // If it's a string, try to parse it
    if (typeof listIds === 'string') {
      try {
        return JSON.parse(listIds);
      } catch (error) {
        console.error('Error parsing list IDs:', error, listIds);
        return [];
      }
    }

    return [];
  };

  const formatAttributes = (attributes) => {
    if (!attributes) return {};

    // If it's already an object, return it
    if (typeof attributes === 'object') {
      return attributes;
    }

    // If it's a string, try to parse it
    if (typeof attributes === 'string') {
      try {
        return JSON.parse(attributes);
      } catch (error) {
        console.error('Error parsing attributes:', error, attributes);
        return {};
      }
    }

    return {};
  };

  const handleExportContacts = async () => {
    try {
      setContactsLoading(true);

      // Fetch ALL contacts with current filters
      const response = await axios.get(`${API_BASE_URL}/brevo/contacts/export`, {
        params: {
          search: searchTerm,
          tier: selectedTier,
        },
      });

      const allContacts = response.data.contacts;

      // Convert contacts to CSV
      const headers = ['First Name', 'Last Name', 'Email', 'SMS', 'Score', 'Tier', 'Lists', 'Email Blacklisted', 'SMS Blacklisted', 'Modified (Brevo)'];
      const csvRows = [headers.join(',')];

      allContacts.forEach(contact => {
        const attrs = formatAttributes(contact.attributes);
        const row = [
          attrs.FIRSTNAME || attrs.firstname || '',
          attrs.LASTNAME || attrs.lastname || '',
          contact.email,
          attrs.SMS || attrs.sms || attrs.PHONE || attrs.phone || '',
          contact.score,
          contact.tier,
          formatLists(contact.list_ids).length,
          contact.email_blacklisted ? 'Yes' : 'No',
          contact.sms_blacklisted ? 'Yes' : 'No',
          formatDate(contact.modified_at_brevo)
        ];
        csvRows.push(row.join(','));
      });

      // Download CSV
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      const tierSuffix = selectedTier ? `-${selectedTier.toLowerCase()}` : '';
      a.href = url;
      a.download = `brevo-contacts${tierSuffix}-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting contacts:', error);
      alert('Failed to export contacts. Please try again.');
    } finally {
      setContactsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-600 dark:text-gray-400">Loading contact intelligence...</div>
      </div>
    );
  }

  if (error) {
    return (
      <AlertBanner type="error" message={error} />
    );
  }

  if (!engagementData) {
    return (
      <EmptyState
        icon={<Users size={48} />}
        title="No Contact Data"
        description="Sync your Brevo contacts to see engagement insights and intelligence."
      />
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Contacts"
          value={engagementData.totalContacts?.toLocaleString() || '0'}
          icon={<Users className="text-blue-500" />}
        />
        <StatCard
          title="Champions"
          value={engagementData.tiers?.champion || '0'}
          icon={<Award className="text-green-500" />}
          trend="up"
          trendValue={`${engagementData.tiersPercent?.champion || 0}%`}
        />
        <StatCard
          title="Average Score"
          value={engagementData.avgScore || '0'}
          icon={<TrendingUp className="text-blue-500" />}
        />
        <StatCard
          title="Blacklisted"
          value={engagementData.blacklistedCount || '0'}
          icon={<AlertCircle className="text-red-500" />}
          trend="down"
          trendValue={`${engagementData.blacklistedPercent || 0}%`}
        />
      </div>

      {/* Engagement Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <ChartCard title="Engagement Score">
            <div className="flex justify-center">
              <EngagementGauge score={engagementData.avgScore || 0} size={160} label="Average Score" />
            </div>
          </ChartCard>
        </div>

        <div className="lg:col-span-2">
          <ChartCard title="Engagement Tiers (Phase 3 Scoring)">
            <div className="grid grid-cols-3 gap-4">
              {[
                { name: 'Champion (80-100)', count: engagementData.tiers?.champion || 0, color: 'bg-green-500', desc: 'Highly engaged, multi-list, recent activity' },
                { name: 'Warm (40-79)', count: engagementData.tiers?.warm || 0, color: 'bg-orange-500', desc: 'Active contact, good profile' },
                { name: 'Cold (0-39)', count: engagementData.tiers?.cold || 0, color: 'bg-gray-500', desc: 'Blacklisted or stale contact' }
              ].map((tier, index) => (
                <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-3 h-3 rounded-full ${tier.color}`} />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{tier.name}</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                    {tier.count}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{tier.desc}</p>
                </div>
              ))}
            </div>

            {/* Scoring methodology note */}
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
              <p className="text-xs text-blue-800 dark:text-blue-200">
                <strong>Scoring Factors:</strong> Recent activity (modified_at), Email deliverability, List membership, Profile completeness
              </p>
            </div>
          </ChartCard>
        </div>
      </div>

      {/* ALL CONTACTS LIST WITH PAGINATION */}
      <ChartCard title="All Contacts">
        {/* Tier Filter Buttons */}
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter by Tier:</span>
          <div className="flex gap-2">
            {[
              { value: '', label: 'All', count: engagementData.totalContacts },
              { value: 'Champion', label: 'Champion', count: engagementData.tiers?.champion || 0 },
              { value: 'Warm', label: 'Warm', count: engagementData.tiers?.warm || 0 },
              { value: 'Cold', label: 'Cold', count: engagementData.tiers?.cold || 0 }
            ].map((tier) => (
              <button
                key={tier.value}
                onClick={() => {
                  setSelectedTier(tier.value);
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedTier === tier.value
                    ? tier.value === 'Champion'
                      ? 'bg-green-600 text-white'
                      : tier.value === 'Warm'
                      ? 'bg-orange-600 text-white'
                      : tier.value === 'Cold'
                      ? 'bg-gray-600 text-white'
                      : 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {tier.label} ({tier.count})
              </button>
            ))}
          </div>
        </div>

        {/* Search and Controls */}
        <div className="mb-4 flex items-center justify-between gap-4">
          <form onSubmit={handleSearch} className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search by email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </form>

          <div className="flex items-center gap-2">
            <select
              value={pagination.limit}
              onChange={(e) => setPagination(prev => ({ ...prev, limit: parseInt(e.target.value), page: 1 }))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            {user?.brevo_export_data && (
              <button
                onClick={handleExportContacts}
                disabled={contactsLoading || contacts.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 transition-colors"
                title="Export to CSV"
              >
                <Download size={18} />
                Export
              </button>
            )}
            <button
              onClick={fetchContacts}
              disabled={contactsLoading}
              className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={contactsLoading ? 'animate-spin' : ''} size={18} />
            </button>
          </div>
        </div>

        {/* Contacts Table */}
        {contactsLoading ? (
          <div className="text-center py-8 text-gray-600 dark:text-gray-400">
            Loading contacts...
          </div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-8 text-gray-600 dark:text-gray-400">
            No contacts found
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">First Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Last Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">SMS</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Score</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Tier</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Lists</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Email Blacklisted</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">SMS Blacklisted</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Modified (Brevo)</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {contacts.map((contact) => {
                    const attrs = formatAttributes(contact.attributes);
                    return (
                      <tr key={contact.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{attrs.FIRSTNAME || attrs.firstname || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{attrs.LASTNAME || attrs.lastname || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{contact.email}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{attrs.SMS || attrs.sms || attrs.PHONE || attrs.phone || '-'}</td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-bold text-gray-900 dark:text-white">{contact.score}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            contact.tier === 'Champion'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : contact.tier === 'Warm'
                              ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {contact.tier}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {formatLists(contact.list_ids).length || 0} lists
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            contact.email_blacklisted
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          }`}>
                            {contact.email_blacklisted ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            contact.sms_blacklisted
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          }`}>
                            {contact.sms_blacklisted ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{formatDate(contact.modified_at_brevo)}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setSelectedContact(contact)}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition-colors"
                          >
                            <Eye size={14} />
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="mt-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} contacts
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={!pagination.hasPrev}
                  className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={!pagination.hasNext}
                  className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </>
        )}
      </ChartCard>
      </div>

      {/* Contact Detail Modal */}
      {selectedContact && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Contact Details</h3>
              <button
                onClick={() => setSelectedContact(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="px-6 py-4 space-y-4">
              {/* Email */}
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</label>
                <p className="text-base text-gray-900 dark:text-white font-medium">{selectedContact.email}</p>
              </div>

              {/* Brevo Contact ID */}
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Brevo Contact ID</label>
                <p className="text-base text-gray-900 dark:text-white">{selectedContact.brevo_contact_id}</p>
              </div>

              {/* Engagement Score and Tier */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Engagement Score</label>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{selectedContact.score}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Out of 100</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Engagement Tier</label>
                  <p className="mt-1">
                    <span className={`px-3 py-1 rounded text-sm font-medium ${
                      selectedContact.tier === 'Champion'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : selectedContact.tier === 'Warm'
                        ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {selectedContact.tier}
                    </span>
                  </p>
                </div>
              </div>

              {/* Lists */}
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Lists</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {formatLists(selectedContact.list_ids).length > 0 ? (
                    formatLists(selectedContact.list_ids).map((listId, idx) => {
                      const listName = getListName(listId);
                      return (
                        <span key={idx} className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-sm">
                          {listName ? `${listName} (List #${listId})` : `List #${listId}`}
                        </span>
                      );
                    })
                  ) : (
                    <span className="text-gray-600 dark:text-gray-400">No lists</span>
                  )}
                </div>
              </div>

              {/* Attributes */}
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Custom Attributes
                  <span className="ml-1 text-xs font-normal">(e.g., phone, company, source)</span>
                </label>
                <div className="mt-2 bg-gray-50 dark:bg-gray-900 rounded-lg p-3 max-h-60 overflow-y-auto">
                  {(() => {
                    const attrs = formatAttributes(selectedContact.attributes);
                    const hasAttributes = Object.keys(attrs).length > 0;

                    return hasAttributes ? (
                      <pre className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                        {JSON.stringify(attrs, null, 2)}
                      </pre>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                        No custom attributes set for this contact in Brevo
                      </p>
                    );
                  })()}
                </div>
              </div>

              {/* Blacklist Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Email Blacklisted</label>
                  <p className="text-base text-gray-900 dark:text-white">
                    <span className={`px-2 py-1 rounded text-sm font-medium ${
                      selectedContact.email_blacklisted
                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    }`}>
                      {selectedContact.email_blacklisted ? 'Yes' : 'No'}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">SMS Blacklisted</label>
                  <p className="text-base text-gray-900 dark:text-white">
                    <span className={`px-2 py-1 rounded text-sm font-medium ${
                      selectedContact.sms_blacklisted
                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    }`}>
                      {selectedContact.sms_blacklisted ? 'Yes' : 'No'}
                    </span>
                  </p>
                </div>
              </div>

              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Created (Brevo)</label>
                  <p className="text-base text-gray-900 dark:text-white">{formatDate(selectedContact.created_at_brevo)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Modified (Brevo)</label>
                  <p className="text-base text-gray-900 dark:text-white">{formatDate(selectedContact.modified_at_brevo)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Created (Local)</label>
                  <p className="text-base text-gray-900 dark:text-white">{formatDate(selectedContact.created_at)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Synced</label>
                  <p className="text-base text-gray-900 dark:text-white">{formatDate(selectedContact.last_synced_at)}</p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end">
              <button
                onClick={() => setSelectedContact(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ContactIntelligenceDashboard;
