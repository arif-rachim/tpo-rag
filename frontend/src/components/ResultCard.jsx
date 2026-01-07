import { highlightQueryTerms, formatScore } from '../services/search';
import { getFileTypeIcon } from '../services/documents';

export default function ResultCard({ result, query, onView }) {
  const { text, filename, page, score, rerank_score, metadata } = result;

  // Highlight query terms in the text
  const highlightedSegments = highlightQueryTerms(text, query);

  // Determine which score to display (prefer rerank_score if available)
  const displayScore = rerank_score !== undefined && rerank_score !== null ? rerank_score : score;

  // Get file type icon
  const fileIcon = getFileTypeIcon(filename);

  return (
    <div
      onClick={() => onView(result)}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer"
    >
      {/* Header: Filename and Page */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          <span className="text-xl flex-shrink-0">{fileIcon}</span>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-medium text-indigo-700 hover:text-indigo-900 truncate">
              {filename}
            </h3>
            <p className="text-xs text-gray-500">
              {page !== undefined && page !== null ? `Page ${page}` : 'Document'}
              {metadata?.section && ` • ${metadata.section}`}
            </p>
          </div>
        </div>

        {/* Relevance Score */}
        {displayScore !== undefined && displayScore !== null && (
          <div className="ml-3 flex-shrink-0">
            <div className="flex items-center space-x-1">
              <svg
                className="w-4 h-4 text-yellow-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-sm font-semibold text-gray-700">
                {formatScore(displayScore)}
              </span>
            </div>
            {rerank_score !== undefined && rerank_score !== null && (
              <p className="text-xs text-gray-400 text-right">Relevance</p>
            )}
          </div>
        )}
      </div>

      {/* Content Snippet with Highlighting */}
      <div className="mt-3">
        <p className="text-sm text-gray-700 leading-relaxed line-clamp-4">
          {highlightedSegments.map((segment, index) =>
            segment.highlight ? (
              <mark
                key={index}
                className="bg-yellow-200 font-semibold text-gray-900 px-0.5 rounded"
              >
                {segment.text}
              </mark>
            ) : (
              <span key={index}>{segment.text}</span>
            )
          )}
        </p>
      </div>

      {/* Footer: View Document Button */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onView(result);
          }}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
        >
          <span>View Document</span>
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
