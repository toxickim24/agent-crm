// Sync configuration settings
module.exports = {
  // API request timeout in milliseconds
  apiTimeout: 30000, // 30 seconds (increased from 10 seconds)

  // Number of retry attempts for failed API calls
  retryAttempts: 3,

  // Delay between retry attempts in milliseconds
  retryDelay: 2000, // 2 seconds

  // Delay between queue jobs to prevent rate limiting (milliseconds)
  queueDelay: 500, // 0.5 seconds

  // Client-side polling interval for sync progress (milliseconds)
  pollingInterval: 1000, // 1 second

  // Client-side maximum wait time before timeout (milliseconds)
  clientTimeout: 600000, // 10 minutes
};
