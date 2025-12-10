import { useState } from 'react';
import { Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

/**
 * Date Range Comparison Component
 * Allows users to compare metrics across different time periods
 */

const PRESET_RANGES = [
  { label: 'Last 7 Days', getValue: () => ({ start: subDays(new Date(), 7), end: new Date() }) },
  { label: 'Last 30 Days', getValue: () => ({ start: subDays(new Date(), 30), end: new Date() }) },
  { label: 'Last 90 Days', getValue: () => ({ start: subDays(new Date(), 90), end: new Date() }) },
  { label: 'This Month', getValue: () => ({ start: startOfMonth(new Date()), end: new Date() }) },
  { label: 'Last Month', getValue: () => {
    const lastMonth = subMonths(new Date(), 1);
    return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
  }},
  { label: 'This Year', getValue: () => ({ start: startOfYear(new Date()), end: new Date() }) },
  { label: 'Custom', getValue: () => null }
];

const COMPARISON_OPTIONS = [
  { value: 'previous_period', label: 'Previous Period' },
  { value: 'previous_month', label: 'Previous Month' },
  { value: 'previous_year', label: 'Previous Year' },
  { value: 'custom', label: 'Custom Comparison' }
];

export const DateRangeComparison = ({ onApply, onClose }) => {
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [customRange, setCustomRange] = useState({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const [comparisonType, setComparisonType] = useState('previous_period');
  const [customComparison, setCustomComparison] = useState({
    start: '',
    end: ''
  });

  const getCurrentRange = () => {
    if (selectedPreset === PRESET_RANGES.length - 1) {
      return {
        start: new Date(customRange.start),
        end: new Date(customRange.end)
      };
    }
    return PRESET_RANGES[selectedPreset].getValue();
  };

  const getComparisonRange = () => {
    const currentRange = getCurrentRange();
    if (!currentRange) return null;

    const daysDiff = Math.floor((currentRange.end - currentRange.start) / (1000 * 60 * 60 * 24));

    switch (comparisonType) {
      case 'previous_period':
        return {
          start: subDays(currentRange.start, daysDiff + 1),
          end: subDays(currentRange.end, daysDiff + 1)
        };
      case 'previous_month':
        return {
          start: subMonths(currentRange.start, 1),
          end: subMonths(currentRange.end, 1)
        };
      case 'previous_year':
        return {
          start: new Date(currentRange.start.getFullYear() - 1, currentRange.start.getMonth(), currentRange.start.getDate()),
          end: new Date(currentRange.end.getFullYear() - 1, currentRange.end.getMonth(), currentRange.end.getDate())
        };
      case 'custom':
        if (customComparison.start && customComparison.end) {
          return {
            start: new Date(customComparison.start),
            end: new Date(customComparison.end)
          };
        }
        return null;
      default:
        return null;
    }
  };

  const handleApply = () => {
    const currentRange = getCurrentRange();
    const comparisonRange = getComparisonRange();

    if (currentRange && comparisonRange) {
      onApply({
        current: currentRange,
        comparison: comparisonRange
      });
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Calendar className="text-blue-600" size={24} />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Date Range Comparison
          </h3>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          ✕
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Primary Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Primary Period
          </label>

          {/* Preset Options */}
          <div className="space-y-2 mb-4">
            {PRESET_RANGES.map((preset, index) => (
              <label
                key={index}
                className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
              >
                <input
                  type="radio"
                  name="preset"
                  checked={selectedPreset === index}
                  onChange={() => setSelectedPreset(index)}
                  className="text-blue-600"
                />
                <span className="text-sm text-gray-900 dark:text-white">{preset.label}</span>
              </label>
            ))}
          </div>

          {/* Custom Date Inputs */}
          {selectedPreset === PRESET_RANGES.length - 1 && (
            <div className="space-y-2">
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={customRange.start}
                  onChange={(e) => setCustomRange({ ...customRange, start: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={customRange.end}
                  onChange={(e) => setCustomRange({ ...customRange, end: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                />
              </div>
            </div>
          )}

          {/* Current Range Display */}
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-xs text-blue-600 dark:text-blue-400 mb-1">Selected Range</div>
            {getCurrentRange() && (
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {format(getCurrentRange().start, 'MMM d, yyyy')} - {format(getCurrentRange().end, 'MMM d, yyyy')}
              </div>
            )}
          </div>
        </div>

        {/* Comparison Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Compare To
          </label>

          {/* Comparison Options */}
          <div className="space-y-2 mb-4">
            {COMPARISON_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
              >
                <input
                  type="radio"
                  name="comparison"
                  value={option.value}
                  checked={comparisonType === option.value}
                  onChange={(e) => setComparisonType(e.target.value)}
                  className="text-blue-600"
                />
                <span className="text-sm text-gray-900 dark:text-white">{option.label}</span>
              </label>
            ))}
          </div>

          {/* Custom Comparison Inputs */}
          {comparisonType === 'custom' && (
            <div className="space-y-2">
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={customComparison.start}
                  onChange={(e) => setCustomComparison({ ...customComparison, start: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={customComparison.end}
                  onChange={(e) => setCustomComparison({ ...customComparison, end: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                />
              </div>
            </div>
          )}

          {/* Comparison Range Display */}
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Comparison Range</div>
            {getComparisonRange() && (
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {format(getComparisonRange().start, 'MMM d, yyyy')} - {format(getComparisonRange().end, 'MMM d, yyyy')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg"
        >
          Cancel
        </button>
        <button
          onClick={handleApply}
          className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          disabled={!getCurrentRange() || !getComparisonRange()}
        >
          Apply Comparison
        </button>
      </div>
    </div>
  );
};

/**
 * Comparison Result Display Component
 * Shows the comparison metrics with visual indicators
 */
export const ComparisonResult = ({ currentValue, previousValue, label, format = 'number' }) => {
  const change = currentValue - previousValue;
  const percentChange = previousValue !== 0 ? ((change / previousValue) * 100).toFixed(1) : 0;
  const isPositive = change > 0;
  const isNegative = change < 0;

  const formatValue = (value) => {
    if (format === 'percentage') return `${value}%`;
    if (format === 'currency') return `$${value.toLocaleString()}`;
    return value.toLocaleString();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">{label}</div>
      <div className="flex items-end justify-between">
        <div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatValue(currentValue)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            vs {formatValue(previousValue)}
          </div>
        </div>
        <div className={`flex items-center gap-1 text-sm font-medium ${
          isPositive ? 'text-green-600' :
          isNegative ? 'text-red-600' :
          'text-gray-600'
        }`}>
          {isPositive && <TrendingUp size={16} />}
          {isNegative && <TrendingDown size={16} />}
          <span>
            {change >= 0 ? '+' : ''}{percentChange}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default DateRangeComparison;
