import { useEffect, useRef, useState } from 'react';
import { formatLogLine } from '../services/ingestion';

export default function LogViewer({ logs, autoScroll = true }) {
  const logContainerRef = useRef(null);
  const [isAutoScroll, setIsAutoScroll] = useState(autoScroll);
  const [isUserScrolling, setIsUserScrolling] = useState(false);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (isAutoScroll && !isUserScrolling && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, isAutoScroll, isUserScrolling]);

  // Handle scroll event to detect user scrolling
  const handleScroll = () => {
    if (!logContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current;
    const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 10;

    if (isAtBottom) {
      setIsUserScrolling(false);
    } else {
      setIsUserScrolling(true);
    }
  };

  // Toggle auto-scroll
  const toggleAutoScroll = () => {
    setIsAutoScroll(!isAutoScroll);
    setIsUserScrolling(false);
  };

  // Scroll to bottom manually
  const scrollToBottom = () => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
      setIsUserScrolling(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <div className="flex items-center space-x-2">
          <h3 className="text-sm font-semibold text-gray-700">Ingestion Logs</h3>
          <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-700 rounded">
            {logs.length} lines
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleAutoScroll}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              isAutoScroll
                ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
            }`}
          >
            {isAutoScroll ? '⏸ Pause' : '▶ Resume'} Auto-scroll
          </button>
          {!isAutoScroll && (
            <button
              onClick={scrollToBottom}
              className="px-3 py-1 text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200 rounded hover:bg-gray-200 transition-colors"
            >
              ↓ Jump to Bottom
            </button>
          )}
        </div>
      </div>

      {/* Terminal Log Display */}
      <div
        ref={logContainerRef}
        onScroll={handleScroll}
        className="bg-gray-900 rounded-b-lg p-4 font-mono text-sm h-[500px] overflow-y-auto"
        style={{
          scrollBehavior: isAutoScroll ? 'smooth' : 'auto',
        }}
      >
        {logs.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            No logs available. Start ingestion to see logs.
          </div>
        ) : (
          <div className="space-y-0.5">
            {logs.map((line, index) => {
              const formatted = formatLogLine(line);
              return (
                <div key={index} className={`${formatted.color} leading-relaxed`}>
                  {formatted.text || ' '}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Scroll indicator */}
      {isUserScrolling && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-full shadow-lg">
          Auto-scroll paused • Scroll to bottom to resume
        </div>
      )}
    </div>
  );
}
