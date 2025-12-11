import { useState, useEffect } from 'react';
import axios from 'axios';
import { Zap, Play, Pause, StopCircle, RefreshCw } from 'lucide-react';
import { StatCard, AlertBanner, EmptyState } from '../components/Widgets';
import AutomationCard from '../components/AutomationCard';
import API_BASE_URL from '../../../config/api';

const AutomationsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [automations, setAutomations] = useState([]);
  const [counts, setCounts] = useState({ total: 0, active: 0, paused: 0, inactive: 0 });
  const [selectedStatus, setSelectedStatus] = useState(''); // '', 'active', 'paused', 'inactive'

  useEffect(() => {
    fetchAutomations();
  }, [selectedStatus]);

  const fetchAutomations = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = selectedStatus ? { status: selectedStatus } : {};
      const response = await axios.get(`${API_BASE_URL}/brevo/automations`, { params });

      setAutomations(response.data.automations || []);
      setCounts(response.data.counts || { total: 0, active: 0, paused: 0, inactive: 0 });
    } catch (err) {
      console.error('Error fetching automations:', err);
      setError('Failed to load automations data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-600 dark:text-gray-400">Loading automations...</div>
      </div>
    );
  }

  if (error) {
    return <AlertBanner type="error" message={error} />;
  }

  // Calculate percentages
  const getPercentage = (count, total) => {
    return total > 0 ? Math.round((count / total) * 100) : 0;
  };

  return (
    <div className="space-y-6">
      {/* Header with Sync Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Brevo Automations
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Track and monitor your Brevo automation workflows (local data only)
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchAutomations}
            disabled={loading}
            className="p-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg disabled:opacity-50 transition-colors"
            title="Refresh data"
          >
            <RefreshCw className={loading ? 'animate-spin' : ''} size={18} />
          </button>
        </div>
      </div>

      {/* Status Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="All Automations"
          value={(counts.total ?? 0).toString()}
          icon={<Zap className="text-blue-500" />}
        />
        <StatCard
          title="Active"
          value={(counts.active ?? 0).toString()}
          icon={<Play className="text-green-500" />}
          trend="up"
          trendValue={`${getPercentage(counts.active ?? 0, counts.total ?? 0)}%`}
        />
        <StatCard
          title="Paused"
          value={(counts.paused ?? 0).toString()}
          icon={<Pause className="text-orange-500" />}
          trendValue={`${getPercentage(counts.paused ?? 0, counts.total ?? 0)}%`}
        />
        <StatCard
          title="Inactive"
          value={(counts.inactive ?? 0).toString()}
          icon={<StopCircle className="text-gray-500" />}
          trendValue={`${getPercentage(counts.inactive ?? 0, counts.total ?? 0)}%`}
        />
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setSelectedStatus('')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            selectedStatus === ''
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          All ({counts.total ?? 0})
        </button>
        <button
          onClick={() => setSelectedStatus('active')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            selectedStatus === 'active'
              ? 'border-green-500 text-green-600 dark:text-green-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          Active ({counts.active ?? 0})
        </button>
        <button
          onClick={() => setSelectedStatus('paused')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            selectedStatus === 'paused'
              ? 'border-orange-500 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          Paused ({counts.paused ?? 0})
        </button>
        <button
          onClick={() => setSelectedStatus('inactive')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            selectedStatus === 'inactive'
              ? 'border-gray-500 text-gray-600 dark:text-gray-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          Inactive ({counts.inactive ?? 0})
        </button>
      </div>

      {/* Automations Grid */}
      {automations.length === 0 ? (
        <EmptyState
          icon={<Zap size={48} />}
          title="No Automations Found"
          description={
            selectedStatus
              ? `No ${selectedStatus} automations found. Try selecting a different status filter.`
              : 'No automation workflows are currently being tracked. This feature displays local reference data only, as Brevo does not provide an API to sync automation workflows.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {automations.map((automation) => (
            <AutomationCard key={automation.id} automation={automation} />
          ))}
        </div>
      )}

      {/* Read-Only Notice */}
      <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="text-blue-600 dark:text-blue-400 mt-0.5">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200">Local Tracking Only</h4>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              Brevo does not provide an API to sync automation workflows. This dashboard displays locally tracked data for reference only.
              To create, edit, or manage your actual automation workflows, please use the Brevo platform directly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutomationsDashboard;
