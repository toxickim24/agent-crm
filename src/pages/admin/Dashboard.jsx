import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import Logo from '../../components/Logo';
import API_BASE_URL from '../../config/api';
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
  Key,
  Mail,
  Upload,
  X
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
  const [editUserData, setEditUserData] = useState({ name: '', email: '', status: 'active', logo_url_light: null, logo_url_dark: null });
  const [logoLightFile, setLogoLightFile] = useState(null);
  const [logoDarkFile, setLogoDarkFile] = useState(null);
  const [logoLightPreview, setLogoLightPreview] = useState(null);
  const [logoDarkPreview, setLogoDarkPreview] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [leadTypes, setLeadTypes] = useState([]);
  const [showDeleted, setShowDeleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [profileData, setProfileData] = useState({ name: '', email: '' });
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  // Admin users management
  const [admins, setAdmins] = useState([]);
  const [showDeletedAdmins, setShowDeletedAdmins] = useState(false);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [showEditAdmin, setShowEditAdmin] = useState(false);
  const [showChangeAdminPassword, setShowChangeAdminPassword] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [addAdminData, setAddAdminData] = useState({ name: '', email: '', password: '' });
  const [editAdminData, setEditAdminData] = useState({ name: '', email: '', status: 'active' });
  const [adminPasswordData, setAdminPasswordData] = useState({ newPassword: '', confirmPassword: '' });

  // Client creation
  const [showAddClient, setShowAddClient] = useState(false);
  const [addClientData, setAddClientData] = useState({ name: '', email: '', password: '' });

  useEffect(() => {
    fetchClients();
    fetchPendingClients();
    fetchLeadTypes();
    fetchAdmins();
  }, [showDeleted, showDeletedAdmins]);

  const fetchClients = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/users?showDeleted=${showDeleted}`);
      setClients(response.data.users);
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingClients = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/users/pending`);
      setPendingClients(response.data.users);
    } catch (error) {
      console.error('Failed to fetch pending clients:', error);
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

  const handleApprove = async (clientId) => {
    try {
      await axios.post(`${API_BASE_URL}/admin/users/${clientId}/approve`);
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
      await axios.post(`${API_BASE_URL}/admin/users/${clientId}/suspend`);
      fetchClients();
    } catch (error) {
      console.error('Failed to suspend client:', error);
      alert('Failed to suspend client');
    }
  };

  const handleDelete = async (clientId) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    try {
      await axios.delete(`${API_BASE_URL}/admin/users/${clientId}`);
      fetchClients();
      setSelectedClient(null);
      toast.success('User deleted successfully');
    } catch (error) {
      console.error('Failed to delete client:', error);
      toast.error('Failed to delete user');
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
      mailer_import: client.mailer_import ?? true,
      mailer_add: client.mailer_add ?? true,
      mailer_sync_all: client.mailer_sync_all ?? true,
      mailer_view: client.mailer_view ?? true,
      mailer_sync: client.mailer_sync ?? true,
      mailer_start: client.mailer_start ?? true,
      mailer_pause: client.mailer_pause ?? true,
      mailer_end: client.mailer_end ?? true,
      mailer_delete: client.mailer_delete ?? true,
      email_sync_contacts: client.email_sync_contacts ?? true,
      email_sync_campaigns: client.email_sync_campaigns ?? true,
      email_view_campaign: client.email_view_campaign ?? true,
      email_export_csv: client.email_export_csv ?? true,
      email_archive_campaign: client.email_archive_campaign ?? true,
      email_delete_campaign: client.email_delete_campaign ?? true,
      brevo: client.brevo ?? true,
      brevo_view_contacts: client.brevo_view_contacts ?? true,
      brevo_view_lists: client.brevo_view_lists ?? true,
      brevo_view_campaigns: client.brevo_view_campaigns ?? true,
      brevo_view_stats: client.brevo_view_stats ?? true,
      brevo_sync_data: client.brevo_sync_data ?? true,
      brevo_export_csv: client.brevo_export_csv ?? true,
      allowed_lead_types: parsedLeadTypes
    };

    console.log('Initial permissions:', initialPermissions);
    setSelectedClient(client);
    setPermissions(initialPermissions);
  };

  const handleSavePermissions = async () => {
    try {
      console.log('Saving permissions:', permissions);
      await axios.put(`${API_BASE_URL}/admin/users/${selectedClient.id}/permissions`, permissions);
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
      const response = await axios.get(`${API_BASE_URL}/admin/users/${client.id}/api-config`);
      setApiConfig(response.data.config);
    } catch (error) {
      console.error('Failed to fetch API config:', error);
    }
  };

  const handleSaveApiConfig = async () => {
    try {
      await axios.put(`${API_BASE_URL}/admin/users/${selectedClient.id}/api-config`, apiConfig);
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
      status: client.status,
      logo_url_light: client.logo_url_light,
      logo_url_dark: client.logo_url_dark
    });
    // Prepend API_BASE_URL for existing logos to make them absolute URLs
    setLogoLightPreview(client.logo_url_light ? `${API_BASE_URL.replace('/api', '')}${client.logo_url_light}` : null);
    setLogoDarkPreview(client.logo_url_dark ? `${API_BASE_URL.replace('/api', '')}${client.logo_url_dark}` : null);
    setLogoLightFile(null);
    setLogoDarkFile(null);
    setShowEditUser(true);
  };

  const handleSaveUser = async () => {
    try {
      let logoUrlLight = editUserData.logo_url_light;
      let logoUrlDark = editUserData.logo_url_dark;

      setUploadingLogo(true);

      // Upload light mode logo if a new file was selected
      if (logoLightFile) {
        const formData = new FormData();
        formData.append('logo', logoLightFile);
        formData.append('mode', 'light');

        const uploadResponse = await axios.post(
          `${API_BASE_URL}/admin/users/${selectedClient.id}/logo`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          }
        );
        logoUrlLight = uploadResponse.data.logo_url;
      }

      // Upload dark mode logo if a new file was selected
      if (logoDarkFile) {
        const formData = new FormData();
        formData.append('logo', logoDarkFile);
        formData.append('mode', 'dark');

        const uploadResponse = await axios.post(
          `${API_BASE_URL}/admin/users/${selectedClient.id}/logo`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          }
        );
        logoUrlDark = uploadResponse.data.logo_url;
      }

      setUploadingLogo(false);

      // Update user details
      await axios.put(`${API_BASE_URL}/admin/users/${selectedClient.id}`, {
        ...editUserData,
        logo_url_light: logoUrlLight,
        logo_url_dark: logoUrlDark
      });

      fetchClients();
      setShowEditUser(false);
      setSelectedClient(null);
      setLogoLightFile(null);
      setLogoDarkFile(null);
      setLogoLightPreview(null);
      setLogoDarkPreview(null);
      toast.success('User updated successfully');
    } catch (error) {
      console.error('Failed to update user:', error);
      setUploadingLogo(false);
      toast.error(error.response?.data?.error || 'Failed to update user');
    }
  };

  const handleLogoChange = (e, mode) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/svg+xml'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Only image files (JPEG, PNG, GIF, SVG) are allowed');
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        if (mode === 'light') {
          setLogoLightFile(file);
          setLogoLightPreview(reader.result);
        } else {
          setLogoDarkFile(file);
          setLogoDarkPreview(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = async (mode) => {
    if (!selectedClient) return;

    const logoUrl = mode === 'light' ? editUserData.logo_url_light : editUserData.logo_url_dark;

    if (logoUrl) {
      try {
        await axios.delete(`${API_BASE_URL}/admin/users/${selectedClient.id}/logo?mode=${mode}`);
        if (mode === 'light') {
          setEditUserData({ ...editUserData, logo_url_light: null });
          setLogoLightPreview(null);
          setLogoLightFile(null);
        } else {
          setEditUserData({ ...editUserData, logo_url_dark: null });
          setLogoDarkPreview(null);
          setLogoDarkFile(null);
        }
        toast.success(`${mode.charAt(0).toUpperCase() + mode.slice(1)} mode logo removed successfully`);
      } catch (error) {
        console.error('Failed to remove logo:', error);
        toast.error('Failed to remove logo');
      }
    } else {
      if (mode === 'light') {
        setLogoLightPreview(null);
        setLogoLightFile(null);
      } else {
        setLogoDarkPreview(null);
        setLogoDarkFile(null);
      }
    }
  };

  const handleRestoreUser = async (userId) => {
    try {
      await axios.post(`${API_BASE_URL}/admin/users/${userId}/restore`);
      fetchClients();
      toast.success('User restored successfully');
    } catch (error) {
      console.error('Failed to restore user:', error);
      toast.error('Failed to restore user');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleEditProfile = () => {
    setProfileData({ name: user?.name || '', email: user?.email || '' });
    setShowEditProfile(true);
    setShowSettings(false);
  };

  const handleSaveProfile = async () => {
    try {
      await axios.put(`${API_BASE_URL}/auth/profile`, profileData);
      setShowEditProfile(false);
      toast.success('Profile updated successfully');
      // Refresh user data
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error(error.response?.data?.error || 'Failed to update profile');
    }
  };

  const handleOpenChangePassword = () => {
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setShowChangePassword(true);
    setShowSettings(false);
  };

  const handleSavePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    try {
      await axios.post(`${API_BASE_URL}/auth/change-password`, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      setShowChangePassword(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password changed successfully');
    } catch (error) {
      console.error('Failed to change password:', error);
      toast.error(error.response?.data?.error || 'Failed to change password');
    }
  };

  // Admin users management functions
  const fetchAdmins = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/admins?showDeleted=${showDeletedAdmins}`);
      setAdmins(response.data.admins);
    } catch (error) {
      console.error('Failed to fetch admins:', error);
    }
  };

  const handleAddAdmin = async () => {
    if (!addAdminData.name || !addAdminData.email || !addAdminData.password) {
      toast.error('All fields are required');
      return;
    }

    try {
      await axios.post(`${API_BASE_URL}/admin/admins`, addAdminData);
      fetchAdmins();
      setShowAddAdmin(false);
      setAddAdminData({ name: '', email: '', password: '' });
      toast.success('Admin user created successfully');
    } catch (error) {
      console.error('Failed to create admin:', error);
      toast.error(error.response?.data?.error || 'Failed to create admin user');
    }
  };

  const handleEditAdminClick = (admin) => {
    setSelectedAdmin(admin);
    setEditAdminData({
      name: admin.name,
      email: admin.email,
      status: admin.status
    });
    setShowEditAdmin(true);
  };

  const handleSaveAdmin = async () => {
    try {
      await axios.put(`${API_BASE_URL}/admin/admins/${selectedAdmin.id}`, editAdminData);
      fetchAdmins();
      setShowEditAdmin(false);
      setSelectedAdmin(null);
      toast.success('Admin user updated successfully');
    } catch (error) {
      console.error('Failed to update admin:', error);
      toast.error(error.response?.data?.error || 'Failed to update admin user');
    }
  };

  const handleDeleteAdmin = async (adminId) => {
    if (!confirm('Are you sure you want to delete this admin user?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/admin/admins/${adminId}`);
      fetchAdmins();
      toast.success('Admin user deleted successfully');
    } catch (error) {
      console.error('Failed to delete admin:', error);
      toast.error(error.response?.data?.error || 'Failed to delete admin user');
    }
  };

  const handleRestoreAdmin = async (adminId) => {
    try {
      await axios.post(`${API_BASE_URL}/admin/admins/${adminId}/restore`);
      fetchAdmins();
      toast.success('Admin user restored successfully');
    } catch (error) {
      console.error('Failed to restore admin:', error);
      toast.error('Failed to restore admin user');
    }
  };

  const handleChangeAdminPasswordClick = (admin) => {
    setSelectedAdmin(admin);
    setAdminPasswordData({ newPassword: '', confirmPassword: '' });
    setShowChangeAdminPassword(true);
  };

  const handleSaveAdminPassword = async () => {
    if (adminPasswordData.newPassword !== adminPasswordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (!adminPasswordData.newPassword) {
      toast.error('Password is required');
      return;
    }

    try {
      await axios.post(`${API_BASE_URL}/admin/admins/${selectedAdmin.id}/change-password`, {
        newPassword: adminPasswordData.newPassword
      });
      setShowChangeAdminPassword(false);
      setSelectedAdmin(null);
      setAdminPasswordData({ newPassword: '', confirmPassword: '' });
      toast.success('Password changed successfully');
    } catch (error) {
      console.error('Failed to change admin password:', error);
      toast.error(error.response?.data?.error || 'Failed to change password');
    }
  };

  // Client creation function
  const handleAddClient = async () => {
    if (!addClientData.name || !addClientData.email || !addClientData.password) {
      toast.error('All fields are required');
      return;
    }

    try {
      await axios.post(`${API_BASE_URL}/admin/users`, addClientData);
      fetchClients();
      setShowAddClient(false);
      setAddClientData({ name: '', email: '', password: '' });
      toast.success('Client user created successfully');
    } catch (error) {
      console.error('Failed to create client:', error);
      toast.error(error.response?.data?.error || 'Failed to create client user');
    }
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
              onClick={() => navigate('/admin/campaigns')}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
            >
              <Tag size={18} />
              Campaigns
            </button>
            <button
              onClick={() => navigate('/admin/api-keys')}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <Key size={18} />
              API Keys
            </button>
            <button
              onClick={() => navigate('/admin/mailchimp')}
              className="flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg transition-colors"
            >
              <Mail size={18} />
              Mailchimp
            </button>
            <button
              onClick={() => navigate('/admin/brevo-config')}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              <Mail size={18} />
              Brevo
            </button>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>

            {/* Settings Dropdown */}
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
                    onClick={handleEditProfile}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-white"
                  >
                    Edit Profile
                  </button>
                  <button
                    onClick={handleOpenChangePassword}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-white"
                  >
                    Change Password
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Page Title and Description */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Admin Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage users, permissions, and system settings. Monitor client activity and configure integrations.
          </p>
        </div>

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
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showDeleted}
                  onChange={(e) => setShowDeleted(e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">Show Deleted</span>
              </label>
              <button
                onClick={() => setShowAddClient(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Users size={18} />
                Add Client
              </button>
            </div>
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

        {/* Admin Users */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Admin Users</h2>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showDeletedAdmins}
                  onChange={(e) => setShowDeletedAdmins(e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">Show Deleted</span>
              </label>
              <button
                onClick={() => setShowAddAdmin(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Users size={18} />
                Add Admin
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {admins.map((admin) => (
                  <tr key={admin.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${admin.deleted_at ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                      {admin.name}
                      {admin.deleted_at && (
                        <span className="ml-2 text-xs text-red-600 dark:text-red-400">(Deleted)</span>
                      )}
                      {admin.id === user?.id && (
                        <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">(You)</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{admin.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        admin.status === 'active'
                          ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                          : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                      }`}>
                        {admin.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                      {new Date(admin.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3 flex-wrap">
                        {admin.deleted_at ? (
                          <button
                            onClick={() => handleRestoreAdmin(admin.id)}
                            className="text-green-600 dark:text-green-400 hover:underline flex items-center gap-1"
                          >
                            <CheckCircle size={14} />
                            Restore
                          </button>
                        ) : (
                          <>
                            {admin.id !== user?.id && (
                              <>
                                <button
                                  onClick={() => handleEditAdminClick(admin)}
                                  className="text-green-600 dark:text-green-400 hover:underline flex items-center gap-1"
                                >
                                  <Edit size={14} />
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleChangeAdminPasswordClick(admin)}
                                  className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                >
                                  <Key size={14} />
                                  Password
                                </button>
                                <button
                                  onClick={() => handleDeleteAdmin(admin.id)}
                                  className="text-red-600 dark:text-red-400 hover:underline flex items-center gap-1"
                                >
                                  <Trash2 size={14} />
                                  Delete
                                </button>
                              </>
                            )}
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
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-7xl w-full p-4 my-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
              Edit Permissions: {selectedClient.name}
            </h3>

            {/* General Permissions */}
            <div className="mb-3">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">General Permissions</h4>
              <div className="grid grid-cols-6 gap-2">
                {[
                  { key: 'home', label: 'Home' },
                  { key: 'contacts', label: 'Contacts' },
                  { key: 'calls_texts', label: 'Calls & Texts' },
                  { key: 'emails', label: 'Emails (Mailchimp)' },
                  { key: 'brevo', label: 'Emails (Brevo)' },
                  { key: 'mailers', label: 'Mailers' }
                ].map((perm) => (
                  <label key={perm.key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permissions[perm.key]}
                      onChange={(e) => setPermissions({ ...permissions, [perm.key]: e.target.checked })}
                      className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-gray-900 dark:text-white text-sm">
                      {perm.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Contact Granular Permissions */}
            <div className="mb-3">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Contact Permissions</h4>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { key: 'contact_view', label: 'View Contacts' },
                  { key: 'contact_add', label: 'Add Contact' },
                  { key: 'contact_edit', label: 'Edit Contact' },
                  { key: 'contact_delete', label: 'Delete Contact' },
                  { key: 'contact_import', label: 'Import Contacts' },
                  { key: 'contact_export', label: 'Export Contacts' }
                ].map((perm) => (
                  <label key={perm.key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permissions[perm.key] ?? true}
                      onChange={(e) => setPermissions({ ...permissions, [perm.key]: e.target.checked })}
                      className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-gray-900 dark:text-white text-sm">
                      {perm.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Mailers Granular Permissions */}
            <div className="mb-3">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Mailers Permissions</h4>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { key: 'mailer_import', label: 'Import by Lead Type' },
                  { key: 'mailer_add', label: 'Add Contact' },
                  { key: 'mailer_sync_all', label: 'Sync All' },
                  { key: 'mailer_view', label: 'View Details' },
                  { key: 'mailer_sync', label: 'Selective Sync' },
                  { key: 'mailer_start', label: 'Start Sequence' },
                  { key: 'mailer_pause', label: 'Pause Sequence' },
                  { key: 'mailer_end', label: 'End Sequence' },
                  { key: 'mailer_delete', label: 'Delete/Remove' }
                ].map((perm) => (
                  <label key={perm.key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permissions[perm.key] ?? true}
                      onChange={(e) => setPermissions({ ...permissions, [perm.key]: e.target.checked })}
                      className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-gray-900 dark:text-white text-sm">
                      {perm.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Email Granular Permissions */}
            <div className="mb-3">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Email Permissions (Mailchimp)</h4>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { key: 'email_sync_contacts', label: 'Sync Mailchimp Contacts' },
                  { key: 'email_sync_campaigns', label: 'Sync Campaigns' },
                  { key: 'email_view_campaign', label: 'View Campaign Details' },
                  { key: 'email_export_csv', label: 'Export to CSV' },
                  { key: 'email_archive_campaign', label: 'Archive Campaign' },
                  { key: 'email_delete_campaign', label: 'Delete Campaign' }
                ].map((perm) => (
                  <label key={perm.key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permissions[perm.key] ?? true}
                      onChange={(e) => setPermissions({ ...permissions, [perm.key]: e.target.checked })}
                      className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-gray-900 dark:text-white text-sm">
                      {perm.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Brevo Granular Permissions */}
            <div className="mb-3">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Brevo Permissions (Sendinblue)</h4>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { key: 'brevo_view_contacts', label: 'View Contacts' },
                  { key: 'brevo_view_lists', label: 'View Lists' },
                  { key: 'brevo_view_campaigns', label: 'View Campaigns' },
                  { key: 'brevo_view_stats', label: 'View Statistics' },
                  { key: 'brevo_sync_data', label: 'Sync/Refresh Data' },
                  { key: 'brevo_export_csv', label: 'Export to CSV' }
                ].map((perm) => (
                  <label key={perm.key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permissions[perm.key] ?? true}
                      onChange={(e) => setPermissions({ ...permissions, [perm.key]: e.target.checked })}
                      className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-gray-900 dark:text-white text-sm">
                      {perm.label}
                    </span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Note: Editing Brevo API settings is only available to admin users.
              </p>
            </div>

            {/* Lead Type Filter Permissions */}
            <div className="mb-3">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Lead Type Filters</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                Select which lead types this user can access. Leave unchecked to allow all lead types.
              </p>
              <div className="grid grid-cols-6 gap-2">
                {leadTypes.map((leadType) => (
                  <label key={leadType.id} className="flex items-center gap-2 cursor-pointer">
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
                      className="px-2 py-0.5 rounded text-xs font-medium text-white"
                      style={{ backgroundColor: leadType.color }}
                    >
                      {leadType.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-2 mt-3">
              <button
                onClick={handleSavePermissions}
                className="px-6 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
              >
                Save
              </button>
              <button
                onClick={() => setSelectedClient(null)}
                className="px-6 py-1.5 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 rounded text-sm"
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
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">DealMachine (Mailers)</h4>
                <input
                  type="text"
                  placeholder="Bearer Token"
                  value={apiConfig.dealmachine_bearer_token || ''}
                  onChange={(e) => setApiConfig({ ...apiConfig, dealmachine_bearer_token: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-2"
                />
                <input
                  type="text"
                  placeholder="Get Lead URL"
                  value={apiConfig.dealmachine_get_lead || ''}
                  onChange={(e) => setApiConfig({ ...apiConfig, dealmachine_get_lead: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-2"
                />
                <input
                  type="text"
                  placeholder="Mailer Campaign ID"
                  value={apiConfig.mailer_campaign_id || ''}
                  onChange={(e) => setApiConfig({ ...apiConfig, mailer_campaign_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-2"
                />
                <input
                  type="text"
                  placeholder="Start Mail URL"
                  value={apiConfig.dealmachine_start_mail || ''}
                  onChange={(e) => setApiConfig({ ...apiConfig, dealmachine_start_mail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-2"
                />
                <input
                  type="text"
                  placeholder="Pause Mail URL"
                  value={apiConfig.dealmachine_pause_mail || ''}
                  onChange={(e) => setApiConfig({ ...apiConfig, dealmachine_pause_mail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-2"
                />
                <input
                  type="text"
                  placeholder="End Mail URL"
                  value={apiConfig.dealmachine_end_mail || ''}
                  onChange={(e) => setApiConfig({ ...apiConfig, dealmachine_end_mail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Brevo (Sendinblue)</h4>
                <input
                  type="text"
                  placeholder="Brevo API Key"
                  value={apiConfig.brevo_api_key || ''}
                  onChange={(e) => setApiConfig({ ...apiConfig, brevo_api_key: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-2"
                />
                <input
                  type="text"
                  placeholder="Brevo Account Email (optional)"
                  value={apiConfig.brevo_account_email || ''}
                  onChange={(e) => setApiConfig({ ...apiConfig, brevo_account_email: e.target.value })}
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
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Light Mode Logo
                  </label>
                  {logoLightPreview && (
                    <div className="mb-3 relative inline-block">
                      <img
                        src={logoLightPreview}
                        alt="Light mode logo preview"
                        className="h-16 w-auto border border-gray-300 dark:border-gray-600 rounded bg-white p-2"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveLogo('light')}
                        className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <label className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600">
                        <Upload size={18} />
                        <span className="text-sm">{logoLightFile ? logoLightFile.name : 'Choose light mode logo'}</span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleLogoChange(e, 'light')}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Logo for light backgrounds (Max 5MB)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Dark Mode Logo
                  </label>
                  {logoDarkPreview && (
                    <div className="mb-3 relative inline-block">
                      <img
                        src={logoDarkPreview}
                        alt="Dark mode logo preview"
                        className="h-16 w-auto border border-gray-300 dark:border-gray-600 rounded bg-gray-800 p-2"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveLogo('dark')}
                        className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <label className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600">
                        <Upload size={18} />
                        <span className="text-sm">{logoDarkFile ? logoDarkFile.name : 'Choose dark mode logo'}</span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleLogoChange(e, 'dark')}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Logo for dark backgrounds (Max 5MB)
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSaveUser}
                disabled={uploadingLogo}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadingLogo ? 'Uploading Logo...' : 'Save Changes'}
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

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowEditProfile(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Edit Profile
            </h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSaveProfile}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Save Changes
              </button>
              <button
                onClick={() => setShowEditProfile(false)}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowChangePassword(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Change Password
            </h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSavePassword}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Change Password
              </button>
              <button
                onClick={() => setShowChangePassword(false)}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Admin Modal */}
      {showAddAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddAdmin(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Add Admin User
            </h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={addAdminData.name}
                  onChange={(e) => setAddAdminData({ ...addAdminData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={addAdminData.email}
                  onChange={(e) => setAddAdminData({ ...addAdminData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={addAdminData.password}
                  onChange={(e) => setAddAdminData({ ...addAdminData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleAddAdmin}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Create Admin
              </button>
              <button
                onClick={() => {
                  setShowAddAdmin(false);
                  setAddAdminData({ name: '', email: '', password: '' });
                }}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Admin Modal */}
      {showEditAdmin && selectedAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowEditAdmin(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Edit Admin: {selectedAdmin.name}
            </h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={editAdminData.name}
                  onChange={(e) => setEditAdminData({ ...editAdminData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={editAdminData.email}
                  onChange={(e) => setEditAdminData({ ...editAdminData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={editAdminData.status}
                  onChange={(e) => setEditAdminData({ ...editAdminData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSaveAdmin}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Save Changes
              </button>
              <button
                onClick={() => {
                  setShowEditAdmin(false);
                  setSelectedAdmin(null);
                }}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Admin Password Modal */}
      {showChangeAdminPassword && selectedAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowChangeAdminPassword(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Change Password: {selectedAdmin.name}
            </h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={adminPasswordData.newPassword}
                  onChange={(e) => setAdminPasswordData({ ...adminPasswordData, newPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={adminPasswordData.confirmPassword}
                  onChange={(e) => setAdminPasswordData({ ...adminPasswordData, confirmPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSaveAdminPassword}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Change Password
              </button>
              <button
                onClick={() => {
                  setShowChangeAdminPassword(false);
                  setSelectedAdmin(null);
                  setAdminPasswordData({ newPassword: '', confirmPassword: '' });
                }}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Client Modal */}
      {showAddClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddClient(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Add Client User
            </h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={addClientData.name}
                  onChange={(e) => setAddClientData({ ...addClientData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={addClientData.email}
                  onChange={(e) => setAddClientData({ ...addClientData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={addClientData.password}
                  onChange={(e) => setAddClientData({ ...addClientData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleAddClient}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Create Client
              </button>
              <button
                onClick={() => {
                  setShowAddClient(false);
                  setAddClientData({ name: '', email: '', password: '' });
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
