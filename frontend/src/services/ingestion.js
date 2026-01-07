import api from './api';

/**
 * Ingestion service
 * Wraps backend ingestion control and log API endpoints
 */

/**
 * Start ingestion process
 * @returns {Promise<Object>} Response with process info
 */
export const startIngestion = async () => {
  const response = await api.post('/api/ingestion/start');
  return response.data;
};

/**
 * Get ingestion status
 * @returns {Promise<Object>} Status response with state, progress, etc.
 */
export const getIngestionStatus = async () => {
  const response = await api.get('/api/ingestion/status');
  return response.data;
};

/**
 * Stop ingestion process
 * @returns {Promise<Object>} Response with success status
 */
export const stopIngestion = async () => {
  const response = await api.post('/api/ingestion/stop');
  return response.data;
};

/**
 * Get recent log lines
 * @param {number} lines - Number of lines to retrieve (default: 100, max: 1000)
 * @returns {Promise<Object>} Response with log lines
 */
export const getRecentLogs = async (lines = 100) => {
  const response = await api.get('/api/logs/recent', {
    params: { lines },
  });
  return response.data;
};

/**
 * Format log line with color based on log level
 * @param {string} line - Log line text
 * @returns {Object} Object with text and color class
 */
export const formatLogLine = (line) => {
  if (!line) return { text: '', color: 'text-gray-300' };

  const lowerLine = line.toLowerCase();

  // Determine color based on log level
  let color = 'text-gray-300'; // Default (INFO)

  if (lowerLine.includes('error') || lowerLine.includes('failed')) {
    color = 'text-red-400';
  } else if (lowerLine.includes('warning') || lowerLine.includes('warn')) {
    color = 'text-yellow-400';
  } else if (lowerLine.includes('success') || lowerLine.includes('completed')) {
    color = 'text-green-400';
  } else if (lowerLine.includes('debug')) {
    color = 'text-blue-400';
  }

  return { text: line, color };
};

/**
 * Get status badge color
 * @param {string} status - Status string (idle, running, completed, error)
 * @returns {Object} Object with background and text color classes
 */
export const getStatusBadgeColor = (status) => {
  switch (status) {
    case 'running':
      return {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        border: 'border-blue-200',
      };
    case 'completed':
      return {
        bg: 'bg-green-100',
        text: 'text-green-800',
        border: 'border-green-200',
      };
    case 'error':
      return {
        bg: 'bg-red-100',
        text: 'text-red-800',
        border: 'border-red-200',
      };
    case 'idle':
    default:
      return {
        bg: 'bg-gray-100',
        text: 'text-gray-800',
        border: 'border-gray-200',
      };
  }
};

/**
 * Format duration from seconds
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration string
 */
export const formatDuration = (seconds) => {
  if (!seconds || seconds < 0) return '0s';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
};

export default {
  startIngestion,
  getIngestionStatus,
  stopIngestion,
  getRecentLogs,
  formatLogLine,
  getStatusBadgeColor,
  formatDuration,
};
