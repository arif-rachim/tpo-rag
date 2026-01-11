import { useState } from 'react';
import toast from 'react-hot-toast';
import { searchDocuments } from '../services/search';
import { MdSearch, MdDescription } from 'react-icons/md';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import Navigation from '../components/Navigation';
import DocumentViewer from '../components/DocumentViewer';

export default function SearchPage() {
  // State management
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTime, setSearchTime] = useState(null);
  const [viewingDocument, setViewingDocument] = useState(null);

  // Handle search
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setResults(null);
    setSearchTime(null);

    const startTime = performance.now();

    try {
      const result = await searchDocuments(query, {
        maxResults: 20,
      });

      const endTime = performance.now();
      const duration = (endTime - startTime) / 1000;

      if (result.success) {
        setResults(result.results || []);
        setSearchTime(duration);

        if (result.results.length === 0) {
          toast('No results found for your query', { icon: 'ℹ️' });
        } else {
          toast.success(`Found ${result.results.length} results`);
        }
      } else {
        toast.error(result.message || 'Search failed');
        setResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);

      if (error.response?.status === 401) {
        toast.error('Please login again');
      } else {
        toast.error(error.response?.data?.message || 'Failed to search documents');
      }
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle view document from search result
  const handleViewDocument = (result) => {
    // Create a document object compatible with DocumentViewer
    const doc = {
      filename: result.filename,
      page: result.page,
      size: result.metadata?.size,
      upload_date: result.metadata?.upload_date,
    };
    setViewingDocument(doc);
  };

  // Highlight matching words in text
  const highlightText = (text, query) => {
    if (!query || !text) return text;

    // Split query into words and escape special regex characters
    const words = query
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0)
      .map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

    if (words.length === 0) return text;

    // Create regex pattern that matches any of the query words (case-insensitive)
    const pattern = new RegExp(`(${words.join('|')})`, 'gi');

    // Split text by matches and wrap matches in spans
    const parts = text.split(pattern);

    return (
      <>
        {parts.map((part, idx) => {
          // Check if this part matches any query word
          const isMatch = words.some(word =>
            new RegExp(`^${word}$`, 'i').test(part)
          );

          if (isMatch) {
            return (
              <span
                key={idx}
                className="font-semibold px-1 rounded"
                style={{ backgroundColor: '#1A73E8', color: '#FFFFFF' }}
              >
                {part}
              </span>
            );
          }
          return <span key={idx}>{part}</span>;
        })}
      </>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      <main className="max-w-3xl mx-auto px-6">
        {/* Search Box */}
        <div className="py-6 border-b border-google-gray-200">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <MdSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-google-gray-500" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search documents..."
                disabled={loading}
                className="w-full pl-12 pr-4 py-3 text-base border border-google-gray-300 rounded-full hover:shadow-md focus:outline-none focus:shadow-md disabled:opacity-50 transition-shadow"
              />
            </div>
          </form>
        </div>

        {/* Search Stats */}
        {results !== null && !loading && (
          <div className="py-3 text-sm text-google-gray-700">
            About {results.length} results
            {searchTime && <span className="text-google-gray-500"> ({searchTime.toFixed(2)} seconds)</span>}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="py-8 space-y-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-3 bg-google-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-5 bg-google-gray-200 rounded w-2/3 mb-3"></div>
                <div className="h-4 bg-google-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-google-gray-200 rounded w-5/6"></div>
              </div>
            ))}
          </div>
        )}

        {/* Results - Google Style */}
        {results !== null && results.length > 0 && !loading && (
          <div className="py-4">
            {results.map((result, idx) => (
              <div key={idx} className="mb-8">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 mb-1">
                  <MdDescription className="w-4 h-4 text-google-gray-500" />
                  <div className="text-sm text-google-gray-700">
                    {result.metadata?.source_file || result.filename} › Page {result.metadata?.page_num || result.page}
                  </div>
                  {result.score !== undefined && (
                    <span className="ml-auto text-xs font-medium px-2 py-1 bg-google-gray-100 text-google-gray-700 rounded">
                      {(result.score * 100).toFixed(1)}% match
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3
                  onClick={() => handleViewDocument(result)}
                  className="text-xl text-google-blue hover:underline cursor-pointer mb-1"
                >
                  {result.metadata?.source_file || result.filename}
                </h3>

                {/* Snippet */}
                <p className="text-sm text-google-gray-700 leading-relaxed">
                  {highlightText(result.document || result.text, query)}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* No Results */}
        {results !== null && results.length === 0 && !loading && (
          <div className="py-12 text-center">
            <p className="text-google-gray-700 text-base mb-2">
              Your search - <span className="font-bold">{query}</span> - did not match any documents.
            </p>
            <p className="text-sm text-google-gray-500">
              Try different keywords
            </p>
          </div>
        )}
      </main>

      {/* Document Viewer Modal */}
      {viewingDocument && (
        <DocumentViewer
          document={viewingDocument}
          onClose={() => setViewingDocument(null)}
        />
      )}
    </div>
  );
}
