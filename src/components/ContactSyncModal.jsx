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
  const [mailchimpContacts, setMailchimpContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({ total: 0, synced: 0, errors: 0 });
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0, message: '' });

  useEffect(() => {
    if (isOpen && leadTypeId) {
      setLoading(true);
      setMailchimpContacts([]);
      fetchMailchimpContacts();
      fetchStats();
    }
  }, [isOpen, leadTypeId]);

  const fetchMailchimpContacts = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/mailchimp/contacts`, {
        params: { lead_type_id: leadTypeId }
      });
      setMailchimpContacts(response.data.contacts || []);
    } catch (error) {
      console.error('Failed to fetch Mailchimp contacts:', error);
      toast.error('Failed to load Mailchimp contacts');
    } finally {
      setLoading(false);
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

  const handlePullFromMailchimp = async () => {
    setSyncing(true);
    setSyncProgress({ current: 0, total: 100, message: 'Pulling contacts from Mailchimp...' });

    let progressInterval;
    try {
      // Simulate progress updates - stop at 90% to wait for server response
      progressInterval = setInterval(() => {
        setSyncProgress(prev => {
          const maxProgress = 90;
          if (prev.current >= maxProgress) {
            return {
              ...prev,
              current: maxProgress,
              message: 'Processing contacts...'
            };
          }
          return {
            ...prev,
            current: Math.min(prev.current + 5, maxProgress),
            message: 'Pulling contacts from Mailchimp...'
          };
        });
      }, 500);

      const response = await axios.post(`${API_BASE_URL}/mailchimp/contacts/sync`, {
        lead_type_id: leadTypeId
      });

      clearInterval(progressInterval);
      setSyncProgress({ current: 100, total: 100, message: 'Sync complete!' });

      toast.success(response.data.message);
      await fetchMailchimpContacts();
      await fetchStats();
      if (onSyncComplete) onSyncComplete();

      // Reset progress after a delay
      setTimeout(() => setSyncProgress({ current: 0, total: 0, message: '' }), 2000);
    } catch (error) {
      if (progressInterval) clearInterval(progressInterval);
      console.error('Pull from Mailchimp error:', error);
      toast.error(error.response?.data?.error || 'Failed to pull contacts from Mailchimp');
      setSyncProgress({ current: 0, total: 0, message: '' });
    } finally {
      setSyncing(false);
    }
  };

  const filteredContacts = mailchimpContacts.filter(contact => {
    const searchLower = searchQuery.toLowerCase();
    const mergeFields = contact.merge_fields ? JSON.parse(contact.merge_fields) : {};
    const firstName = mergeFields.FNAME || '';
    const lastName = mergeFields.LNAME || '';
    return (
      firstName.toLowerCase().includes(searchLower) ||
      lastName.toLowerCase().includes(searchLower) ||
      contact.email_address?.toLowerCase().includes(searchLower)
    );
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Users size={24} />
              Mailchimp Contacts
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {leadTypeName} Lead Type - View and sync contacts from Mailchimp
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
          <button
            onClick={handlePullFromMailchimp}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors text-sm whitespace-nowrap"
          >
            <RefreshCw className={syncing ? 'animate-spin' : ''} size={16} />
            Sync Mailchimp {leadTypeName}
          </button>
        </div>

        {/* Contacts List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="animate-spin text-blue-600" size={32} />
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="text-center py-12">
            <Users size={48} className="text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">
              {mailchimpContacts.length === 0
                ? `No Mailchimp contacts synced yet. Click "Sync Mailchimp ${leadTypeName}" to sync.`
                : 'No contacts match your search'}
            </p>
          </div>
        ) : (
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
            <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredContacts.map((contact) => {
                    const mergeFields = contact.merge_fields ? JSON.parse(contact.merge_fields) : {};
                    const firstName = mergeFields.FNAME || '';
                    const lastName = mergeFields.LNAME || '';
                    const fullName = `${firstName} ${lastName}`.trim() || 'N/A';

                    return (
                      <tr key={contact.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 text-gray-900 dark:text-white">
                          {fullName}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                          {contact.email_address}
                        </td>
                        <td className="px-4 py-3">
                          {contact.status === 'subscribed' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full text-xs whitespace-nowrap">
                              <CheckCircle size={12} />
                              Subscribed
                            </span>
                          ) : contact.status === 'unsubscribed' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full text-xs whitespace-nowrap">
                              <XCircle size={12} />
                              Unsubscribed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 rounded-full text-xs whitespace-nowrap">
                              <AlertCircle size={12} />
                              {contact.status}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                          {'⭐'.repeat(contact.member_rating || 0) || 'N/A'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
