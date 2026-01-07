import { getStatusBadgeColor, formatDuration } from '../services/ingestion';

export default function IngestionPanel({ status, onStart, onStop, starting, stopping }) {
  const statusColors = getStatusBadgeColor(status?.status || 'idle');
  const isRunning = status?.status === 'running';
  const isIdle = !status || status.status === 'idle';

  // Calculate elapsed time if running
  const getElapsedTime = () => {
    if (!status?.start_time) return 0;
    const start = new Date(status.start_time);
    const now = new Date();
    return Math.floor((now - start) / 1000); // seconds
  };

  const elapsedTime = isRunning ? getElapsedTime() : 0;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Ingestion Control</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manually trigger document re-indexing
          </p>
        </div>

        {/* Status Badge */}
        <div className={`px-4 py-2 rounded-full border ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}>
          <div className="flex items-center space-x-2">
            {isRunning && (
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
            )}
            <span className="text-sm font-semibold uppercase">
              {status?.status || 'Unknown'}
            </span>
          </div>
        </div>
      </div>

      {/* Warning when running */}
      {isRunning && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-start space-x-3">
            <svg
              className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <h4 className="text-sm font-semibold text-yellow-800">
                File Operations Locked
              </h4>
              <p className="text-sm text-yellow-700 mt-1">
                Document upload and deletion are disabled while ingestion is running.
                Please wait for the process to complete.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Status Information */}
      {status && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Process ID */}
          {status.process_id && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase mb-1">Process ID</p>
              <p className="text-lg font-semibold text-gray-900">{status.process_id}</p>
            </div>
          )}

          {/* Elapsed Time */}
          {isRunning && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase mb-1">Elapsed Time</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatDuration(elapsedTime)}
              </p>
            </div>
          )}

          {/* Files Processed */}
          {status.files_processed !== undefined && status.files_processed !== null && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase mb-1">Files Processed</p>
              <p className="text-lg font-semibold text-gray-900">
                {status.files_processed}
                {status.total_files && ` / ${status.total_files}`}
              </p>
            </div>
          )}

          {/* Start Time */}
          {status.start_time && !isRunning && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase mb-1">Last Run</p>
              <p className="text-sm font-semibold text-gray-900">
                {new Date(status.start_time).toLocaleString()}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {status?.error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <h4 className="text-sm font-semibold text-red-800 mb-1">Error</h4>
          <p className="text-sm text-red-700">{status.error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center space-x-3">
        {isIdle || status?.status === 'completed' || status?.status === 'error' ? (
          <button
            onClick={onStart}
            disabled={starting}
            className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {starting ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Starting...
              </span>
            ) : (
              'Start Ingestion'
            )}
          </button>
        ) : (
          <button
            onClick={onStop}
            disabled={stopping}
            className="flex-1 px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {stopping ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Stopping...
              </span>
            ) : (
              'Stop Ingestion'
            )}
          </button>
        )}
      </div>

      {/* Help Text */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
        <p className="text-xs text-blue-800">
          <strong>Note:</strong> Ingestion re-indexes all documents in the documents folder.
          This process may take several minutes depending on the number and size of documents.
        </p>
      </div>
    </div>
  );
}
