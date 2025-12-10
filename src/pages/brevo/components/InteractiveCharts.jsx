import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

/**
 * Interactive Charts Library using Recharts
 * Pre-configured chart components for Brevo Analytics
 */

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label, formatter }) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
      <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-600 dark:text-gray-400">{entry.name}:</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {formatter ? formatter(entry.value) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

/**
 * Line Chart - For time series data
 * @param {Array} data - Chart data
 * @param {Array} lines - Array of line configurations {dataKey, name, color}
 * @param {string} xKey - Key for X axis
 * @param {Function} formatter - Value formatter function
 */
export const TimeSeriesChart = ({ data, lines, xKey = 'date', formatter, height = 300 }) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey={xKey}
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
        />
        <YAxis
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
          tickFormatter={formatter}
        />
        <Tooltip content={<CustomTooltip formatter={formatter} />} />
        <Legend
          wrapperStyle={{ fontSize: '12px' }}
          iconType="line"
        />
        {lines.map((line, index) => (
          <Line
            key={index}
            type="monotone"
            dataKey={line.dataKey}
            name={line.name}
            stroke={line.color || '#3b82f6'}
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
};

/**
 * Bar Chart - For categorical comparisons
 * @param {Array} data - Chart data
 * @param {Array} bars - Array of bar configurations {dataKey, name, color}
 * @param {string} xKey - Key for X axis
 */
export const CategoryBarChart = ({ data, bars, xKey = 'name', formatter, height = 300 }) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey={xKey}
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
        />
        <YAxis
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
          tickFormatter={formatter}
        />
        <Tooltip content={<CustomTooltip formatter={formatter} />} />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        {bars.map((bar, index) => (
          <Bar
            key={index}
            dataKey={bar.dataKey}
            name={bar.name}
            fill={bar.color || '#3b82f6'}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
};

/**
 * Area Chart - For trend visualization
 * @param {Array} data - Chart data
 * @param {Array} areas - Array of area configurations {dataKey, name, color}
 */
export const TrendAreaChart = ({ data, areas, xKey = 'date', formatter, height = 300 }) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <defs>
          {areas.map((area, index) => (
            <linearGradient key={index} id={`color${index}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={area.color || '#3b82f6'} stopOpacity={0.8} />
              <stop offset="95%" stopColor={area.color || '#3b82f6'} stopOpacity={0.1} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey={xKey}
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
        />
        <YAxis
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
          tickFormatter={formatter}
        />
        <Tooltip content={<CustomTooltip formatter={formatter} />} />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        {areas.map((area, index) => (
          <Area
            key={index}
            type="monotone"
            dataKey={area.dataKey}
            name={area.name}
            stroke={area.color || '#3b82f6'}
            fillOpacity={1}
            fill={`url(#color${index})`}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
};

/**
 * Pie Chart - For distribution visualization
 * @param {Array} data - Chart data with {name, value} format
 * @param {Array} colors - Array of colors for slices
 */
export const DistributionPieChart = ({ data, colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'], height = 300 }) => {
  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        style={{ fontSize: '12px', fontWeight: 'bold' }}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderCustomizedLabel}
          outerRadius={100}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
      </PieChart>
    </ResponsiveContainer>
  );
};

/**
 * Stacked Bar Chart - For multi-dimensional comparisons
 * @param {Array} data - Chart data
 * @param {Array} bars - Array of bar configurations
 */
export const StackedBarChart = ({ data, bars, xKey = 'name', formatter, height = 300 }) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey={xKey}
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
        />
        <YAxis
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
          tickFormatter={formatter}
        />
        <Tooltip content={<CustomTooltip formatter={formatter} />} />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        {bars.map((bar, index) => (
          <Bar
            key={index}
            dataKey={bar.dataKey}
            name={bar.name}
            stackId="a"
            fill={bar.color || '#3b82f6'}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
};

/**
 * Multi-Line Comparison Chart - For comparing multiple metrics
 */
export const ComparisonLineChart = ({ data, metrics, xKey = 'date', height = 300 }) => {
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey={xKey}
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
        />
        <YAxis
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: '12px' }} iconType="line" />
        {metrics.map((metric, index) => (
          <Line
            key={index}
            type="monotone"
            dataKey={metric.dataKey}
            name={metric.name}
            stroke={colors[index % colors.length]}
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
};

/**
 * Pre-configured chart for Campaign Performance
 */
export const CampaignPerformanceChart = ({ data }) => {
  return (
    <TimeSeriesChart
      data={data}
      xKey="campaign_name"
      lines={[
        { dataKey: 'open_rate', name: 'Open Rate', color: '#10b981' },
        { dataKey: 'click_rate', name: 'Click Rate', color: '#3b82f6' }
      ]}
      formatter={(value) => `${value}%`}
    />
  );
};

/**
 * Pre-configured chart for Engagement Trends
 */
export const EngagementTrendChart = ({ data }) => {
  return (
    <TrendAreaChart
      data={data}
      xKey="date"
      areas={[
        { dataKey: 'opens', name: 'Opens', color: '#10b981' },
        { dataKey: 'clicks', name: 'Clicks', color: '#3b82f6' }
      ]}
    />
  );
};

/**
 * Pre-configured chart for Tier Distribution
 */
export const TierDistributionChart = ({ data }) => {
  return (
    <DistributionPieChart
      data={data}
      colors={['#10b981', '#f59e0b', '#6b7280']}
    />
  );
};

export default {
  TimeSeriesChart,
  CategoryBarChart,
  TrendAreaChart,
  DistributionPieChart,
  StackedBarChart,
  ComparisonLineChart,
  CampaignPerformanceChart,
  EngagementTrendChart,
  TierDistributionChart
};
