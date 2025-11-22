import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import API_BASE_URL from '../../config/api';
import {
  Search,
  Plus,
  Eye,
  Mail,
  Phone as PhoneIcon,
  X,
  Edit,
  Trash2,
  Upload,
  Download,
  MapPin,
  DollarSign,
  Calendar,
  Home,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  CheckSquare,
  Square
} from 'lucide-react';

const Contacts = () => {
  const { user } = useAuth();

  // Permission checks with error handling
  const canView = Boolean(user?.contact_view ?? true);
  const canAdd = Boolean(user?.contact_add ?? true);
  const canEdit = Boolean(user?.contact_edit ?? true);
  const canDelete = Boolean(user?.contact_delete ?? true);
  const canImport = Boolean(user?.contact_import ?? true);
  const canExport = Boolean(user?.contact_export ?? true);

  let allowedLeadTypes = null;
  try {
    if (user?.allowed_lead_types) {
      // Check if it's already an object or a string
      allowedLeadTypes = typeof user.allowed_lead_types === 'string'
        ? JSON.parse(user.allowed_lead_types)
        : user.allowed_lead_types;
    }
  } catch (error) {
    console.error('Error parsing allowed_lead_types:', error);
    allowedLeadTypes = null;
  }

  console.log('User permissions:', {
    canView,
    canAdd,
    canEdit,
    canDelete,
    canImport,
    canExport,
    allowedLeadTypes,
    rawUser: user
  });

  const [contacts, setContacts] = useState([]);
  const [leadTypes, setLeadTypes] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContact, setSelectedContact] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDeletedView, setShowDeletedView] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedLeadTypeFilter, setSelectedLeadTypeFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);
  const [deletedContacts, setDeletedContacts] = useState([]);
  const [selectedDeletedIds, setSelectedDeletedIds] = useState([]);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Drag scrolling for main table
  const mainTableRef = useRef(null);
  const [isMainDragging, setIsMainDragging] = useState(false);
  const [mainStartX, setMainStartX] = useState(0);
  const [mainScrollLeft, setMainScrollLeft] = useState(0);

  // Drag scrolling for deleted table
  const deletedTableRef = useRef(null);
  const [isDeletedDragging, setIsDeletedDragging] = useState(false);
  const [deletedStartX, setDeletedStartX] = useState(0);
  const [deletedScrollLeft, setDeletedScrollLeft] = useState(0);

  // Main table drag handlers
  const handleMainMouseDown = (e) => {
    if (!mainTableRef.current) return;
    setIsMainDragging(true);
    setMainStartX(e.pageX - mainTableRef.current.offsetLeft);
    setMainScrollLeft(mainTableRef.current.scrollLeft);
    mainTableRef.current.style.cursor = 'grabbing';
    mainTableRef.current.style.userSelect = 'none';
  };

  const handleMainMouseUp = () => {
    if (!mainTableRef.current) return;
    setIsMainDragging(false);
    mainTableRef.current.style.cursor = 'grab';
    mainTableRef.current.style.userSelect = 'auto';
  };

  const handleMainMouseMove = (e) => {
    if (!isMainDragging || !mainTableRef.current) return;
    e.preventDefault();
    const x = e.pageX - mainTableRef.current.offsetLeft;
    const walk = (x - mainStartX) * 2;
    mainTableRef.current.scrollLeft = mainScrollLeft - walk;
  };

  const handleMainMouseLeave = () => {
    if (!mainTableRef.current) return;
    setIsMainDragging(false);
    mainTableRef.current.style.cursor = 'grab';
    mainTableRef.current.style.userSelect = 'auto';
  };

  // Deleted table drag handlers
  const handleDeletedMouseDown = (e) => {
    if (!deletedTableRef.current) return;
    setIsDeletedDragging(true);
    setDeletedStartX(e.pageX - deletedTableRef.current.offsetLeft);
    setDeletedScrollLeft(deletedTableRef.current.scrollLeft);
    deletedTableRef.current.style.cursor = 'grabbing';
    deletedTableRef.current.style.userSelect = 'none';
  };

  const handleDeletedMouseUp = () => {
    if (!deletedTableRef.current) return;
    setIsDeletedDragging(false);
    deletedTableRef.current.style.cursor = 'grab';
    deletedTableRef.current.style.userSelect = 'auto';
  };

  const handleDeletedMouseMove = (e) => {
    if (!isDeletedDragging || !deletedTableRef.current) return;
    e.preventDefault();
    const x = e.pageX - deletedTableRef.current.offsetLeft;
    const walk = (x - deletedStartX) * 2;
    deletedTableRef.current.scrollLeft = deletedScrollLeft - walk;
  };

  const handleDeletedMouseLeave = () => {
    if (!deletedTableRef.current) return;
    setIsDeletedDragging(false);
    deletedTableRef.current.style.cursor = 'grab';
    deletedTableRef.current.style.userSelect = 'auto';
  };

  useEffect(() => {
    fetchContacts();
    fetchLeadTypes();
  }, []);

  useEffect(() => {
    if (showDeletedView) {
      fetchDeletedContacts();
    }
  }, [showDeletedView]);

  useEffect(() => {
    let filtered = contacts.filter(contact =>
      contact.contact_1_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.contact_1_email1?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.contact_1_phone1?.includes(searchTerm) ||
      contact.property_address_full?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Filter by lead type
    if (selectedLeadTypeFilter !== 'all') {
      filtered = filtered.filter(contact => contact.lead_type == selectedLeadTypeFilter);
    }

    setFilteredContacts(filtered);
  }, [searchTerm, contacts, selectedLeadTypeFilter]);

  // Reset to page 1 only when search or filter changes, not when contacts update
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedLeadTypeFilter]);

  // Pagination calculations
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentContacts = filteredContacts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredContacts.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const fetchContacts = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/contacts`);
      setContacts(response.data.contacts);
      setFilteredContacts(response.data.contacts);
      setSelectedIds([]); // Clear selection when refreshing
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeletedContacts = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/contacts?showDeleted=true`);
      const deleted = response.data.contacts.filter(c => c.deleted_at);
      setDeletedContacts(deleted);
      setSelectedDeletedIds([]);
    } catch (error) {
      console.error('Failed to fetch deleted contacts:', error);
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

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/contacts/${id}`);
      fetchContacts();
      setSelectedContact(null);
      toast.success('Contact deleted successfully!');
    } catch (error) {
      console.error('Failed to delete contact:', error);
      toast.error('Failed to delete contact');
    }
  };

  const handleEdit = (contact) => {
    setEditingContact(contact);
    setShowEditModal(true);
  };

  const handleRestore = async (id) => {
    try {
      await axios.post(`${API_BASE_URL}/contacts/${id}/restore`);
      fetchContacts();
      fetchDeletedContacts();
      setSelectedContact(null);
      toast.success('Contact restored successfully!');
    } catch (error) {
      console.error('Failed to restore contact:', error);
      toast.error('Failed to restore contact');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} contact(s)?`)) return;
    try {
      await axios.post(`${API_BASE_URL}/contacts/bulk-delete`, { ids: selectedIds });
      fetchContacts();
      toast.success(`Successfully deleted ${selectedIds.length} contact(s)`);
    } catch (error) {
      console.error('Failed to delete contacts:', error);
      toast.error('Failed to delete contacts');
    }
  };

  const handleBulkExport = () => {
    if (selectedIds.length === 0) return;

    // Get selected contacts
    const contactsToExport = contacts.filter(c => selectedIds.includes(c.id));

    // Prepare CSV data
    const headers = [
      'Lead ID',
      'Property Address',
      'City',
      'State',
      'Zipcode',
      'County',
      'Estimated Value',
      'Property Type',
      'Sale Date',
      'Contact Name',
      'Contact Phone',
      'Contact Email',
      'Lead Type',
      'Status',
      'Created At',
      'Updated At'
    ];

    const csvRows = [headers.join(',')];

    contactsToExport.forEach(contact => {
      const row = [
        contact.lead_id || '',
        `"${contact.property_address_full || ''}"`,
        contact.property_address_city || '',
        contact.property_address_state || '',
        contact.property_address_zipcode || '',
        contact.property_address_county || '',
        contact.estimated_value || '',
        contact.property_type || '',
        contact.sale_date || '',
        `"${contact.contact_1_name || ''}"`,
        contact.contact_1_phone1 || '',
        contact.contact_1_email1 || '',
        contact.lead_type_name || '',
        contact.status_name || '',
        contact.created_at || '',
        contact.updated_at || ''
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `selected_contacts_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success(`Exported ${contactsToExport.length} contact(s) successfully!`);
  };

  const handlePermanentDelete = async (id) => {
    if (!confirm('Are you sure you want to permanently delete this contact? This action cannot be undone.')) return;
    try {
      await axios.delete(`${API_BASE_URL}/contacts/${id}/permanent`);
      fetchDeletedContacts();
      toast.success('Contact permanently deleted');
    } catch (error) {
      console.error('Failed to permanently delete contact:', error);
      toast.error('Failed to permanently delete contact');
    }
  };

  const handleBulkPermanentDelete = async () => {
    if (selectedDeletedIds.length === 0) return;
    if (!confirm(`Are you sure you want to permanently delete ${selectedDeletedIds.length} contact(s)? This action cannot be undone.`)) return;
    try {
      const promises = selectedDeletedIds.map(id =>
        axios.delete(`${API_BASE_URL}/contacts/${id}/permanent`)
      );
      await Promise.all(promises);
      fetchDeletedContacts();
      toast.success(`Successfully deleted ${selectedDeletedIds.length} contact(s) permanently`);
    } catch (error) {
      console.error('Failed to permanently delete contacts:', error);
      toast.error('Failed to permanently delete contacts');
    }
  };

  const handleEmptyDeleted = async () => {
    if (deletedContacts.length === 0) return;
    if (!confirm(`Are you sure you want to permanently delete all ${deletedContacts.length} deleted contact(s)? This action cannot be undone.`)) return;
    try {
      const promises = deletedContacts.map(contact =>
        axios.delete(`${API_BASE_URL}/contacts/${contact.id}/permanent`)
      );
      await Promise.all(promises);
      fetchDeletedContacts();
      toast.success(`Successfully emptied ${deletedContacts.length} deleted contact(s)`);
    } catch (error) {
      console.error('Failed to empty deleted contacts:', error);
      toast.error('Failed to empty deleted contacts');
    }
  };

  const toggleSelection = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(selectedId => selectedId !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === currentContacts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(currentContacts.map(c => c.id));
    }
  };

  const toggleDeletedSelection = (id) => {
    setSelectedDeletedIds(prev =>
      prev.includes(id) ? prev.filter(selectedId => selectedId !== id) : [...prev, id]
    );
  };

  const toggleSelectAllDeleted = () => {
    if (selectedDeletedIds.length === deletedContacts.length) {
      setSelectedDeletedIds([]);
    } else {
      setSelectedDeletedIds(deletedContacts.map(c => c.id));
    }
  };

  // Export Contacts Modal Component
  const ExportContactsModal = ({ onClose }) => {
    const [exportLeadType, setExportLeadType] = useState('all');

    const handleExport = () => {
      let contactsToExport = contacts;

      // Filter by lead type if not "all"
      if (exportLeadType !== 'all') {
        contactsToExport = contacts.filter(c => c.lead_type == exportLeadType);
      }

      // Prepare CSV data
      const headers = [
        'Lead ID',
        'Property Address',
        'City',
        'State',
        'Zipcode',
        'County',
        'Estimated Value',
        'Property Type',
        'Sale Date',
        'Contact Name',
        'Contact Phone',
        'Contact Email',
        'Lead Type',
        'Status',
        'Created At',
        'Updated At'
      ];

      const csvRows = [headers.join(',')];

      contactsToExport.forEach(contact => {
        const row = [
          contact.lead_id || '',
          `"${contact.property_address_full || ''}"`,
          contact.property_address_city || '',
          contact.property_address_state || '',
          contact.property_address_zipcode || '',
          contact.property_address_county || '',
          contact.estimated_value || '',
          contact.property_type || '',
          contact.sale_date || '',
          `"${contact.contact_1_name || ''}"`,
          contact.contact_1_phone1 || '',
          contact.contact_1_email1 || '',
          contact.lead_type_name || '',
          contact.status_name || '',
          contact.created_at || '',
          contact.updated_at || ''
        ];
        csvRows.push(row.join(','));
      });

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contacts_${exportLeadType}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success(`Exported ${contactsToExport.length} contacts successfully!`);
      onClose();
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Export Contacts</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <X size={20} />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Select Lead Type to Export</label>
              <select
                value={exportLeadType}
                onChange={(e) => setExportLeadType(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="all">All Lead Types ({contacts.length} contacts)</option>
                {leadTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name} ({contacts.filter(c => c.lead_type == type.id).length} contacts)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Download size={20} />
                Export CSV
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Add Contact Modal Component
  const AddContactModal = ({ onClose, onSuccess }) => {
    const [statuses, setStatuses] = useState([]);

    // Fetch statuses on component mount
    useEffect(() => {
      const fetchStatuses = async () => {
        try {
          const response = await axios.get(`${API_BASE_URL}/statuses`);
          setStatuses(response.data);
          // Set default status_id to "New" if available
          const newStatus = response.data.find(s => s.name.toLowerCase() === 'new');
          if (newStatus) {
            setFormData(prev => ({ ...prev, status_id: newStatus.id }));
          }
        } catch (error) {
          console.error('Failed to fetch statuses:', error);
        }
      };
      fetchStatuses();
    }, []);

    const [formData, setFormData] = useState({
      lead_id: '',
      property_address_full: '',
      property_address_city: '',
      property_address_state: '',
      property_address_zipcode: '',
      property_address_county: '',
      estimated_value: '',
      property_type: '',
      sale_date: '',
      contact_1_name: '',
      contact_1_phone1: '',
      contact_1_email1: '',
      lead_type: '',
      status_id: ''
    });

    const handleSubmit = async (e) => {
      e.preventDefault();
      try {
        await axios.post(`${API_BASE_URL}/contacts`, formData);
        onSuccess();
        toast.success('Contact created successfully!');
        onClose();
      } catch (error) {
        console.error('Failed to create contact:', error);
        toast.error(error.response?.data?.error || 'Failed to create contact');
      }
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Add New Contact</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Contact Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Contact Name *</label>
                  <input
                    type="text"
                    value={formData.contact_1_name}
                    onChange={(e) => setFormData({ ...formData, contact_1_name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Phone</label>
                  <input
                    type="tel"
                    value={formData.contact_1_phone1}
                    onChange={(e) => setFormData({ ...formData, contact_1_phone1: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.contact_1_email1}
                    onChange={(e) => setFormData({ ...formData, contact_1_email1: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Lead ID</label>
                  <input
                    type="text"
                    value={formData.lead_id}
                    onChange={(e) => setFormData({ ...formData, lead_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
              </div>
            </div>

            {/* Property Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Property Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Full Address</label>
                  <input
                    type="text"
                    value={formData.property_address_full}
                    onChange={(e) => setFormData({ ...formData, property_address_full: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">City</label>
                  <input
                    type="text"
                    value={formData.property_address_city}
                    onChange={(e) => setFormData({ ...formData, property_address_city: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">State</label>
                  <input
                    type="text"
                    value={formData.property_address_state}
                    onChange={(e) => setFormData({ ...formData, property_address_state: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Zipcode</label>
                  <input
                    type="text"
                    value={formData.property_address_zipcode}
                    onChange={(e) => setFormData({ ...formData, property_address_zipcode: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">County</label>
                  <input
                    type="text"
                    value={formData.property_address_county}
                    onChange={(e) => setFormData({ ...formData, property_address_county: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Estimated Value</label>
                  <input
                    type="number"
                    value={formData.estimated_value}
                    onChange={(e) => setFormData({ ...formData, estimated_value: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Property Type</label>
                  <input
                    type="text"
                    value={formData.property_type}
                    onChange={(e) => setFormData({ ...formData, property_type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    placeholder="e.g., Single Family, Condo"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Sale Date</label>
                  <input
                    type="date"
                    value={formData.sale_date}
                    onChange={(e) => setFormData({ ...formData, sale_date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
              </div>
            </div>

            {/* Lead Type and Status */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Lead Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Lead Type</label>
                  <select
                    value={formData.lead_type}
                    onChange={(e) => setFormData({ ...formData, lead_type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="">Select Lead Type</option>
                    {leadTypes.map((type) => (
                      <option key={type.id} value={type.id}>{type.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Status</label>
                  <select
                    value={formData.status_id}
                    onChange={(e) => setFormData({ ...formData, status_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="">Select Status</option>
                    {statuses.map((status) => (
                      <option key={status.id} value={status.id}>{status.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Contact
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Edit Contact Modal Component
  const EditContactModal = ({ contact, onClose, onSuccess }) => {
    const [statuses, setStatuses] = useState([]);

    // Fetch statuses on component mount
    useEffect(() => {
      const fetchStatuses = async () => {
        try {
          const response = await axios.get(`${API_BASE_URL}/statuses`);
          setStatuses(response.data);
        } catch (error) {
          console.error('Failed to fetch statuses:', error);
        }
      };
      fetchStatuses();
    }, []);

    // Helper function to format date for date input (YYYY-MM-DD)
    const formatDateForInput = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      return date.toISOString().split('T')[0];
    };

    const [formData, setFormData] = useState({
      lead_id: contact?.lead_id || '',
      property_address_full: contact?.property_address_full || '',
      property_address_city: contact?.property_address_city || '',
      property_address_state: contact?.property_address_state || '',
      property_address_zipcode: contact?.property_address_zipcode || '',
      property_address_county: contact?.property_address_county || '',
      estimated_value: contact?.estimated_value || '',
      property_type: contact?.property_type || '',
      sale_date: formatDateForInput(contact?.sale_date),
      contact_1_name: contact?.contact_1_name || '',
      contact_1_phone1: contact?.contact_1_phone1 || '',
      contact_1_email1: contact?.contact_1_email1 || '',
      lead_type: contact?.lead_type || '',
      status_id: contact?.status_id || ''
    });

    const handleSubmit = async (e) => {
      e.preventDefault();
      try {
        await axios.put(`${API_BASE_URL}/contacts/${contact.id}`, formData);
        toast.success('Contact updated successfully!');
        onSuccess();
        onClose();
      } catch (error) {
        console.error('Failed to update contact:', error);
        toast.error(error.response?.data?.error || 'Failed to update contact');
      }
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Contact</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Contact Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Contact Name *</label>
                  <input
                    type="text"
                    value={formData.contact_1_name}
                    onChange={(e) => setFormData({ ...formData, contact_1_name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Phone</label>
                  <input
                    type="tel"
                    value={formData.contact_1_phone1}
                    onChange={(e) => setFormData({ ...formData, contact_1_phone1: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.contact_1_email1}
                    onChange={(e) => setFormData({ ...formData, contact_1_email1: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Lead ID</label>
                  <input
                    type="text"
                    value={formData.lead_id}
                    onChange={(e) => setFormData({ ...formData, lead_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
              </div>
            </div>

            {/* Property Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Property Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Full Address</label>
                  <input
                    type="text"
                    value={formData.property_address_full}
                    onChange={(e) => setFormData({ ...formData, property_address_full: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">City</label>
                  <input
                    type="text"
                    value={formData.property_address_city}
                    onChange={(e) => setFormData({ ...formData, property_address_city: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">State</label>
                  <input
                    type="text"
                    value={formData.property_address_state}
                    onChange={(e) => setFormData({ ...formData, property_address_state: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Zipcode</label>
                  <input
                    type="text"
                    value={formData.property_address_zipcode}
                    onChange={(e) => setFormData({ ...formData, property_address_zipcode: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">County</label>
                  <input
                    type="text"
                    value={formData.property_address_county}
                    onChange={(e) => setFormData({ ...formData, property_address_county: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Estimated Value</label>
                  <input
                    type="number"
                    value={formData.estimated_value}
                    onChange={(e) => setFormData({ ...formData, estimated_value: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Property Type</label>
                  <input
                    type="text"
                    value={formData.property_type}
                    onChange={(e) => setFormData({ ...formData, property_type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    placeholder="e.g., Single Family, Condo"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Sale Date</label>
                  <input
                    type="date"
                    value={formData.sale_date}
                    onChange={(e) => setFormData({ ...formData, sale_date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
              </div>
            </div>

            {/* Lead Type and Status */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Lead Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Lead Type</label>
                  <select
                    value={formData.lead_type}
                    onChange={(e) => setFormData({ ...formData, lead_type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="">Select Lead Type</option>
                    {leadTypes.map((type) => (
                      <option key={type.id} value={type.id}>{type.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Status</label>
                  <select
                    value={formData.status_id}
                    onChange={(e) => setFormData({ ...formData, status_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="">Select Status</option>
                    {statuses.map((status) => (
                      <option key={status.id} value={status.id}>{status.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Update Contact
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Import Contacts Modal Component
  const ImportContactsModal = ({ onClose, onSuccess }) => {
    const [csvFile, setCsvFile] = useState(null);
    const [csvHeaders, setCsvHeaders] = useState([]);
    const [columnMapping, setColumnMapping] = useState({});
    const [step, setStep] = useState(1);
    const [importing, setImporting] = useState(false);
    const [selectedLeadType, setSelectedLeadType] = useState('');

    const dbFields = [
      { key: 'lead_id', label: 'Lead ID' },
      { key: 'property_address_full', label: 'Property Address (Full)' },
      { key: 'property_address_city', label: 'City' },
      { key: 'property_address_state', label: 'State' },
      { key: 'property_address_zipcode', label: 'Zipcode' },
      { key: 'property_address_county', label: 'County' },
      { key: 'estimated_value', label: 'Estimated Value' },
      { key: 'property_type', label: 'Property Type' },
      { key: 'sale_date', label: 'Sale Date' },
      { key: 'contact_1_name', label: 'Contact Name *' },
      { key: 'contact_1_phone1', label: 'Contact Phone' },
      { key: 'contact_1_email1', label: 'Contact Email' },
      { key: 'status', label: 'Status' }
    ];

    const handleFileChange = (e) => {
      const file = e.target.files[0];
      if (file && file.type === 'text/csv') {
        setCsvFile(file);
        parseCSVHeaders(file);
      } else {
        toast.error('Please upload a valid CSV file');
      }
    };

    // Auto-mapping function to intelligently map CSV columns to database fields
    const autoMapColumns = (csvHeaders) => {
      const mapping = {};

      // Define mapping patterns: db_field -> [possible CSV column names]
      const mappingPatterns = {
        'lead_id': ['lead_id', 'leadid', 'lead id', 'id', 'property_id', 'propertyid'],
        'property_address_full': ['property_address_full', 'property address full', 'address', 'full address', 'property address', 'property_address'],
        'property_address_city': ['property_address_city', 'city', 'property city', 'address city'],
        'property_address_state': ['property_address_state', 'state', 'property state', 'address state'],
        'property_address_zipcode': ['property_address_zipcode', 'zipcode', 'zip', 'postal code', 'property zipcode', 'address zipcode'],
        'property_address_county': ['property_address_county', 'county', 'property county', 'address county'],
        'estimated_value': ['estimated_value', 'estimated value', 'value', 'property value', 'estimate', 'est value'],
        'property_type': ['property_type', 'property type', 'type', 'building type'],
        'sale_date': ['sale_date', 'sale date', 'date', 'purchase date', 'transaction date'],
        'contact_1_name': ['contact_1_name', 'contact 1 name', 'name', 'owner name', 'contact name', 'owner_1_name', 'owner 1 name', 'owner1name'],
        'contact_1_phone1': ['contact_1_phone1', 'contact 1 phone1', 'phone', 'contact phone', 'phone number', 'owner phone', 'telephone'],
        'contact_1_email1': ['contact_1_email1', 'contact 1 email1', 'email', 'contact email', 'owner email', 'email address'],
        'status': ['status', 'lead_status', 'lead status', 'contact status', 'STATUS']
      };

      // For each database field, try to find a matching CSV header
      Object.keys(mappingPatterns).forEach(dbField => {
        const patterns = mappingPatterns[dbField];

        // Try to find an exact or close match in CSV headers
        for (const pattern of patterns) {
          const matchedHeader = csvHeaders.find(header =>
            header.toLowerCase().trim() === pattern.toLowerCase().trim()
          );

          if (matchedHeader) {
            mapping[dbField] = matchedHeader;
            break; // Found a match, move to next field
          }
        }
      });

      return mapping;
    };

    // Parse CSV line properly handling quoted values
    const parseCSVLine = (line) => {
      const result = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const parseCSVHeaders = (file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        const firstLine = text.split('\n')[0];
        const headers = parseCSVLine(firstLine);
        setCsvHeaders(headers);

        // Automatically map columns
        const autoMapping = autoMapColumns(headers);
        setColumnMapping(autoMapping);

        setStep(2);
      };
      reader.readAsText(file);
    };

    // Clean and format data values
    const cleanValue = (value, fieldType) => {
      if (!value || value === '' || value === '-') return '';

      switch (fieldType) {
        case 'estimated_value':
          // Remove $, commas, and convert to number
          return value.replace(/[$,]/g, '').trim();

        case 'sale_date':
          // Convert MM/DD/YYYY to YYYY-MM-DD
          if (value.includes('/')) {
            const parts = value.split('/');
            if (parts.length === 3) {
              const [month, day, year] = parts;
              return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
          }
          return value;

        case 'status':
          // Map common status values
          const statusMap = {
            'processed': 'new',
            'failed': 'new',
            'new prospect': 'new',
            'contacted': 'contacted',
            'qualified': 'qualified',
            'negotiating': 'negotiating',
            'closed': 'closed'
          };
          return statusMap[value.toLowerCase()] || 'new';

        default:
          return value;
      }
    };

    // Parse full name into first and last name
    const parseFullName = (fullName) => {
      if (!fullName) return { firstName: '', lastName: '' };

      const parts = fullName.trim().split(/\s+/);
      const firstName = parts[0] || '';
      const lastName = parts.slice(1).join(' ') || '';

      return { firstName, lastName };
    };

    const handleImport = async () => {
      if (!selectedLeadType) {
        toast.error('Please select a lead type for these contacts');
        return;
      }

      setImporting(true);
      setStep(3);

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const text = e.target.result;
          const lines = text.split('\n').filter(line => line.trim());
          const headers = parseCSVLine(lines[0]);

          // Get existing lead_id + lead_type combinations to check for duplicates
          const existingCombinations = new Set();
          try {
            const response = await axios.get(`${API_BASE_URL}/contacts`);
            response.data.contacts.forEach(c => {
              if (c.lead_id && c.lead_type) {
                existingCombinations.add(`${c.lead_id}:${c.lead_type}`);
              }
            });
          } catch (err) {
            console.error('Failed to fetch existing contacts:', err);
          }

          const contactsToImport = [];
          const failedImports = [];
          const processedCombinations = new Set();

          for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            const contact = { lead_type: selectedLeadType };
            const rowNumber = i + 1;
            const failReasons = [];

            Object.keys(columnMapping).forEach(dbField => {
              const csvHeader = columnMapping[dbField];
              const csvIndex = headers.indexOf(csvHeader);
              if (csvIndex !== -1 && values[csvIndex]) {
                contact[dbField] = cleanValue(values[csvIndex], dbField);
              }
            });

            // Fallback: If contact_1_name is empty, try to use owner_1_name
            if (!contact.contact_1_name) {
              const ownerNameIndex = headers.indexOf('owner_1_name');
              if (ownerNameIndex !== -1 && values[ownerNameIndex]) {
                contact.contact_1_name = values[ownerNameIndex];
              }
            }

            // Validation 1: Check if contact name exists
            if (!contact.contact_1_name || contact.contact_1_name.trim() === '') {
              failReasons.push('Missing contact name');
            }

            // Validation 2: Check if email exists
            if (!contact.contact_1_email1 || contact.contact_1_email1.trim() === '') {
              failReasons.push('Missing email address');
            }

            // Validation 3: Check for duplicate lead_id + lead_type combination
            if (contact.lead_id && contact.lead_type) {
              const combination = `${contact.lead_id}:${contact.lead_type}`;
              if (existingCombinations.has(combination)) {
                failReasons.push(`Duplicate lead_id + lead_type combination (${contact.lead_id}) - already exists in database`);
              } else if (processedCombinations.has(combination)) {
                failReasons.push(`Duplicate lead_id + lead_type combination (${contact.lead_id}) - appears multiple times in CSV`);
              } else {
                processedCombinations.add(combination);
              }
            }

            // If there are validation failures, add to failed list
            if (failReasons.length > 0) {
              failedImports.push({
                row: rowNumber,
                name: contact.contact_1_name || 'N/A',
                email: contact.contact_1_email1 || 'N/A',
                lead_id: contact.lead_id || 'N/A',
                reasons: failReasons
              });
            } else {
              // Parse first and last name
              const { firstName, lastName } = parseFullName(contact.contact_1_name);
              contact.contact_first_name = firstName;
              contact.contact_last_name = lastName;

              // Set default status_id to 1 for imported contacts
              contact.status_id = 1;

              contactsToImport.push(contact);
            }
          }

          // Import successful contacts
          let importedCount = 0;
          if (contactsToImport.length > 0) {
            try {
              await axios.post(`${API_BASE_URL}/contacts/import`, {
                contacts: contactsToImport
              });
              importedCount = contactsToImport.length;
            } catch (error) {
              console.error('Failed to import contacts:', error);
              toast.error(error.response?.data?.error || 'Failed to import contacts');
              setImporting(false);
              return;
            }
          }

          // Show detailed import results
          if (importedCount > 0 && failedImports.length === 0) {
            // All successful
            toast.success(`Successfully imported ${importedCount} contact(s)!`);
          } else if (importedCount === 0 && failedImports.length > 0) {
            // All failed
            toast.error(`Import failed! ${failedImports.length} contact(s) could not be imported.`, {
              description: `Common reasons: ${[...new Set(failedImports.flatMap(f => f.reasons))].slice(0, 3).join(', ')}`,
              duration: 5000
            });
          } else {
            // Mixed results
            const failureReasons = [...new Set(failedImports.flatMap(f => f.reasons))].slice(0, 2).join(', ');
            toast.warning(`Import completed with ${failedImports.length} failure(s)`, {
              description: `✅ Imported: ${importedCount} | ❌ Failed: ${failedImports.length}\nReasons: ${failureReasons}`,
              duration: 6000
            });
          }

          // Log detailed failures to console for debugging
          if (failedImports.length > 0) {
            console.log('=== Failed Imports Details ===');
            failedImports.forEach(fail => {
              console.log(`Row ${fail.row}: ${fail.name} (${fail.email}) - ${fail.reasons.join(', ')}`);
            });
          }

          onSuccess();
          onClose();
        } catch (error) {
          console.error('Failed to import contacts:', error);
          toast.error(error.response?.data?.error || 'Failed to import contacts');
        } finally {
          setImporting(false);
        }
      };
      reader.readAsText(csvFile);
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Import Contacts</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <X size={20} />
            </button>
          </div>

          <div className="p-6">
            {step === 1 && (
              <div className="space-y-6">
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                  <Upload size={48} className="mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold mb-2">Upload CSV File</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Select a CSV file to import contacts. Maximum 100,000 records supported.
                  </p>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/20 dark:file:text-blue-400"
                  />
                </div>
                <div className="flex justify-end">
                  <button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">Lead Type for All Imports *</label>
                  <select
                    value={selectedLeadType}
                    onChange={(e) => setSelectedLeadType(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="">Select Lead Type</option>
                    {leadTypes.map((type) => (
                      <option key={type.id} value={type.id}>{type.name}</option>
                    ))}
                  </select>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h4 className="font-medium text-green-800 dark:text-green-300 mb-1">Auto-Mapping Applied</h4>
                      <p className="text-sm text-green-700 dark:text-green-400">
                        CSV columns have been automatically mapped to database fields based on common naming patterns.
                        You can adjust the mappings below if needed.
                      </p>
                    </div>
                  </div>
                </div>

                <h3 className="text-lg font-semibold mb-4">Map CSV Columns to Database Fields</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {dbFields.map((field) => (
                    <div key={field.key} className="flex items-center gap-4">
                      <div className="w-1/3 flex items-center gap-2">
                        <label className="text-sm font-medium">{field.label}</label>
                        {columnMapping[field.key] && (
                          <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="w-2/3">
                        <select
                          value={columnMapping[field.key] || ''}
                          onChange={(e) => setColumnMapping({ ...columnMapping, [field.key]: e.target.value })}
                          className={`w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm ${
                            columnMapping[field.key]
                              ? 'border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900/20'
                              : ''
                          }`}
                        >
                          <option value="">-- Skip --</option>
                          {csvHeaders.map((header) => (
                            <option key={header} value={header}>{header}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setStep(1)}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleImport}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    disabled={!columnMapping.contact_1_name}
                  >
                    Import Contacts
                  </button>
                </div>
              </div>
            )}

            {step === 3 && importing && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-lg font-semibold">Importing contacts...</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">This may take a few moments</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Contact Profile Modal
  const ContactProfileModal = ({ contact, onClose }) => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Contact Profile</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {contact.contact_1_name}
            </h3>
            {contact.lead_type_name && (
              <span
                className="inline-block px-3 py-1 rounded-full text-sm font-medium text-white"
                style={{ backgroundColor: contact.lead_type_color }}
              >
                {contact.lead_type_name}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contact.contact_1_email1 && contact.contact_1_email1 !== '0' && (
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2">
                  <Mail size={18} />
                  <span className="text-sm font-medium">Email</span>
                </div>
                <p className="text-gray-900 dark:text-white font-medium">{contact.contact_1_email1}</p>
              </div>
            )}

            {contact.contact_1_phone1 && contact.contact_1_phone1 !== '0' && (
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2">
                  <PhoneIcon size={18} />
                  <span className="text-sm font-medium">Phone</span>
                </div>
                <p className="text-gray-900 dark:text-white font-medium">{contact.contact_1_phone1}</p>
              </div>
            )}
          </div>

          {contact.property_address_full && contact.property_address_full !== '0' && (
            <div>
              <h4 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Property Information</h4>
              <div className="space-y-3">
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2">
                    <MapPin size={18} />
                    <span className="text-sm font-medium">Address</span>
                  </div>
                  <p className="text-gray-900 dark:text-white font-medium">{contact.property_address_full}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {contact.property_address_city}, {contact.property_address_state} {contact.property_address_zipcode}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {contact.estimated_value && contact.estimated_value !== '0' && contact.estimated_value !== 0 && (
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2">
                        <DollarSign size={18} />
                        <span className="text-sm font-medium">Estimated Value</span>
                      </div>
                      <p className="text-gray-900 dark:text-white font-medium">
                        ${parseFloat(contact.estimated_value).toLocaleString()}
                      </p>
                    </div>
                  )}

                  {contact.property_type && contact.property_type !== '0' && (
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2">
                        <Home size={18} />
                        <span className="text-sm font-medium">Property Type</span>
                      </div>
                      <p className="text-gray-900 dark:text-white font-medium">{contact.property_type}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Status</p>
              <p className="text-gray-900 dark:text-white font-medium capitalize">{contact.status_name || contact.status || '-'}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Created</p>
              <p className="text-gray-900 dark:text-white font-medium">
                {new Date(contact.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            {canEdit && (
              <button
                onClick={() => {
                  handleEdit(contact);
                  onClose();
                }}
                className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
              >
                <Edit size={18} />
                Edit
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => handleDelete(contact.id)}
                className="py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2"
              >
                <Trash2 size={18} />
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {showDeletedView ? 'Deleted Contacts' : 'Contacts'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {showDeletedView
              ? `${deletedContacts.length} deleted contact${deletedContacts.length !== 1 ? 's' : ''}`
              : `${filteredContacts.length} of ${contacts.length} contacts`}
          </p>
        </div>
        <div className="flex gap-3">
          {canDelete && (
            <button
              onClick={() => setShowDeletedView(!showDeletedView)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                showDeletedView
                  ? 'bg-gray-600 hover:bg-gray-700 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              {showDeletedView ? <X size={20} /> : <Trash2 size={20} />}
              {showDeletedView ? 'Back to Contacts' : 'Deleted Contacts'}
            </button>
          )}
          {canExport && (
            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              <Download size={20} />
              Export Contacts
            </button>
          )}
          {canImport && (
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <Upload size={20} />
              Import Contacts
            </button>
          )}
          {canAdd && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus size={20} />
              Add Contact
            </button>
          )}
        </div>
      </div>

      {showDeletedView ? (
        /* Deleted Contacts View */
        <>
          {/* Deleted Contacts Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            {deletedContacts.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                No deleted contacts
              </div>
            ) : (
              <div
                ref={deletedTableRef}
                className="overflow-x-auto cursor-grab active:cursor-grabbing"
                onMouseDown={handleDeletedMouseDown}
                onMouseUp={handleDeletedMouseUp}
                onMouseMove={handleDeletedMouseMove}
                onMouseLeave={handleDeletedMouseLeave}
              >
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Lead ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Contact Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Phone</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Property Address</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">City</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">State</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Zipcode</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">County</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Est. Value</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Property Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Sale Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Lead Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Deleted At</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {deletedContacts.map((contact) => (
                      <tr key={contact.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 text-sm">{contact.lead_id && contact.lead_id !== '0' ? contact.lead_id : '-'}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                          {contact.contact_1_name || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm">{contact.contact_1_phone1 && contact.contact_1_phone1 !== '0' ? contact.contact_1_phone1 : '-'}</td>
                        <td className="px-4 py-3 text-sm">{contact.contact_1_email1 && contact.contact_1_email1 !== '0' ? contact.contact_1_email1 : '-'}</td>
                        <td className="px-4 py-3 text-sm max-w-xs truncate">{contact.property_address_full && contact.property_address_full !== '0' ? contact.property_address_full : '-'}</td>
                        <td className="px-4 py-3 text-sm">{contact.property_address_city && contact.property_address_city !== '0' ? contact.property_address_city : '-'}</td>
                        <td className="px-4 py-3 text-sm">{contact.property_address_state && contact.property_address_state !== '0' ? contact.property_address_state : '-'}</td>
                        <td className="px-4 py-3 text-sm">{contact.property_address_zipcode && contact.property_address_zipcode !== '0' ? contact.property_address_zipcode : '-'}</td>
                        <td className="px-4 py-3 text-sm">{contact.property_address_county && contact.property_address_county !== '0' ? contact.property_address_county : '-'}</td>
                        <td className="px-4 py-3 text-sm">
                          {contact.estimated_value && contact.estimated_value !== '0' && contact.estimated_value !== 0 ? `$${parseFloat(contact.estimated_value).toLocaleString()}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm">{contact.property_type && contact.property_type !== '0' ? contact.property_type : '-'}</td>
                        <td className="px-4 py-3 text-sm">
                          {contact.sale_date && contact.sale_date !== '0000-00-00' ? new Date(contact.sale_date).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-4 py-3">
                          {contact.lead_type_name ? (
                            <span
                              className="px-2 py-1 rounded-full text-xs font-medium text-white whitespace-nowrap"
                              style={{ backgroundColor: contact.lead_type_color }}
                            >
                              {contact.lead_type_name}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 capitalize whitespace-nowrap">
                            {contact.status_name || contact.status || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap">
                          {new Date(contact.deleted_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleRestore(contact.id)}
                            className="text-green-600 dark:text-green-400 hover:underline flex items-center gap-1 whitespace-nowrap"
                          >
                            <RotateCcw size={16} />
                            Restore
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Main Contacts View */
        <>
      {/* Lead Type Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedLeadTypeFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedLeadTypeFilter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          All ({contacts.length})
        </button>
        {leadTypes
          .filter(type => allowedLeadTypes === null || allowedLeadTypes.includes(type.id))
          .map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedLeadTypeFilter(type.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedLeadTypeFilter == type.id
                  ? 'text-white'
                  : 'opacity-80 hover:opacity-100'
              }`}
              style={{
                backgroundColor: selectedLeadTypeFilter == type.id ? type.color : 'transparent',
                border: `2px solid ${type.color}`,
                color: selectedLeadTypeFilter == type.id ? 'white' : type.color
              }}
            >
              {type.name} ({contacts.filter(c => c.lead_type == type.id).length})
            </button>
          ))}
      </div>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (canExport || canDelete) && (
        <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
            {selectedIds.length} contact(s) selected
          </span>
          <div className="flex items-center gap-3">
            {canExport && (
              <button
                onClick={handleBulkExport}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                <Download size={18} />
                Export Selected
              </button>
            )}
            {canDelete && (
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                <Trash2 size={18} />
                Delete Selected
              </button>
            )}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search contacts by name, email, phone, or address..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Contacts Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div
          ref={mainTableRef}
          className="overflow-x-auto cursor-grab active:cursor-grabbing"
          onMouseDown={handleMainMouseDown}
          onMouseUp={handleMainMouseUp}
          onMouseMove={handleMainMouseMove}
          onMouseLeave={handleMainMouseLeave}
        >
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-4 py-3 w-12">
                  <button
                    onClick={toggleSelectAll}
                    className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  >
                    {selectedIds.length === currentContacts.length && currentContacts.length > 0 ? (
                      <CheckSquare size={20} />
                    ) : (
                      <Square size={20} />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Lead ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Contact Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Property Address</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">City</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">State</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Zipcode</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">County</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Est. Value</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Property Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Sale Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Lead Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Created At</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {currentContacts.length === 0 ? (
                <tr>
                  <td colSpan="17" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    {searchTerm || selectedLeadTypeFilter !== 'all'
                      ? 'No contacts found matching your filters'
                      : 'No contacts yet. Add or import contacts to get started.'}
                  </td>
                </tr>
              ) : (
                currentContacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleSelection(contact.id)}
                        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                      >
                        {selectedIds.includes(contact.id) ? (
                          <CheckSquare size={20} />
                        ) : (
                          <Square size={20} />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm">{contact.lead_id && contact.lead_id !== '0' ? contact.lead_id : '-'}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                      {contact.contact_1_name || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">{contact.contact_1_phone1 && contact.contact_1_phone1 !== '0' ? contact.contact_1_phone1 : '-'}</td>
                    <td className="px-4 py-3 text-sm">{contact.contact_1_email1 && contact.contact_1_email1 !== '0' ? contact.contact_1_email1 : '-'}</td>
                    <td className="px-4 py-3 text-sm max-w-xs truncate">{contact.property_address_full && contact.property_address_full !== '0' ? contact.property_address_full : '-'}</td>
                    <td className="px-4 py-3 text-sm">{contact.property_address_city && contact.property_address_city !== '0' ? contact.property_address_city : '-'}</td>
                    <td className="px-4 py-3 text-sm">{contact.property_address_state && contact.property_address_state !== '0' ? contact.property_address_state : '-'}</td>
                    <td className="px-4 py-3 text-sm">{contact.property_address_zipcode && contact.property_address_zipcode !== '0' ? contact.property_address_zipcode : '-'}</td>
                    <td className="px-4 py-3 text-sm">{contact.property_address_county && contact.property_address_county !== '0' ? contact.property_address_county : '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      {contact.estimated_value && contact.estimated_value !== '0' && contact.estimated_value !== 0 ? `$${parseFloat(contact.estimated_value).toLocaleString()}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">{contact.property_type && contact.property_type !== '0' ? contact.property_type : '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      {contact.sale_date && contact.sale_date !== '0000-00-00' ? new Date(contact.sale_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-3">
                      {contact.lead_type_name ? (
                        <span
                          className="px-2 py-1 rounded-full text-xs font-medium text-white whitespace-nowrap"
                          style={{ backgroundColor: contact.lead_type_color }}
                        >
                          {contact.lead_type_name}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 capitalize whitespace-nowrap">
                        {contact.status_name || contact.status || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      {new Date(contact.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {canView && (
                          <button
                            onClick={() => setSelectedContact(contact)}
                            className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 whitespace-nowrap"
                          >
                            <Eye size={16} />
                            View
                          </button>
                        )}
                        {canEdit && (
                          <button
                            onClick={() => handleEdit(contact)}
                            className="text-green-600 dark:text-green-400 hover:underline flex items-center gap-1 whitespace-nowrap"
                          >
                            <Edit size={16} />
                            Edit
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

        {/* Pagination */}
        {filteredContacts.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 dark:text-gray-400">Show:</label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-3 py-1 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-sm text-gray-600 dark:text-gray-400">per page</span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredContacts.length)} of {filteredContacts.length} contacts
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={20} />
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => paginate(pageNum)}
                      className={`px-3 py-1 rounded-lg ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>
        </>
      )}

      {/* Modals */}
      {selectedContact && <ContactProfileModal contact={selectedContact} onClose={() => setSelectedContact(null)} />}
      {showAddModal && <AddContactModal onClose={() => setShowAddModal(false)} onSuccess={fetchContacts} />}
      {showEditModal && editingContact && (
        <EditContactModal
          contact={editingContact}
          onClose={() => {
            setShowEditModal(false);
            setEditingContact(null);
          }}
          onSuccess={fetchContacts}
        />
      )}
      {showImportModal && <ImportContactsModal onClose={() => setShowImportModal(false)} onSuccess={fetchContacts} />}
      {showExportModal && <ExportContactsModal onClose={() => setShowExportModal(false)} />}
    </div>
  );
};

export default Contacts;
