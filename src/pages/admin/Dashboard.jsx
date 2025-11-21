import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import Logo from '../../components/Logo';
import {
  Users,
  UserCheck,
  UserX,
  Settings as SettingsIcon,
  LogOut,
  Sun,
  Moon,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Tag,
  Key
} from 'lucide-react';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [pendingClients, setPendingClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [showApiConfig, setShowApiConfig] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [apiConfig, setApiConfig] = useState({});
  const [permissions, setPermissions] = useState({});
  const [editUserData, setEditUserData] = useState({ name: '', email: '', status: 'active' });
  const [leadTypes, setLeadTypes] = useState([]);
  const [showDeleted, setShowDeleted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClients();
    fetchPendingClients();
    fetchLeadTypes();
  }, [showDeleted]);

  const fetchClients = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/admin/users?showDeleted=${showDeleted}`);
      setClients(response.data.users);
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingClients = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/admin/users/pending');
      setPendingClients(response.data.users);
    } catch (error) {
      console.error('Failed to fetch pending clients:', error);
    }
  };

  const fetchLeadTypes = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/lead-types');
      setLeadTypes(response.data);
    } catch (error) {
      console.error('Failed to fetch lead types:', error);
    }
  };

  const handleApprove = async (clientId) => {
    try {
      await axios.post(`http://localhost:5000/api/admin/users/${clientId}/approve`);
      fetchClients();
      fetchPendingClients();
    } catch (error) {
      console.error('Failed to approve client:', error);
      alert('Failed to approve client');
    }
  };

  const handleSuspend = async (clientId) => {
    if (!confirm('Are you sure you want to suspend this user?')) return;
    try {
      await axios.post(`http://localhost:5000/api/admin/users/${clientId}/suspend`);
      fetchClients();
    } catch (error) {
      console.error('Failed to suspend client:', error);
      alert('Failed to suspend client');
    }
  };

  const handleDelete = async (clientId) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    try {
      await axios.delete(`http://localhost:5000/api/admin/users/${clientId}`);
      fetchClients();
      setSelectedClient(null);
    } catch (error) {
      console.error('Failed to delete client:', error);
      alert('Failed to delete client');
    }
  };

  const handleEditPermissions = async (client) => {
    console.log('Client data:', client);
    const parsedLeadTypes = client.allowed_lead_types
      ? (typeof client.allowed_lead_types === 'string'
          ? JSON.parse(client.allowed_lead_types)
          : client.allowed_lead_types)
      : null;

    const initialPermissions = {
      home: client.home ?? true,
      contacts: client.contacts ?? true,
      calls_texts: client.calls_texts ?? true,
      emails: client.emails ?? true,
      mailers: client.mailers ?? true,
      contact_view: client.contact_view ?? true,
      contact_add: client.contact_add ?? true,
      contact_edit: client.contact_edit ?? true,
      contact_delete: client.contact_delete ?? true,
      contact_import: client.contact_import ?? true,
      contact_export: client.contact_export ?? true,
      allowed_lead_types: parsedLeadTypes
    };

    console.log('Initial permissions:', initialPermissions);
    setSelectedClient(client);
    setPermissions(initialPermissions);
  };

  const handleSavePermissions = async () => {
    try {
      console.log('Saving permissions:', permissions);
      await axios.put(`http://localhost:5000/api/admin/users/${selectedClient.id}/permissions`, permissions);
      fetchClients();
      setSelectedClient(null);
      alert('Permissions updated successfully');
    } catch (error) {
      console.error('Failed to update permissions:', error);
      alert('Failed to update permissions');
    }
  };

  const handleApiConfig = async (client) => {
    setSelectedClient(client);
    setShowApiConfig(true);
    try {
      const response = await axios.get(`http://localhost:5000/api/admin/users/${client.id}/api-config`);
      setApiConfig(response.data.config);
    } catch (error) {
      console.error('Failed to fetch API config:', error);
    }
  };

  const handleSaveApiConfig = async () => {
    try {
      await axios.put(`http://localhost:5000/api/admin/users/${selectedClient.id}/api-config`, apiConfig);
      setShowApiConfig(false);
      setSelectedClient(null);
      alert('API configuration saved successfully');
    } catch (error) {
      console.error('Failed to save API config:', error);
      alert('Failed to save API configuration');
    }
  };

  const handleEditUser = (client) => {
    setSelectedClient(client);
    setEditUserData({
      name: client.name,
      email: client.email,
      status: client.status
    });
    setShowEditUser(true);
  };

  const handleSaveUser = async () => {
    try {
      await axios.put(`http://localhost:5000/api/admin/users/${selectedClient.id}`, editUserData);
      fetchClients();
      setShowEditUser(false);
      setSelectedClient(null);
      alert('User updated successfully');
    } catch (error) {
      console.error('Failed to update user:', error);
      alert(error.response?.data?.error || 'Failed to update user');
    }
  };

  const handleRestoreUser = async (userId) => {
    try {
      await axios.post(`http://localhost:5000/api/admin/users/${userId}/restore`);
      fetchClients();
      alert('User restored successfully');
    } catch (error) {
      console.error('Failed to restore user:', error);
      alert('Failed to restore user');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-40">
        <div className="flex items-center justify-between px-6 py-3">
          <Logo className="h-8" />
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin/lead-types')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Tag size={18} />
              Lead Types
            </button>
            <button
              onClick={() => navigate('/admin/statuses')}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              <Tag size={18} />
              Statuses
            </button>
            <button
              onClick={() => navigate('/admin/api-keys')}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <Key size={18} />
              API Keys
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">Admin: {user?.name}</span>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                <Users className="text-blue-600 dark:text-blue-400" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Clients</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{clients.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/20">
                <UserCheck className="text-green-600 dark:text-green-400" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Clients</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {clients.filter(c => c.status === 'active').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900/20">
                <UserX className="text-yellow-600 dark:text-yellow-400" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Pending Approval</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{pendingClients.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Clients */}
        {pendingClients.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Pending Approvals</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Registered</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {pendingClients.map((client) => (
                    <tr key={client.id}>
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{client.name}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{client.email}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                        {new Date(client.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleApprove(client.id)}
                          className="flex items-center gap-1 text-green-600 dark:text-green-400 hover:underline"
                        >
                          <CheckCircle size={16} />
                          Approve
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* All Clients */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">All Clients</h2>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showDeleted}
                onChange={(e) => setShowDeleted(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">Show Deleted</span>
            </label>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {clients.map((client) => (
                  <tr key={client.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${client.deleted_at ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                      {client.name}
                      {client.deleted_at && (
                        <span className="ml-2 text-xs text-red-600 dark:text-red-400">(Deleted)</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{client.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        client.status === 'active'
                          ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                          : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                      }`}>
                        {client.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3 flex-wrap">
                        {client.deleted_at ? (
                          <button
                            onClick={() => handleRestoreUser(client.id)}
                            className="text-green-600 dark:text-green-400 hover:underline flex items-center gap-1"
                          >
                            <CheckCircle size={14} />
                            Restore
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEditUser(client)}
                              className="text-green-600 dark:text-green-400 hover:underline flex items-center gap-1"
                            >
                              <Edit size={14} />
                              Edit
                            </button>
                            <button
                              onClick={() => handleEditPermissions(client)}
                              className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                            >
                              <Edit size={14} />
                              Permissions
                            </button>
                            <button
                              onClick={() => handleApiConfig(client)}
                              className="text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                            >
                              <SettingsIcon size={14} />
                              API
                            </button>
                            {client.status === 'active' && (
                              <button
                                onClick={() => handleSuspend(client.id)}
                                className="text-yellow-600 dark:text-yellow-400 hover:underline flex items-center gap-1"
                              >
                                <XCircle size={14} />
                                Suspend
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(client.id)}
                              className="text-red-600 dark:text-red-400 hover:underline flex items-center gap-1"
                            >
                              <Trash2 size={14} />
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Permissions Modal */}
      {selectedClient && !showApiConfig && !showEditUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={() => setSelectedClient(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full p-6 my-8" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              Edit Permissions: {selectedClient.name}
            </h3>

            {/* General Permissions */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">General Permissions</h4>
              <div className="space-y-3">
                {['home', 'contacts', 'calls_texts', 'emails', 'mailers'].map((perm) => (
                  <label key={perm} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permissions[perm]}
                      onChange={(e) => setPermissions({ ...permissions, [perm]: e.target.checked })}
                      className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-gray-900 dark:text-white capitalize">
                      {perm.replace('_', ' & ')}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Contact Granular Permissions */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Contact Permissions</h4>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'contact_view', label: 'View Contacts' },
                  { key: 'contact_add', label: 'Add Contact' },
                  { key: 'contact_edit', label: 'Edit Contact' },
                  { key: 'contact_delete', label: 'Delete Contact' },
                  { key: 'contact_import', label: 'Import Contacts' },
                  { key: 'contact_export', label: 'Export Contacts' }
                ].map((perm) => (
                  <label key={perm.key} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permissions[perm.key] ?? true}
                      onChange={(e) => setPermissions({ ...permissions, [perm.key]: e.target.checked })}
                      className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-gray-900 dark:text-white">
                      {perm.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Lead Type Filter Permissions */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Lead Type Filters</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Select which lead types this user can filter by. Leave unchecked to allow all lead types.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {leadTypes.map((leadType) => (
                  <label key={leadType.id} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permissions.allowed_lead_types === null || permissions.allowed_lead_types?.includes(leadType.id)}
                      onChange={(e) => {
                        const currentTypes = permissions.allowed_lead_types || leadTypes.map(lt => lt.id);
                        let newTypes;
                        if (e.target.checked) {
                          newTypes = [...new Set([...currentTypes, leadType.id])];
                        } else {
                          newTypes = currentTypes.filter(id => id !== leadType.id);
                        }
                        setPermissions({ ...permissions, allowed_lead_types: newTypes.length === leadTypes.length ? null : newTypes });
                      }}
                      className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span
                      className="px-2 py-1 rounded text-sm font-medium text-white"
                      style={{ backgroundColor: leadType.color }}
                    >
                      {leadType.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSavePermissions}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Save
              </button>
              <button
                onClick={() => setSelectedClient(null)}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* API Config Modal */}
      {showApiConfig && selectedClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={() => setShowApiConfig(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full p-6 my-8" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              API Configuration: {selectedClient.name}
            </h3>
            <div className="space-y-4 mb-6">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Aloware (Calls & Texts)</h4>
                <input
                  type="text"
                  placeholder="API Key"
                  value={apiConfig.aloware_api_key || ''}
                  onChange={(e) => setApiConfig({ ...apiConfig, aloware_api_key: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-2"
                />
                <input
                  type="text"
                  placeholder="Account ID"
                  value={apiConfig.aloware_account_id || ''}
                  onChange={(e) => setApiConfig({ ...apiConfig, aloware_account_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Mailchimp (Emails)</h4>
                <input
                  type="text"
                  placeholder="API Key"
                  value={apiConfig.mailchimp_api_key || ''}
                  onChange={(e) => setApiConfig({ ...apiConfig, mailchimp_api_key: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-2"
                />
                <input
                  type="text"
                  placeholder="Server Prefix (e.g., us1)"
                  value={apiConfig.mailchimp_server_prefix || ''}
                  onChange={(e) => setApiConfig({ ...apiConfig, mailchimp_server_prefix: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">DealMachine (Mailers)</h4>
                <input
                  type="text"
                  placeholder="API Key"
                  value={apiConfig.dealmachine_api_key || ''}
                  onChange={(e) => setApiConfig({ ...apiConfig, dealmachine_api_key: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-2"
                />
                <input
                  type="text"
                  placeholder="Account ID"
                  value={apiConfig.dealmachine_account_id || ''}
                  onChange={(e) => setApiConfig({ ...apiConfig, dealmachine_account_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Landing Page</h4>
                <input
                  type="text"
                  placeholder="Landing Page URL"
                  value={apiConfig.landing_page_url || ''}
                  onChange={(e) => setApiConfig({ ...apiConfig, landing_page_url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSaveApiConfig}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Save Configuration
              </button>
              <button
                onClick={() => {
                  setShowApiConfig(false);
                  setSelectedClient(null);
                }}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditUser && selectedClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowEditUser(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Edit User: {selectedClient.name}
            </h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={editUserData.name}
                  onChange={(e) => setEditUserData({ ...editUserData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={editUserData.email}
                  onChange={(e) => setEditUserData({ ...editUserData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={editUserData.status}
                  onChange={(e) => setEditUserData({ ...editUserData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSaveUser}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Save Changes
              </button>
              <button
                onClick={() => {
                  setShowEditUser(false);
                  setSelectedClient(null);
                }}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
