import { useEffect, useRef, useState } from 'react';
import { formatLogLine } from '../services/ingestion';
import { Card } from './Card';

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
    <Card className="h-full flex flex-col p-0 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-google-gray-200 flex-shrink-0">
        <h3 className="text-lg font-medium text-google-gray-900">Logs</h3>
      </div>

      {/* Log Area */}
      <div
        ref={logContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto bg-google-gray-900 p-4 font-mono text-sm"
        style={{
          scrollBehavior: isAutoScroll ? 'smooth' : 'auto',
        }}
      >
        {logs.length === 0 ? (
          <p className="text-google-gray-500 text-center py-8">
            No logs yet...
          </p>
        ) : (
          logs.map((line, idx) => {
            const formatted = formatLogLine(line);
            return (
              <div key={idx} className={`${formatted.color} mb-1 leading-relaxed`}>
                {formatted.text || ' '}
              </div>
            );
          })
        )}
      </div>

      {/* Scroll indicator */}
      {isUserScrolling && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 px-3 py-1.5 bg-google-blue text-white text-xs rounded-full shadow-lg">
          Auto-scroll paused • Scroll to bottom to resume
        </div>
      )}
    </Card>
  );
}
