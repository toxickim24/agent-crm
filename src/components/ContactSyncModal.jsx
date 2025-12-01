import { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config/api';
import {
  Users,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader,
  Search
} from 'lucide-react';
import { toast } from 'sonner';

const ContactSyncModal = ({ isOpen, onClose, leadTypeId, leadTypeName, onSyncComplete }) => {
  const [contacts, setContacts] = useState([]);
  const [syncedContacts, setSyncedContacts] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({ total: 0, synced: 0, errors: 0 });
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0, message: '' });

  useEffect(() => {
    if (isOpen && leadTypeId) {
      setLoading(true);
      setContacts([]);
      setSyncedContacts([]);
      fetchContacts();
      fetchSyncedContacts();
      fetchStats();
    }
  }, [isOpen, leadTypeId]);

  const fetchContacts = async () => {
    try {
      // The contacts table stores lead_type as the ID number (e.g., "1", "2", "3")
      // not the name, so we filter by the leadTypeId directly
      const response = await axios.get(`${API_BASE_URL}/contacts`, {
        params: { lead_type: leadTypeId.toString() }
      });
      setContacts(response.data.contacts || []);
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const fetchSyncedContacts = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/mailchimp/contacts`, {
        params: { lead_type_id: leadTypeId }
      });
      setSyncedContacts(response.data.contacts || []);
    } catch (error) {
      console.error('Failed to fetch synced contacts:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/mailchimp/contacts/stats`, {
        params: { lead_type_id: leadTypeId }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleSyncAll = async () => {
    setSyncing(true);
    const totalContacts = contactsWithEmail.length;
    setSyncProgress({ current: 0, total: totalContacts, message: 'Starting sync...' });

    let progressInterval;
    try {
      // Simulate progress updates - stop at 90% to wait for server response
      progressInterval = setInterval(() => {
        setSyncProgress(prev => {
          const maxProgress = Math.floor(prev.total * 0.9); // Stop at 90%
          if (prev.current >= maxProgress) {
            return {
              ...prev,
              current: maxProgress,
              message: 'Processing on server...'
            };
          }
          const increment = Math.ceil(prev.total / 30);
          const newCurrent = Math.min(prev.current + increment, maxProgress);
          return {
            ...prev,
            current: newCurrent,
            message: `Syncing ${newCurrent} of ${prev.total} contacts...`
          };
        });
      }, 300);

      const response = await axios.post(`${API_BASE_URL}/mailchimp/contacts/sync`, {
        lead_type_id: leadTypeId
      });

      clearInterval(progressInterval);
      setSyncProgress({ current: totalContacts, total: totalContacts, message: 'Sync complete!' });

      toast.success(response.data.message);
      await fetchSyncedContacts();
      await fetchStats();
      if (onSyncComplete) onSyncComplete();

      // Reset progress after a delay
      setTimeout(() => setSyncProgress({ current: 0, total: 0, message: '' }), 2000);
    } catch (error) {
      if (progressInterval) clearInterval(progressInterval);
      console.error('Sync error:', error);
      toast.error(error.response?.data?.error || 'Failed to sync contacts');
      setSyncProgress({ current: 0, total: 0, message: '' });
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncSelected = async () => {
    if (selectedContacts.length === 0) {
      toast.error('Please select contacts to sync');
      return;
    }

    setSyncing(true);
    const totalContacts = selectedContacts.length;
    setSyncProgress({ current: 0, total: totalContacts, message: 'Starting sync...' });

    let progressInterval;
    try {
      // Simulate progress updates - stop at 90% to wait for server response
      progressInterval = setInterval(() => {
        setSyncProgress(prev => {
          const maxProgress = Math.floor(prev.total * 0.9); // Stop at 90%
          if (prev.current >= maxProgress) {
            return {
              ...prev,
              current: maxProgress,
              message: 'Processing on server...'
            };
          }
          const increment = Math.ceil(prev.total / 20);
          const newCurrent = Math.min(prev.current + increment, maxProgress);
          return {
            ...prev,
            current: newCurrent,
            message: `Syncing ${newCurrent} of ${prev.total} contacts...`
          };
        });
      }, 200);

      const response = await axios.post(`${API_BASE_URL}/mailchimp/contacts/sync`, {
        lead_type_id: leadTypeId,
        contact_ids: selectedContacts
      });

      clearInterval(progressInterval);
      setSyncProgress({ current: totalContacts, total: totalContacts, message: 'Sync complete!' });

      toast.success(response.data.message);
      await fetchSyncedContacts();
      await fetchStats();
      setSelectedContacts([]);
      if (onSyncComplete) onSyncComplete();

      // Reset progress after a delay
      setTimeout(() => setSyncProgress({ current: 0, total: 0, message: '' }), 2000);
    } catch (error) {
      if (progressInterval) clearInterval(progressInterval);
      console.error('Sync error:', error);
      toast.error(error.response?.data?.error || 'Failed to sync contacts');
      setSyncProgress({ current: 0, total: 0, message: '' });
    } finally {
      setSyncing(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedContacts.length === filteredContacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(filteredContacts.map(c => c.id));
    }
  };

  const toggleSelectContact = (contactId) => {
    if (selectedContacts.includes(contactId)) {
      setSelectedContacts(selectedContacts.filter(id => id !== contactId));
    } else {
      setSelectedContacts([...selectedContacts, contactId]);
    }
  };

  const isSynced = (contactId) => {
    return syncedContacts.some(sc => sc.contact_id === contactId && sc.sync_status === 'synced');
  };

  const getSyncStatus = (contactId) => {
    const synced = syncedContacts.find(sc => sc.contact_id === contactId);
    if (!synced) return null;
    return synced.sync_status;
  };

  const filteredContacts = contacts.filter(contact => {
    const searchLower = searchQuery.toLowerCase();
    return (
      contact.contact_first_name?.toLowerCase().includes(searchLower) ||
      contact.contact_last_name?.toLowerCase().includes(searchLower) ||
      contact.contact_1_email1?.toLowerCase().includes(searchLower)
    );
  });

  const contactsWithEmail = filteredContacts.filter(c => c.contact_1_email1);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full p-6 m-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Users size={24} />
              Sync Mailchimp to Contacts
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {leadTypeName} Lead Type - Pull data from Mailchimp
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <XCircle size={24} className="text-gray-500" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">Total Contacts</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <p className="text-sm text-green-600 dark:text-green-400 mb-1">Synced</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.synced}</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
            <p className="text-sm text-red-600 dark:text-red-400 mb-1">Errors</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.errors}</p>
          </div>
        </div>

        {/* Progress Bar */}
        {syncing && syncProgress.total > 0 && (
          <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-900 dark:text-blue-300">
                {syncProgress.message}
              </span>
              <span className="text-sm text-blue-700 dark:text-blue-400">
                {Math.round((syncProgress.current / syncProgress.total) * 100)}%
              </span>
            </div>
            <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2.5">
              <div
                className="bg-blue-600 dark:bg-blue-500 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSyncSelected}
              disabled={syncing || selectedContacts.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors text-sm"
            >
              <RefreshCw className={syncing ? 'animate-spin' : ''} size={16} />
              Sync Selected ({selectedContacts.length})
            </button>
            <button
              onClick={handleSyncAll}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors text-sm"
            >
              <RefreshCw className={syncing ? 'animate-spin' : ''} size={16} />
              Sync All
            </button>
          </div>
        </div>

        {/* Contacts List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="animate-spin text-blue-600" size={32} />
          </div>
        ) : contactsWithEmail.length === 0 ? (
          <div className="text-center py-12">
            <Users size={48} className="text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">No contacts with email addresses found</p>
          </div>
        ) : (
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedContacts.length === contactsWithEmail.length && contactsWithEmail.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {contactsWithEmail.map((contact) => {
                    const syncStatus = getSyncStatus(contact.id);
                    return (
                      <tr key={contact.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedContacts.includes(contact.id)}
                            onChange={() => toggleSelectContact(contact.id)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-3 text-gray-900 dark:text-white">
                          {contact.contact_first_name} {contact.contact_last_name}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                          {contact.contact_1_email1}
                        </td>
                        <td className="px-4 py-3">
                          {syncStatus === 'synced' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full text-xs">
                              <CheckCircle size={12} />
                              Synced
                            </span>
                          ) : syncStatus === 'error' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-full text-xs">
                              <XCircle size={12} />
                              Error
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full text-xs">
                              <AlertCircle size={12} />
                              Not Synced
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContactSyncModal;
