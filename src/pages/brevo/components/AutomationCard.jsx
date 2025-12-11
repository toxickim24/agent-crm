import { Users, Calendar, Activity, CheckCircle, Clock, XCircle } from 'lucide-react';
import StatusBadge from './StatusBadge';

const AutomationCard = ({ automation }) => {
  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getProgressPercentage = () => {
    if (!automation.contacts_total || automation.contacts_total === 0) return 0;
    return Math.round((automation.contacts_finished / automation.contacts_total) * 100);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate" title={automation.name}>
            {automation.name}
          </h3>
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 dark:text-gray-400">
            <Calendar size={14} />
            <span>Last edited: {formatDate(automation.last_edited_at)}</span>
          </div>
        </div>
        <StatusBadge status={automation.status} />
      </div>

      {/* Total Contacts */}
      <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="text-blue-600 dark:text-blue-400" size={20} />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total in Workflow</span>
          </div>
          <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {automation.contacts_total || 0}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
          <span>Progress</span>
          <span>{getProgressPercentage()}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${getProgressPercentage()}%` }}
          />
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Active Now */}
        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="text-green-500" size={16} />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Active Now</span>
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {automation.contacts_active || 0}
          </p>
        </div>

        {/* Started */}
        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="text-blue-500" size={16} />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Started</span>
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {automation.contacts_started || 0}
          </p>
        </div>

        {/* Finished */}
        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="text-green-500" size={16} />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Finished</span>
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {automation.contacts_finished || 0}
          </p>
        </div>

        {/* Suspended */}
        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="text-orange-500" size={16} />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Suspended</span>
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {automation.contacts_suspended || 0}
          </p>
        </div>
      </div>

      {/* Paused Count (if applicable) */}
      {automation.contacts_paused > 0 && (
        <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="text-orange-600 dark:text-orange-400" size={16} />
              <span className="text-sm font-medium text-orange-700 dark:text-orange-300">Paused</span>
            </div>
            <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
              {automation.contacts_paused}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutomationCard;
