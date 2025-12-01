import { X, Mail, User, MapPin, Calendar, TrendingUp, Tag, Star, ExternalLink } from 'lucide-react';

const ContactDetailsModal = ({ contact, isOpen, onClose }) => {
  if (!isOpen || !contact) return null;

  const getMemberRating = (rating) => {
    const stars = [];
    for (let i = 0; i < 5; i++) {
      stars.push(
        <Star
          key={i}
          size={16}
          className={i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
        />
      );
    }
    return stars;
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg max-w-3xl w-full p-6 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <User size={24} />
              Contact Details
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {contact.email_address}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        {/* Contact Info */}
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase">
              Personal Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Full Name</label>
                <p className="text-gray-900 dark:text-white font-medium">
                  {contact.contact_first_name} {contact.contact_last_name}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Email</label>
                <p className="text-gray-900 dark:text-white font-medium">{contact.email_address}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Lead Type</label>
                <div>
                  {contact.lead_type_name && (
                    <span
                      className="px-2 py-1 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: contact.lead_type_color }}
                    >
                      {contact.lead_type_name}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Property Address</label>
                <p className="text-gray-900 dark:text-white font-medium">
                  {contact.property_address_full || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Engagement Stats */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase flex items-center gap-2">
              <TrendingUp size={16} />
              Engagement Metrics
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Member Rating</label>
                <div className="flex items-center gap-1 mt-1">
                  {getMemberRating(contact.member_rating || 0)}
                  <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                    {contact.member_rating || 0}/5
                  </span>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Status</label>
                <p className="text-gray-900 dark:text-white font-medium capitalize">
                  {contact.status || 'Unknown'}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Email Type</label>
                <p className="text-gray-900 dark:text-white font-medium uppercase">
                  {contact.email_type || 'HTML'}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Sync Status</label>
                <p className="text-gray-900 dark:text-white font-medium capitalize">
                  {contact.sync_status || 'Unknown'}
                </p>
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase flex items-center gap-2">
              <Calendar size={16} />
              Timeline
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Last Synced</label>
                <p className="text-gray-900 dark:text-white font-medium">
                  {contact.last_synced_at
                    ? new Date(contact.last_synced_at).toLocaleString()
                    : 'Never'}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Last Changed</label>
                <p className="text-gray-900 dark:text-white font-medium">
                  {contact.last_changed
                    ? new Date(contact.last_changed).toLocaleString()
                    : 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Created</label>
                <p className="text-gray-900 dark:text-white font-medium">
                  {contact.created_at
                    ? new Date(contact.created_at).toLocaleString()
                    : 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Signup Date</label>
                <p className="text-gray-900 dark:text-white font-medium">
                  {contact.timestamp_signup
                    ? new Date(contact.timestamp_signup).toLocaleString()
                    : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* IDs */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase">
              Identifiers
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Subscriber Hash</label>
                <p className="text-gray-900 dark:text-white font-mono text-xs">
                  {contact.subscriber_hash || 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">List ID</label>
                <p className="text-gray-900 dark:text-white font-mono text-xs">
                  {contact.list_id || 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Web ID</label>
                <p className="text-gray-900 dark:text-white font-mono text-xs">
                  {contact.web_id || 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Unique Email ID</label>
                <p className="text-gray-900 dark:text-white font-mono text-xs">
                  {contact.unique_email_id || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Error Info */}
          {contact.sync_error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">
                Sync Error
              </h3>
              <p className="text-sm text-red-600 dark:text-red-400">{contact.sync_error}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-3 justify-end">
          {contact.web_id && (
            <a
              href={`https://admin.mailchimp.com/lists/members/view?id=${contact.web_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              View in Mailchimp
              <ExternalLink size={16} />
            </a>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-900 dark:text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContactDetailsModal;
