import { useState, useEffect } from 'react';
import axios from 'axios';
import { Clock, TrendingUp, Calendar, Activity } from 'lucide-react';
import { StatCard, Heatmap, ChartCard, AlertBanner, EmptyState } from '../components/Widgets';
import API_BASE_URL from '../../../config/api';

const TimeOfDayDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeData, setTimeData] = useState(null);
  const [daysBack, setDaysBack] = useState(90);

  useEffect(() => {
    fetchTimeOfDayData();
  }, [daysBack]);

  const fetchTimeOfDayData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_BASE_URL}/brevo/analytics/time-of-day?daysBack=${daysBack}`);
      setTimeData(res.data);
    } catch (err) {
      console.error('Error fetching time-of-day data:', err);
      setError('Failed to load time-of-day analysis');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-600 dark:text-gray-400">Loading time-of-day analysis...</div>
      </div>
    );
  }

  if (error) {
    return <AlertBanner type="error" message={error} />;
  }

  if (!timeData || timeData.totalEngagements === 0) {
    return (
      <EmptyState
        icon={<Clock size={48} />}
        title="No Engagement Data"
        description="No email engagement data available for the selected time period. Send some campaigns and wait for engagement to see time-of-day patterns."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-900 dark:text-blue-300">
          This heatmap shows when your contacts are most engaged with your emails. Darker colors indicate higher engagement (opens + clicks).
          Use this to optimize your send times for maximum impact.
        </p>
      </div>

      {/* Time Range Selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Analysis Period:</label>
        <select
          value={daysBack}
          onChange={(e) => setDaysBack(parseInt(e.target.value))}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value={30}>Last 30 Days</option>
          <option value={60}>Last 60 Days</option>
          <option value={90}>Last 90 Days</option>
          <option value={180}>Last 6 Months</option>
          <option value={365}>Last Year</option>
        </select>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Engagements"
          value={timeData.totalEngagements?.toLocaleString() || '0'}
          icon={<Activity className="text-blue-500" />}
        />
        <StatCard
          title="Best Day"
          value={timeData.bestTime?.day || 'N/A'}
          icon={<Calendar className="text-green-500" />}
        />
        <StatCard
          title="Best Time"
          value={timeData.bestTime?.hourFormatted || 'N/A'}
          icon={<Clock className="text-purple-500" />}
        />
        <StatCard
          title="Peak Engagement"
          value={timeData.bestTime?.engagementCount?.toLocaleString() || '0'}
          icon={<TrendingUp className="text-orange-500" />}
        />
      </div>

      {/* Best Time Recommendation */}
      {timeData.bestTime && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <TrendingUp className="text-green-600 dark:text-green-400 mt-1" size={20} />
            <div>
              <h4 className="font-semibold text-green-900 dark:text-green-300 mb-1">
                Recommended Send Time
              </h4>
              <p className="text-sm text-green-800 dark:text-green-400">
                Based on your engagement data, the best time to send emails is{' '}
                <strong>{timeData.bestTime.day}s at {timeData.bestTime.hourFormatted}</strong>{' '}
                ({timeData.bestTime.engagementCount} engagements at this time).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Heatmap Visualization */}
      <ChartCard title="Engagement Heatmap - By Day and Hour">
        <Heatmap data={timeData.heatmap} maxValue={timeData.maxValue} />
        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          <p>
            <strong>How to read:</strong> Each cell represents a specific day and hour. Hover over cells to see detailed engagement counts.
            Darker colors indicate higher engagement levels.
          </p>
        </div>
      </ChartCard>

      {/* Additional Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Usage Tips">
          <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
              <div>
                <strong>Schedule campaigns</strong> during peak engagement times shown in the heatmap
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
              <div>
                <strong>Avoid low-engagement periods</strong> indicated by lighter colors
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
              <div>
                <strong>Test different times</strong> and monitor how engagement patterns change
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
              <div>
                <strong>Consider time zones</strong> if your audience is geographically diverse
              </div>
            </div>
          </div>
        </ChartCard>

        <ChartCard title="Analysis Details">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400">Period Analyzed</span>
              <span className="font-medium text-gray-900 dark:text-white">{timeData.daysAnalyzed} days</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400">Total Engagements</span>
              <span className="font-medium text-gray-900 dark:text-white">{timeData.totalEngagements?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400">Peak Hour</span>
              <span className="font-medium text-gray-900 dark:text-white">{timeData.bestTime?.hourFormatted}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-600 dark:text-gray-400">Peak Day</span>
              <span className="font-medium text-gray-900 dark:text-white">{timeData.bestTime?.day}</span>
            </div>
          </div>
        </ChartCard>
      </div>
    </div>
  );
};

export default TimeOfDayDashboard;
