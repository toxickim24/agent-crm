import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  BarChart3,
  Users,
  TrendingUp,
  Mail,
  Activity,
  Clock,
  List,
  FileText,
  Radio,
  AlertTriangle,
  Settings,
  Loader
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../../config/api';
import OverviewDashboard from './dashboards/OverviewDashboard';
import ContactIntelligenceDashboard from './dashboards/ContactIntelligenceDashboard';
import CampaignAnalyticsDashboard from './dashboards/CampaignAnalyticsDashboard';
import TimeOfDayDashboard from './dashboards/TimeOfDayDashboard';
import ListAnalyticsDashboard from './dashboards/ListAnalyticsDashboard';
import EventLogDashboard from './dashboards/EventLogDashboard';
import RealTimeEventFeed from './dashboards/RealTimeEventFeed';

/**
 * Brevo Analytics - Multi-Dashboard Container
 *
 * Manages navigation between multiple analytics dashboards:
 * 1. Overview (existing enhanced dashboard)
 * 2. Contact Intelligence (engagement scoring, top contacts)
 * 3. Campaign Analytics (comparison, trends, predictions)
 */
const BrevoAnalytics = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [brevoConfigured, setBrevoConfigured] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkBrevoConfiguration();
  }, []);

  const checkBrevoConfiguration = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/brevo/account`);
      setBrevoConfigured(response.data.configured);
    } catch (error) {
      console.error('Error checking Brevo configuration:', error);
      setBrevoConfigured(false);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    {
      id: 'overview',
      name: 'Overview',
      icon: BarChart3,
      description: 'Key metrics and campaign performance'
    },
    {
      id: 'contacts',
      name: 'Contact Intelligence',
      icon: Users,
      description: 'Engagement scoring and contact insights'
    },
    {
      id: 'campaigns',
      name: 'Campaign Analytics',
      icon: Mail,
      description: 'Compare campaigns and analyze trends'
    },
    {
      id: 'timeofday',
      name: 'Time-of-Day',
      icon: Clock,
      description: 'Engagement patterns and optimal send times'
    },
    {
      id: 'lists',
      name: 'List Analytics',
      icon: List,
      description: 'List health scores and subscriber quality'
    },
    {
      id: 'events',
      name: 'Event Log',
      icon: FileText,
      description: 'View all captured webhook events (opens, clicks)'
    },
    {
      id: 'live',
      name: 'Live Feed',
      icon: Radio,
      description: 'Real-time event stream with auto-refresh'
    }
  ];

  const renderDashboard = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewDashboard />;
      case 'contacts':
        return <ContactIntelligenceDashboard />;
      case 'campaigns':
        return <CampaignAnalyticsDashboard />;
      case 'timeofday':
        return <TimeOfDayDashboard />;
      case 'lists':
        return <ListAnalyticsDashboard />;
      case 'events':
        return <EventLogDashboard />;
      case 'live':
        return <RealTimeEventFeed />;
      default:
        return <OverviewDashboard />;
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  // Show integration required message if Brevo is not configured
  if (!brevoConfigured) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-2xl mx-auto mt-20">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="text-orange-600 dark:text-orange-500" size={32} />
              </div>

              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Brevo Integration Required
              </h2>

              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
                To access Brevo Analytics, you need to configure your Brevo API key first.
                Contact your administrator or configure it in your settings.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => navigate('/dashboard/settings')}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                >
                  <Settings size={20} />
                  Go to Settings
                </button>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors font-medium"
                >
                  Back to Home
                </button>
              </div>

              <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
                  What is Brevo?
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  Brevo (formerly Sendinblue) is an email marketing platform that helps you send campaigns,
                  track opens and clicks, and analyze subscriber engagement. Once configured, you'll see
                  detailed analytics here.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Brevo Analytics
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Comprehensive email marketing insights and intelligence
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="text-green-500" size={20} />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Live
              </span>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-3 rounded-lg transition-all whitespace-nowrap
                    ${isActive
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-2 border-blue-600 dark:border-blue-400'
                      : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 border-2 border-transparent'
                    }
                  `}
                >
                  <Icon size={18} />
                  <div className="text-left">
                    <div className="text-sm font-medium">{tab.name}</div>
                    {isActive && (
                      <div className="text-xs opacity-80">{tab.description}</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="p-6">
        {renderDashboard()}
      </div>
    </div>
  );
};

export default BrevoAnalytics;
