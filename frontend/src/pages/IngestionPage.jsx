import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  startIngestion,
  getIngestionStatus,
  stopIngestion,
  getRecentLogs,
} from '../services/ingestion';
import { MdPlayArrow, MdStop } from 'react-icons/md';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import Navigation from '../components/Navigation';
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
    <div className="h-screen bg-google-gray-50 flex flex-col overflow-hidden">
      <Navigation />

      <main className="flex-1 max-w-7xl mx-auto px-6 py-12 flex flex-col overflow-hidden w-full">
        {/* Status Cards */}
        <div className="grid grid-cols-3 gap-6 mb-8 flex-shrink-0">
          <Card>
            <div className="text-sm font-medium text-google-gray-500 mb-1">Status</div>
            <div className="text-2xl font-medium text-google-gray-900 capitalize">
              {status?.status || 'Idle'}
            </div>
          </Card>

          <Card>
            <div className="text-sm font-medium text-google-gray-500 mb-1">Processed</div>
            <div className="text-2xl font-medium text-google-gray-900">
              {status?.processed || 0}
            </div>
          </Card>

          <Card>
            <div className="text-sm font-medium text-google-gray-500 mb-1">Failed</div>
            <div className="text-2xl font-medium text-google-gray-900">
              {status?.failed || 0}
            </div>
          </Card>
        </div>

        {/* Controls */}
        <Card className="mb-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-medium text-google-gray-900">
              Ingestion Control
            </h2>

            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                icon={MdPlayArrow}
                onClick={handleStart}
                disabled={status?.status === 'running' || starting}
              >
                {starting ? 'Starting...' : 'Start'}
              </Button>

              <Button
                variant="danger"
                icon={MdStop}
                onClick={handleStop}
                disabled={status?.status !== 'running' || stopping}
              >
                {stopping ? 'Stopping...' : 'Stop'}
              </Button>
            </div>
          </div>
        </Card>

        {/* Log Viewer */}
        <div className="flex-1 overflow-hidden">
          <LogViewer logs={logs} autoScroll={status?.status === 'running'} />
        </div>
      </main>
    </div>
  );
}
