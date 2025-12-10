import { useState } from 'react';
import { Filter, X, Plus, Save, Trash2 } from 'lucide-react';

/**
 * Advanced Filter Builder Component
 * Allows users to create complex filters with multiple conditions
 */

const OPERATORS = {
  text: [
    { value: 'contains', label: 'Contains' },
    { value: 'not_contains', label: 'Does not contain' },
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Does not equal' },
    { value: 'starts_with', label: 'Starts with' },
    { value: 'ends_with', label: 'Ends with' }
  ],
  number: [
    { value: '=', label: 'Equals' },
    { value: '!=', label: 'Not equals' },
    { value: '>', label: 'Greater than' },
    { value: '>=', label: 'Greater than or equal' },
    { value: '<', label: 'Less than' },
    { value: '<=', label: 'Less than or equal' },
    { value: 'between', label: 'Between' }
  ],
  date: [
    { value: '=', label: 'On' },
    { value: '>', label: 'After' },
    { value: '<', label: 'Before' },
    { value: 'between', label: 'Between' },
    { value: 'last_7_days', label: 'Last 7 days' },
    { value: 'last_30_days', label: 'Last 30 days' },
    { value: 'last_90_days', label: 'Last 90 days' },
    { value: 'this_month', label: 'This month' },
    { value: 'last_month', label: 'Last month' }
  ],
  select: [
    { value: 'in', label: 'Is one of' },
    { value: 'not_in', label: 'Is not one of' }
  ],
  boolean: [
    { value: '=', label: 'Is' }
  ]
};

export const AdvancedFilterBuilder = ({ fields, onApply, onClear, savedFilters = [], onSaveFilter, onDeleteFilter }) => {
  const [filters, setFilters] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const addFilter = () => {
    setFilters([...filters, { field: fields[0].value, operator: '', value: '' }]);
  };

  const removeFilter = (index) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const updateFilter = (index, key, value) => {
    const newFilters = [...filters];
    newFilters[index][key] = value;

    // Reset operator and value when field changes
    if (key === 'field') {
      const field = fields.find(f => f.value === value);
      const operators = OPERATORS[field.type] || OPERATORS.text;
      newFilters[index].operator = operators[0].value;
      newFilters[index].value = '';
    }

    setFilters(newFilters);
  };

  const applyFilters = () => {
    onApply(filters);
    setIsOpen(false);
  };

  const clearFilters = () => {
    setFilters([]);
    onClear();
    setIsOpen(false);
  };

  const saveFilter = () => {
    if (filterName.trim() && filters.length > 0) {
      onSaveFilter({ name: filterName, filters });
      setFilterName('');
      setShowSaveDialog(false);
      setIsOpen(false);
    }
  };

  const loadSavedFilter = (savedFilter) => {
    setFilters(savedFilter.filters);
    onApply(savedFilter.filters);
    setIsOpen(false);
  };

  const getOperators = (fieldValue) => {
    const field = fields.find(f => f.value === fieldValue);
    return OPERATORS[field?.type || 'text'];
  };

  const renderValueInput = (filter, index) => {
    const field = fields.find(f => f.value === filter.field);

    if (filter.operator === 'between') {
      return (
        <div className="flex gap-2">
          <input
            type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
            value={filter.value?.from || ''}
            onChange={(e) => updateFilter(index, 'value', { ...filter.value, from: e.target.value })}
            placeholder="From"
            className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white"
          />
          <input
            type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
            value={filter.value?.to || ''}
            onChange={(e) => updateFilter(index, 'value', { ...filter.value, to: e.target.value })}
            placeholder="To"
            className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white"
          />
        </div>
      );
    }

    if (field.type === 'select') {
      return (
        <select
          value={filter.value}
          onChange={(e) => updateFilter(index, 'value', e.target.value)}
          className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white"
        >
          <option value="">Select value</option>
          {field.options?.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    if (field.type === 'boolean') {
      return (
        <select
          value={filter.value}
          onChange={(e) => updateFilter(index, 'value', e.target.value)}
          className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white"
        >
          <option value="">Select value</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      );
    }

    // For preset date ranges, no input needed
    if (['last_7_days', 'last_30_days', 'last_90_days', 'this_month', 'last_month'].includes(filter.operator)) {
      return null;
    }

    return (
      <input
        type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
        value={filter.value}
        onChange={(e) => updateFilter(index, 'value', e.target.value)}
        placeholder="Enter value"
        className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white"
      />
    );
  };

  return (
    <div className="relative">
      {/* Filter Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
          filters.length > 0
            ? 'bg-blue-600 hover:bg-blue-700 text-white'
            : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
        }`}
      >
        <Filter size={16} />
        {filters.length > 0 ? `Filters (${filters.length})` : 'Add Filters'}
      </button>

      {/* Filter Panel */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 p-4 min-w-[600px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Advanced Filters</h3>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>

          {/* Saved Filters */}
          {savedFilters && savedFilters.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Saved Filters
              </label>
              <div className="flex flex-wrap gap-2">
                {savedFilters.map((saved, index) => (
                  <div key={index} className="flex items-center gap-1">
                    <button
                      onClick={() => loadSavedFilter(saved)}
                      className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-sm hover:bg-blue-100 dark:hover:bg-blue-900/40"
                    >
                      {saved.name}
                    </button>
                    {onDeleteFilter && (
                      <button
                        onClick={() => onDeleteFilter(index)}
                        className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filter Conditions */}
          <div className="space-y-3 mb-4">
            {filters.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Filter size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No filters added yet</p>
              </div>
            ) : (
              filters.map((filter, index) => (
                <div key={index} className="flex gap-2 items-start">
                  {/* Field Selector */}
                  <select
                    value={filter.field}
                    onChange={(e) => updateFilter(index, 'field', e.target.value)}
                    className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white"
                  >
                    {fields.map(field => (
                      <option key={field.value} value={field.value}>
                        {field.label}
                      </option>
                    ))}
                  </select>

                  {/* Operator Selector */}
                  <select
                    value={filter.operator}
                    onChange={(e) => updateFilter(index, 'operator', e.target.value)}
                    className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white"
                  >
                    <option value="">Select operator</option>
                    {getOperators(filter.field).map(op => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                  </select>

                  {/* Value Input */}
                  {renderValueInput(filter, index)}

                  {/* Remove Button */}
                  <button
                    onClick={() => removeFilter(index)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                  >
                    <X size={20} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={addFilter}
              className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg flex items-center gap-2"
            >
              <Plus size={16} />
              Add Condition
            </button>

            <div className="flex items-center gap-2">
              {filters.length > 0 && onSaveFilter && (
                <button
                  onClick={() => setShowSaveDialog(true)}
                  className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg flex items-center gap-2"
                >
                  <Save size={16} />
                  Save
                </button>
              )}
              <button
                onClick={clearFilters}
                className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg"
              >
                Clear All
              </button>
              <button
                onClick={applyFilters}
                className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                disabled={filters.length === 0 || filters.some(f => !f.operator || !f.value)}
              >
                Apply Filters
              </button>
            </div>
          </div>

          {/* Save Filter Dialog */}
          {showSaveDialog && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Save Filter</h4>
                <input
                  type="text"
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  placeholder="Enter filter name"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white mb-4"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowSaveDialog(false)}
                    className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveFilter}
                    className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                    disabled={!filterName.trim()}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdvancedFilterBuilder;
