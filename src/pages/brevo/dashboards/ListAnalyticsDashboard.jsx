import { useState, useEffect } from 'react';
import axios from 'axios';
import { List, TrendingUp, Users, AlertTriangle, CheckCircle } from 'lucide-react';
import { StatCard, ProgressBar, DataTable, ChartCard, AlertBanner, EmptyState, EngagementGauge } from '../components/Widgets';
import API_BASE_URL from '../../../config/api';

const ListAnalyticsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lists, setLists] = useState([]);
  const [healthData, setHealthData] = useState([]);

  useEffect(() => {
    fetchListAnalytics();
  }, []);

  const fetchListAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch lists and health scores
      const [listsRes, healthRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/brevo/lists`),
        axios.get(`${API_BASE_URL}/brevo/analytics/list-health`)
      ]);

      setLists(listsRes.data.lists || []);
      setHealthData(healthRes.data.lists || []);
    } catch (err) {
      console.error('Error fetching list analytics:', err);
      setError('Failed to load list analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-600 dark:text-gray-400">Loading list analytics...</div>
      </div>
    );
  }

  if (error) {
    return <AlertBanner type="error" message={error} />;
  }

  if (!lists || lists.length === 0) {
    return (
      <EmptyState
        icon={<List size={48} />}
        title="No Lists Found"
        description="Create your first email list in Brevo to see list analytics and health scores."
      />
    );
  }

  // Calculate aggregate statistics
  const totalSubscribers = lists.reduce((sum, list) => sum + (list.total_subscribers || 0), 0);
  const avgHealthScore = healthData.length > 0
    ? Math.round(healthData.reduce((sum, h) => sum + h.healthScore, 0) / healthData.length)
    : 0;
  const healthyLists = healthData.filter(h => h.healthScore >= 70).length;
  const atRiskLists = healthData.filter(h => h.healthScore < 50).length;

  // Prepare table data by merging lists with health scores
  const tableData = lists.map(list => {
    const health = healthData.find(h => h.listId === list.id) || { healthScore: 0, activeContacts: 0 };
    return {
      ...list,
      healthScore: health.healthScore,
      activeContacts: health.activeContacts,
      activeRate: list.total_subscribers > 0
        ? ((health.activeContacts / list.total_subscribers) * 100).toFixed(1)
        : 0
    };
  }).sort((a, b) => b.healthScore - a.healthScore);

  const listColumns = [
    {
      header: 'List Name',
      key: 'list_name',
      render: (row) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">{row.list_name}</div>
          <div className="text-xs text-gray-500">ID: {row.brevo_list_id}</div>
        </div>
      )
    },
    {
      header: 'Health Score',
      key: 'healthScore',
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold ${
            row.healthScore >= 70 ? 'bg-green-100 text-green-700' :
            row.healthScore >= 50 ? 'bg-yellow-100 text-yellow-700' :
            'bg-red-100 text-red-700'
          }`}>
            {row.healthScore}
          </div>
          <span className={`text-xs font-medium ${
            row.healthScore >= 70 ? 'text-green-600' :
            row.healthScore >= 50 ? 'text-yellow-600' :
            'text-red-600'
          }`}>
            {row.healthScore >= 70 ? 'Healthy' : row.healthScore >= 50 ? 'Fair' : 'At Risk'}
          </span>
        </div>
      )
    },
    {
      header: 'Subscribers',
      key: 'total_subscribers',
      render: (row) => row.total_subscribers?.toLocaleString() || '0'
    },
    {
      header: 'Active Contacts',
      key: 'activeContacts',
      render: (row) => row.activeContacts?.toLocaleString() || '0'
    },
    {
      header: 'Active Rate',
      key: 'activeRate',
      render: (row) => (
        <div className="w-32">
          <ProgressBar
            label=""
            value={parseFloat(row.activeRate)}
            max={100}
            showPercentage={true}
            colorClass={
              parseFloat(row.activeRate) >= 70 ? 'bg-green-500' :
              parseFloat(row.activeRate) >= 50 ? 'bg-yellow-500' :
              'bg-red-500'
            }
          />
        </div>
      )
    },
    {
      header: 'Created',
      key: 'created_at',
      render: (row) => row.created_at ? new Date(row.created_at).toLocaleDateString() : 'N/A'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-900 dark:text-blue-300">
          List health scores are calculated based on subscriber activity, engagement rates, and list quality.
          Scores range from 0-100, with higher scores indicating healthier, more engaged lists.
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Lists"
          value={lists.length.toString()}
          icon={<List className="text-blue-500" />}
        />
        <StatCard
          title="Total Subscribers"
          value={totalSubscribers.toLocaleString()}
          icon={<Users className="text-green-500" />}
        />
        <StatCard
          title="Healthy Lists"
          value={healthyLists.toString()}
          icon={<CheckCircle className="text-green-500" />}
          trend="up"
          trendValue={`${lists.length > 0 ? ((healthyLists / lists.length) * 100).toFixed(0) : 0}%`}
        />
        <StatCard
          title="At Risk Lists"
          value={atRiskLists.toString()}
          icon={<AlertTriangle className="text-orange-500" />}
          trend={atRiskLists > 0 ? "down" : "neutral"}
          trendValue={`${lists.length > 0 ? ((atRiskLists / lists.length) * 100).toFixed(0) : 0}%`}
        />
      </div>

      {/* Average Health Score */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <ChartCard title="Overall List Health">
            <div className="flex justify-center">
              <EngagementGauge score={avgHealthScore} size={160} label="Average Health Score" />
            </div>
          </ChartCard>
        </div>

        <div className="lg:col-span-2">
          <ChartCard title="Health Distribution">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600 dark:text-gray-400">Healthy (70-100)</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {healthyLists} lists ({lists.length > 0 ? ((healthyLists / lists.length) * 100).toFixed(0) : 0}%)
                  </span>
                </div>
                <ProgressBar
                  label=""
                  value={healthyLists}
                  max={lists.length}
                  colorClass="bg-green-500"
                  showPercentage={false}
                />
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600 dark:text-gray-400">Fair (50-69)</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {healthData.filter(h => h.healthScore >= 50 && h.healthScore < 70).length} lists
                  </span>
                </div>
                <ProgressBar
                  label=""
                  value={healthData.filter(h => h.healthScore >= 50 && h.healthScore < 70).length}
                  max={lists.length}
                  colorClass="bg-yellow-500"
                  showPercentage={false}
                />
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600 dark:text-gray-400">At Risk (0-49)</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {atRiskLists} lists ({lists.length > 0 ? ((atRiskLists / lists.length) * 100).toFixed(0) : 0}%)
                  </span>
                </div>
                <ProgressBar
                  label=""
                  value={atRiskLists}
                  max={lists.length}
                  colorClass="bg-red-500"
                  showPercentage={false}
                />
              </div>
            </div>
          </ChartCard>
        </div>
      </div>

      {/* At-Risk Lists Alert */}
      {atRiskLists > 0 && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-orange-600 dark:text-orange-400 mt-1" size={20} />
            <div>
              <h4 className="font-semibold text-orange-900 dark:text-orange-300 mb-1">
                {atRiskLists} List{atRiskLists > 1 ? 's' : ''} Need Attention
              </h4>
              <p className="text-sm text-orange-800 dark:text-orange-400">
                These lists have low health scores. Consider cleaning inactive subscribers,
                re-engaging dormant contacts, or updating your list management practices.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* List Details Table */}
      <ChartCard title="List Health Details">
        <DataTable
          columns={listColumns}
          data={tableData}
        />
      </ChartCard>

      {/* Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Best Practices">
          <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
            <div className="flex items-start gap-2">
              <CheckCircle className="text-green-500 flex-shrink-0 mt-0.5" size={16} />
              <div>
                <strong>Regular List Cleaning:</strong> Remove inactive subscribers every 3-6 months
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="text-green-500 flex-shrink-0 mt-0.5" size={16} />
              <div>
                <strong>Engagement Campaigns:</strong> Run re-engagement campaigns for dormant contacts
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="text-green-500 flex-shrink-0 mt-0.5" size={16} />
              <div>
                <strong>Quality Over Quantity:</strong> Focus on engaged subscribers rather than list size
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="text-green-500 flex-shrink-0 mt-0.5" size={16} />
              <div>
                <strong>Monitor Bounces:</strong> Remove hard bounces immediately to maintain deliverability
              </div>
            </div>
          </div>
        </ChartCard>

        <ChartCard title="Health Score Factors">
          <div className="space-y-3 text-sm">
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="font-medium text-gray-900 dark:text-white mb-1">Active Subscriber Ratio (30%)</div>
              <p className="text-gray-600 dark:text-gray-400">
                Percentage of subscribers who have engaged with recent campaigns
              </p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="font-medium text-gray-900 dark:text-white mb-1">Email Quality (20%)</div>
              <p className="text-gray-600 dark:text-gray-400">
                Percentage of non-blacklisted, valid email addresses
              </p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="font-medium text-gray-900 dark:text-white mb-1">Base Score (50%)</div>
              <p className="text-gray-600 dark:text-gray-400">
                Starting score adjusted by the above factors
              </p>
            </div>
          </div>
        </ChartCard>
      </div>
    </div>
  );
};

export default ListAnalyticsDashboard;
