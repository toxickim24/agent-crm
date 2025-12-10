/**
 * Brevo Analytics - Reusable Widget Library
 *
 * Collection of reusable dashboard widgets:
 * 1. StatCard - KPI cards with icons and trend indicators
 * 2. MetricBox - Centered metric displays
 * 3. EngagementGauge - Circular progress gauge for scores
 * 4. TrendChart - Mini sparkline charts
 * 5. ProgressBar - Horizontal progress indicators
 * 6. ComparisonCard - Side-by-side comparisons
 * 7. AlertBanner - Status/alert messages
 * 8. DataTable - Sortable data tables
 * 9. ChartCard - Container for charts with headers
 * 10. EmptyState - No data placeholders
 */

import { TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle, Info, Clock, RefreshCw } from 'lucide-react';

// 1. StatCard - KPI Card with Icon and Trend
export const StatCard = ({ title, value, icon, trend, trendValue, onClick, className = '' }) => {
  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend === 'up') return <TrendingUp className="text-green-500" size={16} />;
    if (trend === 'down') return <TrendingDown className="text-red-500" size={16} />;
    return <Minus className="text-gray-500" size={16} />;
  };

  const getTrendColor = () => {
    if (trend === 'up') return 'text-green-600 dark:text-green-400';
    if (trend === 'down') return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  return (
    <div
      onClick={onClick}
      className={`
        bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700
        transition-shadow ${onClick ? 'hover:shadow-lg cursor-pointer' : ''}
        ${className}
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
            {value}
          </p>
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              {getTrendIcon()}
              <span className={`text-sm font-medium ${getTrendColor()}`}>
                {trendValue}
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};

// 2. MetricBox - Centered Metric Display
export const MetricBox = ({ label, value, icon, className = '', colorClass = 'text-blue-500' }) => (
  <div className={`text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 ${className}`}>
    {icon && (
      <div className="flex justify-center mb-2">
        <div className={colorClass}>{icon}</div>
      </div>
    )}
    <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{label}</p>
  </div>
);

// 3. EngagementGauge - Circular Progress Gauge
export const EngagementGauge = ({ score, size = 120, label = 'Score' }) => {
  const percentage = Math.min(100, Math.max(0, score));
  const circumference = 2 * Math.PI * 40; // radius = 40
  const offset = circumference - (percentage / 100) * circumference;

  const getColor = () => {
    if (score >= 80) return '#10b981'; // green
    if (score >= 60) return '#3b82f6'; // blue
    if (score >= 40) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  const getLabel = () => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Work';
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r="40"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="8"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r="40"
            fill="none"
            stroke={getColor()}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-gray-900 dark:text-white">{score}</span>
          <span className="text-xs text-gray-600 dark:text-gray-400">{getLabel()}</span>
        </div>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{label}</p>
    </div>
  );
};

// 4. TrendChart - Mini Sparkline (simplified)
export const TrendChart = ({ data = [], color = '#3b82f6', height = 40 }) => {
  if (!data || data.length === 0) return <div style={{ height }} className="bg-gray-100 dark:bg-gray-700 rounded" />;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 100;
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="w-full">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// 5. ProgressBar - Horizontal Progress
export const ProgressBar = ({ label, value, max = 100, colorClass = 'bg-blue-500', showPercentage = true }) => {
  const percentage = Math.min(100, (value / max) * 100);

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-400">{label}</span>
        {showPercentage && (
          <span className="text-gray-900 dark:text-white font-medium">
            {percentage.toFixed(1)}%
          </span>
        )}
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${colorClass}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

// 6. ComparisonCard - Side-by-Side Comparison
export const ComparisonCard = ({ label, value1, value2, label1 = 'Before', label2 = 'After' }) => {
  const diff = value2 - value1;
  const percentChange = value1 !== 0 ? ((diff / value1) * 100).toFixed(1) : 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{label}</p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-500">{label1}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value1}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-500">{label2}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value2}</p>
        </div>
      </div>
      <div className={`mt-2 text-sm font-medium ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
        {diff >= 0 ? '+' : ''}{percentChange}% change
      </div>
    </div>
  );
};

// 7. AlertBanner - Status Messages
export const AlertBanner = ({ type = 'info', message, onDismiss }) => {
  const styles = {
    info: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-900 dark:text-blue-300',
      icon: <Info className="text-blue-600 dark:text-blue-400" size={20} />
    },
    success: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      text: 'text-green-900 dark:text-green-300',
      icon: <CheckCircle className="text-green-600 dark:text-green-400" size={20} />
    },
    warning: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      text: 'text-yellow-900 dark:text-yellow-300',
      icon: <AlertCircle className="text-yellow-600 dark:text-yellow-400" size={20} />
    },
    error: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-900 dark:text-red-300',
      icon: <AlertCircle className="text-red-600 dark:text-red-400" size={20} />
    }
  };

  const style = styles[type] || styles.info;

  return (
    <div className={`${style.bg} border ${style.border} rounded-lg p-4`}>
      <div className="flex items-start gap-3">
        {style.icon}
        <div className="flex-1">
          <p className={`text-sm ${style.text}`}>{message}</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className={`text-sm ${style.text} hover:opacity-75`}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};

