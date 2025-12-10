import { useState, useEffect } from 'react';
import axios from 'axios';
import { Mail, TrendingUp, BarChart3, Target, Award, TrendingDown } from 'lucide-react';
import { StatCard, DataTable, ChartCard, AlertBanner, EmptyState } from '../components/Widgets';
import API_BASE_URL from '../../../config/api';

const CampaignAnalyticsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [benchmarksLoading, setBenchmarksLoading] = useState(true);
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaigns, setSelectedCampaigns] = useState([]);
  const [benchmarks, setBenchmarks] = useState(null);

  useEffect(() => {
    fetchCampaigns();
    fetchBenchmarks();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/brevo/stats/recent?limit=50`);
      setCampaigns(res.data.campaigns || []);
    } catch (err) {
      console.error('Error fetching campaigns:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBenchmarks = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/brevo/analytics/campaign-benchmarks`);
      setBenchmarks(res.data);
    } catch (err) {
      console.error('Error fetching campaign benchmarks:', err);
    } finally {
      setBenchmarksLoading(false);
    }
  };

  const toggleCampaignSelection = (campaignId) => {
    setSelectedCampaigns(prev => {
      if (prev.includes(campaignId)) {
        return prev.filter(id => id !== campaignId);
      } else if (prev.length < 5) {
        return [...prev, campaignId];
      }
      return prev;
    });
  };

  const selectedCampaignData = campaigns.filter(c =>
    selectedCampaigns.includes(c.brevo_campaign_id)
  );

  const campaignColumns = [
    {
      header: 'Select',
      key: 'select',
      render: (row) => (
        <input
          type="checkbox"
          checked={selectedCampaigns.includes(row.brevo_campaign_id)}
          onChange={() => toggleCampaignSelection(row.brevo_campaign_id)}
          disabled={selectedCampaigns.length >= 5 && !selectedCampaigns.includes(row.brevo_campaign_id)}
          className="w-4 h-4"
        />
      )
    },
    { header: 'Campaign', key: 'campaign_name' },
    { header: 'Sent', key: 'stats_sent' },
    { header: 'Open Rate', key: 'open_rate', render: (row) => `${row.open_rate}%` },
    { header: 'Click Rate', key: 'click_rate', render: (row) => `${row.click_rate}%` },
    { header: 'Sent Date', key: 'sent_date', render: (row) => row.sent_date ? new Date(row.sent_date).toLocaleDateString() : 'N/A' }
  ];

  const comparisonColumns = [
    { header: 'Metric', key: 'metric' },
    ...selectedCampaignData.map((c, i) => ({
      header: `Campaign ${i + 1}`,
      key: `campaign${i}`,
      render: (row) => row.values[i]
    }))
  ];

  const comparisonData = selectedCampaignData.length > 0 ? [
    { metric: 'Campaign Name', values: selectedCampaignData.map(c => c.campaign_name) },
    { metric: 'Sent', values: selectedCampaignData.map(c => c.stats_sent) },
    { metric: 'Delivered', values: selectedCampaignData.map(c => c.stats_delivered) },
    { metric: 'Opens', values: selectedCampaignData.map(c => c.stats_unique_opens) },
    { metric: 'Clicks', values: selectedCampaignData.map(c => c.stats_unique_clicks) },
    { metric: 'Open Rate', values: selectedCampaignData.map(c => `${c.open_rate}%`) },
    { metric: 'Click Rate', values: selectedCampaignData.map(c => `${c.click_rate}%`) }
  ] : [];

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading campaigns...</div>;
  }

  const topPerformersColumns = [
    { header: 'Rank', key: 'rank', render: (row) => `#${row.rank}` },
    { header: 'Campaign', key: 'campaignName' },
    { header: 'Open Rate', key: 'openRate', render: (row) => `${row.openRate}%` },
    { header: 'Click Rate', key: 'clickRate', render: (row) => `${row.clickRate}%` },
    { header: 'Engagement Score', key: 'engagementScore', render: (row) => (
      <span className="font-bold text-green-600 dark:text-green-400">{row.engagementScore}</span>
    )}
  ];

  const bottomPerformersColumns = [
    { header: 'Rank', key: 'rank', render: (row) => `#${row.rank}` },
    { header: 'Campaign', key: 'campaignName' },
    { header: 'Open Rate', key: 'openRate', render: (row) => `${row.openRate}%` },
    { header: 'Click Rate', key: 'clickRate', render: (row) => `${row.clickRate}%` },
    { header: 'Engagement Score', key: 'engagementScore', render: (row) => (
      <span className="font-bold text-red-600 dark:text-red-400">{row.engagementScore}</span>
    )}
  ];

  return (
    <div className="space-y-6">
      {/* Phase 3: Campaign Benchmarks */}
      {!benchmarksLoading && benchmarks && benchmarks.totalCampaigns > 0 && (
        <>
          {/* Benchmark Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Campaigns"
              value={benchmarks.totalCampaigns || 0}
              icon={<Mail className="text-blue-500" />}
            />
            <StatCard
              title="Avg Open Rate"
              value={`${benchmarks.averages?.openRate || 0}%`}
              icon={<TrendingUp className="text-green-500" />}
              trend={benchmarks.performance?.vs_industry_open >= 0 ? 'up' : 'down'}
              trendValue={`${Math.abs(benchmarks.performance?.vs_industry_open || 0).toFixed(1)}%`}
            />
            <StatCard
              title="Avg Click Rate"
              value={`${benchmarks.averages?.clickRate || 0}%`}
              icon={<Target className="text-purple-500" />}
              trend={benchmarks.performance?.vs_industry_click >= 0 ? 'up' : 'down'}
              trendValue={`${Math.abs(benchmarks.performance?.vs_industry_click || 0).toFixed(1)}%`}
            />
            <StatCard
              title="Avg Bounce Rate"
              value={`${benchmarks.averages?.bounceRate || 0}%`}
              icon={<TrendingDown className="text-orange-500" />}
            />
          </div>

          {/* Industry Benchmark Comparison */}
          <ChartCard title="Industry Benchmark Comparison">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { metric: 'Open Rate', yours: benchmarks.averages?.openRate, industry: benchmarks.industryBenchmarks?.openRate },
                { metric: 'Click Rate', yours: benchmarks.averages?.clickRate, industry: benchmarks.industryBenchmarks?.clickRate },
                { metric: 'Bounce Rate', yours: benchmarks.averages?.bounceRate, industry: benchmarks.industryBenchmarks?.bounceRate },
                { metric: 'Unsubscribe Rate', yours: benchmarks.averages?.unsubscribeRate, industry: benchmarks.industryBenchmarks?.unsubscribeRate }
              ].map((item, index) => {
                const isGood = item.metric.includes('Rate') && !item.metric.includes('Bounce') && !item.metric.includes('Unsub')
                  ? parseFloat(item.yours) >= parseFloat(item.industry)
                  : parseFloat(item.yours) <= parseFloat(item.industry);

                return (
                  <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">{item.metric}</div>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-2xl font-bold ${isGood ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                        {parseFloat(item.yours).toFixed(2)}%
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        vs {parseFloat(item.industry).toFixed(2)}%
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {isGood ? '✓ Above' : '↓ Below'} industry avg
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                <strong>Source:</strong> {benchmarks.industryBenchmarks?.source || 'Industry Average 2024'}
              </p>
            </div>
          </ChartCard>

          {/* Top & Bottom Performers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Top 5 Performing Campaigns" icon={<Award className="text-green-500" />}>
              <DataTable
                columns={topPerformersColumns}
                data={benchmarks.topPerformers || []}
              />
            </ChartCard>

            <ChartCard title="Bottom 5 Performing Campaigns" icon={<TrendingDown className="text-red-500" />}>
              <DataTable
                columns={bottomPerformersColumns}
                data={benchmarks.bottomPerformers || []}
              />
            </ChartCard>
          </div>
        </>
      )}

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-900 dark:text-blue-300">
          Select up to 5 campaigns to compare their performance metrics side-by-side.
          {selectedCampaigns.length > 0 && ` (${selectedCampaigns.length}/5 selected)`}
        </p>
      </div>

      {/* Campaign Selection Table */}
      <ChartCard title="Campaign Selection">
        <DataTable
          columns={campaignColumns}
          data={campaigns}
        />
      </ChartCard>

      {/* Comparison Results */}
      {selectedCampaigns.length > 0 && (
        <ChartCard title={`Comparing ${selectedCampaigns.length} Campaigns`}>
          <DataTable
            columns={comparisonColumns}
            data={comparisonData}
          />
        </ChartCard>
      )}

      {selectedCampaigns.length === 0 && (
        <EmptyState
          icon={<BarChart3 size={48} />}
          title="No Campaigns Selected"
          description="Select campaigns from the table above to compare their performance."
        />
      )}
    </div>
  );
};

export default CampaignAnalyticsDashboard;
