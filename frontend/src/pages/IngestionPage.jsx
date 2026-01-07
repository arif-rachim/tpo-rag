import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  startIngestion,
  getIngestionStatus,
  stopIngestion,
  getRecentLogs,
} from '../services/ingestion';
import Navigation from '../components/Navigation';
import IngestionPanel from '../components/IngestionPanel';
import LogViewer from '../components/LogViewer';

const POLL_INTERVAL = 2000; // 2 seconds

export default function IngestionPage() {
  // State management
  const [status, setStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);

  // Refs for polling
  const statusPollRef = useRef(null);
  const logPollRef = useRef(null);

  // Fetch status
  const fetchStatus = async () => {
    try {
      const result = await getIngestionStatus();
      if (result.success) {
        setStatus(result.status);
        return result.status;
      }
    } catch (error) {
      console.error('Error fetching status:', error);
    }
    return null;
  };

  // Fetch logs
  const fetchLogs = async () => {
    try {
      const result = await getRecentLogs(500); // Get last 500 lines
      if (result.success && result.lines) {
        setLogs(result.lines);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  // Start status polling
  const startStatusPolling = () => {
    // Clear any existing interval
    if (statusPollRef.current) {
      clearInterval(statusPollRef.current);
    }

    // Fetch immediately
    fetchStatus();

    // Then poll every 2 seconds
    statusPollRef.current = setInterval(fetchStatus, POLL_INTERVAL);
  };

  // Start log polling
  const startLogPolling = () => {
    // Clear any existing interval
    if (logPollRef.current) {
      clearInterval(logPollRef.current);
    }

    // Fetch immediately
    fetchLogs();

    // Then poll every 2 seconds
    logPollRef.current = setInterval(fetchLogs, POLL_INTERVAL);
  };

  // Stop polling
  const stopPolling = () => {
    if (statusPollRef.current) {
      clearInterval(statusPollRef.current);
      statusPollRef.current = null;
    }
    if (logPollRef.current) {
      clearInterval(logPollRef.current);
      logPollRef.current = null;
    }
  };

  // Initialize: fetch status and logs, start polling
  useEffect(() => {
    fetchStatus();
    fetchLogs();
    startStatusPolling();
    startLogPolling();

    // Cleanup on unmount
    return () => {
      stopPolling();
    };
  }, []);

  // Handle start ingestion
  const handleStart = async () => {
    setStarting(true);
    try {
      const result = await startIngestion();

      if (result.success) {
        toast.success('Ingestion started successfully');
        // Immediately fetch status and logs
        await fetchStatus();
        await fetchLogs();
        // Ensure polling is active
        startStatusPolling();
        startLogPolling();
      } else {
        toast.error(result.message || 'Failed to start ingestion');
      }
    } catch (error) {
      console.error('Start ingestion error:', error);

      if (error.response?.status === 401) {
        toast.error('Please login again');
      } else {
        toast.error(error.response?.data?.message || 'Failed to start ingestion');
      }
    } finally {
      setStarting(false);
    }
  };

  // Handle stop ingestion
  const handleStop = async () => {
    setStopping(true);
    try {
      const result = await stopIngestion();

      if (result.success) {
        toast.success('Ingestion stopped');
        // Fetch final status
        await fetchStatus();
      } else {
        toast.error(result.message || 'Failed to stop ingestion');
      }
    } catch (error) {
      console.error('Stop ingestion error:', error);

      if (error.response?.status === 401) {
        toast.error('Please login again');
      } else {
        toast.error(error.response?.data?.message || 'Failed to stop ingestion');
      }
    } finally {
      setStopping(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <Navigation />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Document Ingestion</h2>
          <p className="text-sm text-gray-600 mt-1">Re-index documents and monitor ingestion progress</p>
        </div>

        <div className="space-y-6">
          {/* Ingestion Control Panel */}
          <IngestionPanel
            status={status}
            onStart={handleStart}
            onStop={handleStop}
            starting={starting}
            stopping={stopping}
          />

          {/* Log Viewer */}
          <LogViewer logs={logs} autoScroll={status?.status === 'running'} />
        </div>
      </main>
    </div>
  );
}
