import { useEffect } from 'react';
import { getDocumentViewUrl } from '../services/documents';

export default function DocumentViewer({ document: doc, onClose }) {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.document.addEventListener('keydown', handleEscape);
    return () => window.document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    window.document.body.style.overflow = 'hidden';
    return () => {
      window.document.body.style.overflow = 'unset';
    };
  }, []);

  if (!doc) return null;

  const viewUrl = getDocumentViewUrl(doc.filename);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="flex min-h-screen items-center justify-center p-4">
        <div
          className="relative bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <h3 className="text-lg font-semibold text-gray-900 truncate max-w-md">
                {doc.filename}
              </h3>
              <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                {doc.filename.split('.').pop().toUpperCase()}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <a
                href={viewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 border border-indigo-600 rounded-md hover:bg-indigo-50"
              >
                Open in New Tab
              </a>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
                aria-label="Close"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Document viewer */}
          <div className="flex-1 overflow-hidden">
            <iframe
              src={viewUrl}
              className="w-full h-full border-0"
              title={doc.filename}
            />
          </div>

          {/* Footer with document info */}
          <div className="p-3 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center space-x-4">
                {doc.size && (
                  <span>
                    Size: {(doc.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                )}
                {doc.upload_date && (
                  <span>
                    Uploaded: {new Date(doc.upload_date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </div>
              <div>
                <span className="text-xs text-gray-500">
                  Press ESC to close
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