// 8. DataTable - Sortable Table Component
export const DataTable = ({ columns, data, onRowClick, className = '' }) => {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            {columns.map((column, index) => (
              <th
                key={index}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                No data available
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                onClick={() => onRowClick && onRowClick(row)}
                className={`${onRowClick ? 'hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer' : ''}`}
              >
                {columns.map((column, colIndex) => (
                  <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

// 9. ChartCard - Container for Charts
export const ChartCard = ({ title, children, action, className = '' }) => (
  <div className={`bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 ${className}`}>
    <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
      {action && <div>{action}</div>}
    </div>
    <div className="p-6">
      {children}
    </div>
  </div>
);

// 10. EmptyState - No Data Placeholder
export const EmptyState = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-12 px-4">
    {icon && (
      <div className="text-gray-400 dark:text-gray-600 mb-4">
        {icon}
      </div>
    )}
    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{title}</h3>
    <p className="text-sm text-gray-600 dark:text-gray-400 text-center max-w-md mb-6">
      {description}
    </p>
    {action && <div>{action}</div>}
  </div>
);

// 11. Heatmap - Time-of-Day Engagement Heatmap
export const Heatmap = ({ data, maxValue }) => {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Get color intensity based on value
  const getColor = (value, max) => {
    if (!value || value === 0) return 'bg-gray-100 dark:bg-gray-700';
    const intensity = (value / max) * 100;
    if (intensity >= 80) return 'bg-blue-700';
    if (intensity >= 60) return 'bg-blue-600';
    if (intensity >= 40) return 'bg-blue-500';
    if (intensity >= 20) return 'bg-blue-400';
    return 'bg-blue-300';
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-max">
        {/* Header with day names */}
        <div className="flex gap-1 mb-1">
          <div className="w-12 text-xs text-gray-500 dark:text-gray-400 text-right pr-2"></div>
          {dayNames.map((day, index) => (
            <div key={index} className="w-12 text-xs text-gray-600 dark:text-gray-400 text-center font-medium">
              {day}
            </div>
          ))}
        </div>

        {/* Heatmap grid */}
        {[...Array(24)].map((_, hour) => (
          <div key={hour} className="flex gap-1 mb-1">
            {/* Hour label */}
            <div className="w-12 text-xs text-gray-500 dark:text-gray-400 text-right pr-2">
              {hour === 0 ? '12a' : hour < 12 ? `${hour}a` : hour === 12 ? '12p' : `${hour - 12}p`}
            </div>

            {/* Day cells */}
            {[1, 2, 3, 4, 5, 6, 7].map(day => {
              const cellData = data?.[day]?.[hour] || { total: 0, opens: 0, clicks: 0 };
              const colorClass = getColor(cellData.total, maxValue);

              return (
                <div
                  key={day}
                  className={`w-12 h-8 ${colorClass} rounded transition-all hover:scale-110 cursor-pointer relative group`}
                  title={`${dayNames[day - 1]} ${hour}:00\nOpens: ${cellData.opens}\nClicks: ${cellData.clicks}\nTotal: ${cellData.total}`}
                >
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                    <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                      <div className="font-medium">{dayNames[day - 1]} {hour}:00</div>
                      <div>Opens: {cellData.opens}</div>
                      <div>Clicks: {cellData.clicks}</div>
                      <div className="border-t border-gray-700 mt-1 pt-1">Total: {cellData.total}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {/* Legend */}
        <div className="flex items-center gap-2 mt-4 text-xs text-gray-600 dark:text-gray-400">
          <span>Less</span>
          <div className="w-4 h-4 bg-gray-100 dark:bg-gray-700 rounded"></div>
          <div className="w-4 h-4 bg-blue-300 rounded"></div>
          <div className="w-4 h-4 bg-blue-400 rounded"></div>
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <div className="w-4 h-4 bg-blue-600 rounded"></div>
          <div className="w-4 h-4 bg-blue-700 rounded"></div>
          <span>More</span>
        </div>
      </div>
    </div>
  );
};

// 12. Skeleton Loading Components
export const SkeletonCard = () => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-3"></div>
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
      </div>
      <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
    </div>
  </div>
);

export const SkeletonTable = ({ rows = 5, columns = 4 }) => (
  <div className="overflow-x-auto animate-pulse">
    <table className="w-full">
      <thead className="bg-gray-50 dark:bg-gray-700">
        <tr>
          {[...Array(columns)].map((_, i) => (
            <th key={i} className="px-6 py-3">
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-20"></div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
        {[...Array(rows)].map((_, rowIndex) => (
          <tr key={rowIndex}>
            {[...Array(columns)].map((_, colIndex) => (
              <td key={colIndex} className="px-6 py-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const SkeletonText = ({ lines = 3, className = '' }) => (
  <div className={`space-y-2 animate-pulse ${className}`}>
    {[...Array(lines)].map((_, i) => (
      <div
        key={i}
        className={`h-4 bg-gray-200 dark:bg-gray-700 rounded ${i === lines - 1 ? 'w-2/3' : 'w-full'}`}
      ></div>
    ))}
  </div>
);

export const SkeletonChart = ({ height = 200 }) => (
  <div className="animate-pulse" style={{ height }}>
    <div className="flex items-end justify-around h-full gap-2">
      {[...Array(7)].map((_, i) => (
        <div
          key={i}
          className="bg-gray-200 dark:bg-gray-700 rounded-t w-full"
          style={{ height: `${Math.random() * 80 + 20}%` }}
        ></div>
      ))}
    </div>
  </div>
);

// 13. Data Freshness Indicator
export const DataFreshness = ({ lastUpdated, onRefresh, isRefreshing = false }) => {
  const getTimeAgo = (timestamp) => {
    if (!timestamp) return 'Never';
    const now = new Date();
    const updated = new Date(timestamp);
    const diffMs = now - updated;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
      <Clock size={12} />
      <span>Updated {getTimeAgo(lastUpdated)}</span>
      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
          title="Refresh data"
        >
          <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
        </button>
      )}
    </div>
  );
};

// 14. Enhanced StatCard with Comparison
export const StatCardWithComparison = ({
  title,
  value,
  icon,
  previousValue,
  previousLabel = 'vs last period',
  comparisonLabel,
  onClick,
  className = ''
}) => {
  const change = previousValue ? value - previousValue : 0;
  const percentChange = previousValue && previousValue !== 0
    ? ((change / previousValue) * 100).toFixed(1)
    : 0;
  const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'neutral';

  return (
    <StatCard
      title={title}
      value={value}
      icon={icon}
      trend={trend}
      trendValue={`${change >= 0 ? '+' : ''}${percentChange}% ${previousLabel}`}
      onClick={onClick}
      className={className}
    />
  );
};

// 15. Loading Overlay
export const LoadingOverlay = ({ message = 'Loading...' }) => (
  <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
    <div className="text-center">
      <RefreshCw className="animate-spin mx-auto mb-2 text-blue-600" size={32} />
      <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
    </div>
  </div>
);

export default {
  StatCard,
  MetricBox,
  EngagementGauge,
  TrendChart,
  ProgressBar,
  ComparisonCard,
  AlertBanner,
  DataTable,
  ChartCard,
  EmptyState,
  Heatmap,
  SkeletonCard,
  SkeletonTable,
  SkeletonText,
  SkeletonChart,
  DataFreshness,
  StatCardWithComparison,
  LoadingOverlay
};
