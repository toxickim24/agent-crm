import { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, UserPlus, Phone, MessageSquare, Mail, Send, MousePointer, Eye, DollarSign, TrendingUp, BarChart3 } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import API_BASE_URL from '../../config/api';
import { useAuth } from '../../contexts/AuthContext';

const Home = () => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [leadTypes, setLeadTypes] = useState([]);
  const [mailerStats, setMailerStats] = useState({ total: 0, today: 0, totalCost: 0 });
  const [mailchimpStats, setMailchimpStats] = useState({
    total_sent: 0,
    total_opens: 0,
    total_clicks: 0,
    avg_open_rate: 0,
    avg_click_rate: 0
  });
  const [totalCampaigns, setTotalCampaigns] = useState(0);
  const [dailyEmailStats, setDailyEmailStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [contactsRes, leadTypesRes, mailerStatsRes, mailchimpStatsRes, campaignsRes, dailyEmailRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/contacts`),
        axios.get(`${API_BASE_URL}/lead-types`),
        axios.get(`${API_BASE_URL}/mailers/stats`),
        axios.get(`${API_BASE_URL}/mailchimp/stats`).catch(() => ({ data: {} })),
        axios.get(`${API_BASE_URL}/mailchimp/campaigns`).catch(() => ({ data: { campaigns: [] } })),
        axios.get(`${API_BASE_URL}/mailchimp/stats/daily?days=30`).catch(() => ({ data: { dailyStats: [] } }))
      ]);
      setContacts(contactsRes.data.contacts);
      setLeadTypes(leadTypesRes.data);
      setMailerStats(mailerStatsRes.data);
      setMailchimpStats(mailchimpStatsRes.data);
      setTotalCampaigns(campaignsRes.data.campaigns?.length || 0);
      setDailyEmailStats(dailyEmailRes.data.dailyStats || []);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate metrics
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const totalContacts = contacts.length;
  const newContactsToday = contacts.filter(c => {
    const createdDate = new Date(c.created_at);
    createdDate.setHours(0, 0, 0, 0);
    return createdDate.getTime() === today.getTime();
  }).length;

  // Calculate monthly data (last 30 days)
  const monthlyData = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    const dateStr = date.toISOString().split('T')[0];

    const dayContacts = contacts.filter(c => {
      const createdDate = new Date(c.created_at);
      createdDate.setHours(0, 0, 0, 0);
      return createdDate.getTime() === date.getTime();
    }).length;

    // Find email stats for this date
    const emailStats = dailyEmailStats.find(stat => {
      const statDate = new Date(stat.date);
      return statDate.toISOString().split('T')[0] === dateStr;
    });

    monthlyData.push({
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      contacts: dayContacts,
      emails: emailStats ? parseInt(emailStats.emails_sent) || 0 : 0,
      calls: 0   // Placeholder for future implementation
    });
  }

  // Calculate lead type distribution
  const leadTypeData = leadTypes.map(type => {
    const count = contacts.filter(c => c.lead_type === type.id).length;
    return {
      name: type.name,
      value: count,
      color: type.color
    };
  }).filter(item => item.value > 0); // Only show types with contacts

  // Helper function to check permissions
  const hasPermission = (permission) => {
    if (!user) return false;
    return user[permission] === 1 || user[permission] === true;
  };

  // Define all metrics with their permission requirements
  const allMetrics = [
    { label: 'Total Contacts', value: totalContacts.toString(), icon: Users, change: `+${newContactsToday} today`, color: 'blue', permission: 'contacts' },
    { label: 'New Contacts Today', value: newContactsToday.toString(), icon: UserPlus, change: 'Today', color: 'green', permission: 'contacts' },
    { label: 'Total Sent', value: (mailchimpStats.total_sent || 0).toLocaleString(), icon: Mail, change: 'Email campaigns', color: 'indigo', permission: 'emails' },
    { label: 'Total Opens', value: (mailchimpStats.total_opens || 0).toLocaleString(), icon: Eye, change: 'All campaigns', color: 'teal', permission: 'emails' },
    { label: 'Total Clicks', value: (mailchimpStats.total_clicks || 0).toLocaleString(), icon: MousePointer, change: 'All campaigns', color: 'cyan', permission: 'emails' },
    { label: 'Avg Open Rate', value: `${(mailchimpStats.avg_open_rate || 0).toFixed(1)}%`, icon: TrendingUp, change: 'Campaign average', color: 'green', permission: 'emails' },
    { label: 'Avg Click Rate', value: `${(mailchimpStats.avg_click_rate || 0).toFixed(1)}%`, icon: TrendingUp, change: 'Campaign average', color: 'blue', permission: 'emails' },
    { label: 'Total Campaigns', value: totalCampaigns.toString(), icon: BarChart3, change: 'All lead types', color: 'purple', permission: 'emails' },
    { label: 'Total Mailers Sent', value: mailerStats.total?.toString() || '0', icon: Send, change: 'All time', color: 'pink', permission: 'mailers' },
    { label: 'Mailers Sent Today', value: mailerStats.today?.toString() || '0', icon: Send, change: 'Today', color: 'orange', permission: 'mailers' },
    { label: 'Mail Campaign Cost', value: `$${mailerStats.totalCost?.toFixed(2) || '0.00'}`, icon: DollarSign, change: 'Total spent', color: 'red', permission: 'mailers' },
  ];

  // Filter metrics based on user permissions
  const metrics = allMetrics.filter(metric => hasPermission(metric.permission));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

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
      orange: 'bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
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
        {/* Monthly Activity Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Monthly Activity (Last 30 Days)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                stroke="#9ca3af"
                tick={{ fontSize: 10 }}
                interval={4}
              />
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
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Email Performance Trend (Last 30 Days)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="date"
              stroke="#9ca3af"
              tick={{ fontSize: 10 }}
              interval={4}
            />
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
