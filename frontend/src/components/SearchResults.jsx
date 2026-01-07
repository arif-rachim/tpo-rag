import ResultCard from './ResultCard';

export default function SearchResults({ results, query, searchTime, onViewDocument }) {
  if (!results || results.length === 0) {
    return (
      <div className="max-w-3xl mx-auto mt-12 text-center">
        <svg
          className="mx-auto h-16 w-16 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h3 className="mt-4 text-lg font-medium text-gray-900">No results found</h3>
        <p className="mt-2 text-sm text-gray-500">
          Try different keywords or check your spelling
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Results Header */}
      <div className="mb-6 px-2">
        <p className="text-sm text-gray-600">
          <span className="font-medium text-gray-900">{results.length}</span> results found
          {searchTime !== undefined && searchTime !== null && (
            <span className="text-gray-500"> ({searchTime.toFixed(2)}s)</span>
          )}
        </p>
      </div>

      {/* Results Grid */}
      <div className="space-y-4">
        {results.map((result, index) => (
          <ResultCard
            key={`${result.filename}-${result.page || 0}-${index}`}
            result={result}
            query={query}
            onView={onViewDocument}
          />
        ))}
      </div>

      {/* Results Footer */}
      {results.length >= 10 && (
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Showing top {results.length} most relevant results
          </p>
        </div>
      )}
    </div>
  );
}
