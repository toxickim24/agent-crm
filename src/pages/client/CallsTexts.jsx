import { Phone, MessageSquare, TrendingUp, Clock } from 'lucide-react';

const CallsTexts = () => {
  // Dummy data
  const stats = [
    { label: 'Total Calls', value: '1,234', icon: Phone, color: 'blue' },
    { label: 'Calls Today', value: '45', icon: Phone, color: 'green' },
    { label: 'Total Texts', value: '3,456', icon: MessageSquare, color: 'purple' },
    { label: 'Texts Today', value: '89', icon: MessageSquare, color: 'pink' },
  ];

  const recentActivity = [
    { type: 'call', contact: 'John Smith', duration: '5:23', time: '2 hours ago', status: 'completed' },
    { type: 'text', contact: 'Sarah Johnson', message: 'Thanks for following up!', time: '3 hours ago' },
    { type: 'call', contact: 'Mike Davis', duration: '2:15', time: '4 hours ago', status: 'completed' },
    { type: 'text', contact: 'Emily Brown', message: 'Can we schedule a meeting?', time: '5 hours ago' },
    { type: 'call', contact: 'David Wilson', duration: '0:45', time: '6 hours ago', status: 'missed' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Calls & Texts</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your communication history</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <TrendingUp className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
              API Integration Required
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
              This page will display call and text data from Aloware once the API is configured by your administrator.
            </p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {recentActivity.map((activity, index) => (
            <div key={index} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-lg ${activity.type === 'call' ? 'bg-blue-100 dark:bg-blue-900/20' : 'bg-purple-100 dark:bg-purple-900/20'}`}>
                  {activity.type === 'call' ? (
                    <Phone className={`${activity.type === 'call' ? 'text-blue-600 dark:text-blue-400' : 'text-purple-600 dark:text-purple-400'}`} size={20} />
                  ) : (
                    <MessageSquare className="text-purple-600 dark:text-purple-400" size={20} />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-gray-900 dark:text-white">{activity.contact}</p>
                    <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                      <Clock size={14} />
                      {activity.time}
                    </div>
                  </div>
                  {activity.type === 'call' ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Duration: {activity.duration}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${activity.status === 'completed' ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'}`}>
                        {activity.status}
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600 dark:text-gray-400">{activity.message}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CallsTexts;
