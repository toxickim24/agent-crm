import { Users, UserPlus, Phone, MessageSquare, Mail, Send, MousePointer, Eye, DollarSign } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const Home = () => {
  // Dummy data for metrics
  const metrics = [
    { label: 'Total Contacts', value: '1,247', icon: Users, change: '+12%', color: 'blue' },
    { label: 'New Contacts Today', value: '34', icon: UserPlus, change: '+8', color: 'green' },
    { label: 'Calls Today', value: '127', icon: Phone, change: '+23', color: 'purple' },
    { label: 'Texts Today', value: '89', icon: MessageSquare, change: '+15', color: 'pink' },
    { label: 'Total Emails Sent', value: '8,432', icon: Mail, change: '+245', color: 'indigo' },
    { label: 'Emails Sent Today', value: '156', icon: Mail, change: '+34', color: 'blue' },
    { label: 'Total Clicks', value: '3,241', icon: MousePointer, change: '+189', color: 'cyan' },
    { label: 'Total Opens', value: '5,678', icon: Eye, change: '+324', color: 'teal' },
    { label: 'Opens Today', value: '234', icon: Eye, change: '+45', color: 'green' },
    { label: 'Clicks Today', value: '89', icon: MousePointer, change: '+12', color: 'blue' },
    { label: 'Total Mailers Sent', value: '2,145', icon: Send, change: '+78', color: 'purple' },
    { label: 'Mailers Sent Today', value: '23', icon: Send, change: '+5', color: 'pink' },
    { label: 'Mail Campaign Cost', value: '$4,289', icon: DollarSign, change: '+$245', color: 'red' },
  ];

  // Dummy data for charts
  const weeklyData = [
    { day: 'Mon', contacts: 45, emails: 120, calls: 67 },
    { day: 'Tue', contacts: 52, emails: 145, calls: 78 },
    { day: 'Wed', contacts: 38, emails: 98, calls: 54 },
    { day: 'Thu', contacts: 61, emails: 167, calls: 89 },
    { day: 'Fri', contacts: 49, emails: 134, calls: 72 },
    { day: 'Sat', contacts: 28, emails: 76, calls: 41 },
    { day: 'Sun', contacts: 34, emails: 89, calls: 48 },
  ];

  const leadTypeData = [
    { name: 'Probate', value: 324, color: '#3b82f6' },
    { name: 'Refi', value: 289, color: '#8b5cf6' },
    { name: 'Equity', value: 213, color: '#ec4899' },
    { name: 'Permit', value: 187, color: '#10b981' },
    { name: 'New Home', value: 234, color: '#f59e0b' },
  ];

  const getColorClass = (color) => {
    const colors = {
      blue: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
      green: 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400',
      purple: 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
      pink: 'bg-pink-100 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400',
      indigo: 'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
      cyan: 'bg-cyan-100 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400',
      teal: 'bg-teal-100 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400',
      red: 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400',
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Welcome back! Here's your overview.</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{metric.label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{metric.value}</p>
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">{metric.change}</p>
              </div>
              <div className={`p-3 rounded-lg ${getColorClass(metric.color)}`}>
                <metric.icon size={24} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Activity Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Weekly Activity</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="day" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '0.5rem',
                }}
              />
              <Legend />
              <Bar dataKey="contacts" fill="#3b82f6" name="New Contacts" />
              <Bar dataKey="emails" fill="#8b5cf6" name="Emails Sent" />
              <Bar dataKey="calls" fill="#10b981" name="Calls Made" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Lead Types Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Lead Types Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={leadTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {leadTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Email Performance Trend */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Email Performance Trend</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={weeklyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="day" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '0.5rem',
              }}
            />
            <Legend />
            <Line type="monotone" dataKey="emails" stroke="#3b82f6" strokeWidth={2} name="Emails Sent" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Home;
