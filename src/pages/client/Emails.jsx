import { Mail, Eye, MousePointer, Send, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const Emails = () => {
  const stats = [
    { label: 'Total Sent', value: '0', icon: Send, color: 'blue' },
    { label: 'Sent Today', value: '0', icon: Send, color: 'green' },
    { label: 'Total Opens', value: '0', icon: Eye, color: 'purple' },
    { label: 'Total Clicks', value: '0', icon: MousePointer, color: 'pink' },
    { label: 'Opens Today', value: '0', icon: Eye, color: 'indigo' },
    { label: 'Clicks Today', value: '0', icon: MousePointer, color: 'cyan' },
  ];

  const performanceData = [
    { date: 'Jan 1', sent: 0, opens: 0, clicks: 0 },
    { date: 'Jan 2', sent: 0, opens: 0, clicks: 0 },
    { date: 'Jan 3', sent: 0, opens: 0, clicks: 0 },
    { date: 'Jan 4', sent: 0, opens: 0, clicks: 0 },
    { date: 'Jan 5', sent: 0, opens: 0, clicks: 0 },
    { date: 'Jan 6', sent: 0, opens: 0, clicks: 0 },
    { date: 'Jan 7', sent: 0, opens: 0, clicks: 0 },
  ];

  const campaigns = [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Email Campaigns</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Track your email marketing performance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg bg-${stat.color}-100 dark:bg-${stat.color}-900/20`}>
                <stat.icon className={`text-${stat.color}-600 dark:text-${stat.color}-400`} size={24} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* API Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <TrendingUp className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
              Mailchimp Integration Required
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
              This page will display email campaign data from Mailchimp once the API is configured by your administrator.
            </p>
          </div>
        </div>
      </div>

      {/* Performance Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Email Performance</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={performanceData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="date" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '0.5rem',
              }}
            />
            <Legend />
            <Line type="monotone" dataKey="sent" stroke="#3b82f6" strokeWidth={2} name="Sent" />
            <Line type="monotone" dataKey="opens" stroke="#8b5cf6" strokeWidth={2} name="Opens" />
            <Line type="monotone" dataKey="clicks" stroke="#ec4899" strokeWidth={2} name="Clicks" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Campaigns</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Campaign</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Sent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Opens</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Clicks</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Open Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {campaigns.map((campaign, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{campaign.name}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{campaign.sent.toLocaleString()}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{campaign.opens.toLocaleString()}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{campaign.clicks.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full text-sm font-medium">
                      {campaign.rate}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Emails;
