import { Play, Pause, StopCircle } from 'lucide-react';

const StatusBadge = ({ status }) => {
  const getStatusConfig = () => {
    switch (status?.toLowerCase()) {
      case 'active':
        return {
          icon: <Play size={14} />,
          label: 'Active',
          bgColor: 'bg-green-100 dark:bg-green-900',
          textColor: 'text-green-800 dark:text-green-200',
          borderColor: 'border-green-200 dark:border-green-700',
        };
      case 'paused':
        return {
          icon: <Pause size={14} />,
          label: 'Paused',
          bgColor: 'bg-orange-100 dark:bg-orange-900',
          textColor: 'text-orange-800 dark:text-orange-200',
          borderColor: 'border-orange-200 dark:border-orange-700',
        };
      case 'inactive':
        return {
          icon: <StopCircle size={14} />,
          label: 'Inactive',
          bgColor: 'bg-gray-100 dark:bg-gray-700',
          textColor: 'text-gray-800 dark:text-gray-300',
          borderColor: 'border-gray-200 dark:border-gray-600',
        };
      default:
        return {
          icon: <StopCircle size={14} />,
          label: status || 'Unknown',
          bgColor: 'bg-gray-100 dark:bg-gray-700',
          textColor: 'text-gray-800 dark:text-gray-300',
          borderColor: 'border-gray-200 dark:border-gray-600',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.bgColor} ${config.textColor} ${config.borderColor}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
};

export default StatusBadge;
