import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import Logo from '../../components/Logo';
import API_BASE_URL from '../../config/api';
import {
  Plus,
  Edit,
  Trash2,
  LogOut,
  Sun,
  Moon,
  Tag,
  ArrowLeft,
  RotateCcw
} from 'lucide-react';

const LeadTypes = () => {
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [leadTypes, setLeadTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [editingLeadType, setEditingLeadType] = useState(null);
  const [formData, setFormData] = useState({ name: '', color: '#3B82F6' });

  useEffect(() => {
    fetchLeadTypes();
  }, [showDeleted]);

  const fetchLeadTypes = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/lead-types?showDeleted=${showDeleted}`);
      setLeadTypes(response.data);
    } catch (error) {
      console.error('Failed to fetch lead types:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingLeadType) {
        await axios.put(`${API_BASE_URL}/lead-types/${editingLeadType.id}`, formData);
      } else {
        await axios.post(`${API_BASE_URL}/lead-types`, formData);
      }
      fetchLeadTypes();
      setShowModal(false);
      setFormData({ name: '', color: '#3B82F6' });
      setEditingLeadType(null);
    } catch (error) {
      console.error('Failed to save lead type:', error);
      alert(error.response?.data?.error || 'Failed to save lead type');
    }
  };

  const handleEdit = (leadType) => {
    setEditingLeadType(leadType);
    setFormData({ name: leadType.name, color: leadType.color });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this lead type?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/lead-types/${id}`);
      fetchLeadTypes();
    } catch (error) {
      console.error('Failed to delete lead type:', error);
      alert(error.response?.data?.error || 'Failed to delete lead type');
    }
  };

  const handleRestore = async (id) => {
    try {
      await axios.post(`${API_BASE_URL}/lead-types/${id}/restore`);
      fetchLeadTypes();
      alert('Lead type restored successfully');
    } catch (error) {
      console.error('Failed to restore lead type:', error);
      alert(error.response?.data?.error || 'Failed to restore lead type');
    }
  };

  const openAddModal = () => {
    setEditingLeadType(null);
    setFormData({ name: '', color: '#3B82F6' });
    setShowModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-40">
        <div className="flex items-center justify-between px-6 py-3">
          <Logo className="h-8" />
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
            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Lead Types Management</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Manage lead types and customize their colors</p>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            Add Lead Type
          </button>
        </div>

        {/* Lead Types List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Lead Types</h2>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Color
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Preview
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Created At
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                      Loading...
                    </td>
                  </tr>
                ) : leadTypes.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      No lead types found. Create one to get started.
                    </td>
                  </tr>
                ) : (
                  leadTypes.map((leadType) => (
                    <tr key={leadType.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${leadType.deleted_at ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 font-medium text-gray-900 dark:text-white">
                          <Tag size={16} />
                          {leadType.name}
                          {leadType.deleted_at && (
                            <span className="ml-2 text-xs text-red-600 dark:text-red-400">(Deleted)</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <code className="text-sm text-gray-600 dark:text-gray-400">{leadType.color}</code>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className="px-3 py-1 rounded-full text-white text-sm font-medium"
                          style={{ backgroundColor: leadType.color }}
                        >
                          {leadType.name}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {new Date(leadType.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-3">
                          {leadType.deleted_at ? (
                            <button
                              onClick={() => handleRestore(leadType.id)}
                              className="text-green-600 dark:text-green-400 hover:underline flex items-center gap-1"
                            >
                              <RotateCcw size={14} />
                              Restore
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEdit(leadType)}
                                className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                              >
                                <Edit size={14} />
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(leadType.id)}
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 w-full max-w-md`}>
            <h2 className="text-xl font-bold mb-4">
              {editingLeadType ? 'Edit Lead Type' : 'Add Lead Type'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600'
                      : 'bg-white border-gray-300'
                  }`}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="h-10 w-20 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className={`flex-1 px-3 py-2 border rounded-lg ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600'
                        : 'bg-white border-gray-300'
                    }`}
                    pattern="^#[0-9A-Fa-f]{6}$"
                    placeholder="#3B82F6"
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Preview</label>
                <span
                  className="inline-block px-4 py-2 rounded-full text-white font-medium"
                  style={{ backgroundColor: formData.color }}
                >
                  {formData.name || 'Sample'}
                </span>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingLeadType(null);
                    setFormData({ name: '', color: '#3B82F6' });
                  }}
                  className={`px-4 py-2 rounded-lg ${
                    theme === 'dark'
                      ? 'bg-gray-700 hover:bg-gray-600'
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingLeadType ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadTypes;
