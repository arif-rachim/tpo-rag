import { useState } from 'react';
import toast from 'react-hot-toast';
import { searchDocuments } from '../services/search';
import Navigation from '../components/Navigation';
import SearchBar from '../components/SearchBar';
import SearchResults from '../components/SearchResults';
import DocumentViewer from '../components/DocumentViewer';

export default function SearchPage() {
  // State management
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTime, setSearchTime] = useState(null);
  const [viewingDocument, setViewingDocument] = useState(null);

  // Handle search
  const handleSearch = async (searchQuery) => {
    setQuery(searchQuery);
    setLoading(true);
    setResults(null);
    setSearchTime(null);

    const startTime = performance.now();

    try {
      const result = await searchDocuments(searchQuery, {
        maxResults: 20,
      });

      const endTime = performance.now();
      const duration = (endTime - startTime) / 1000; // Convert to seconds

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Navigation */}
      <Navigation />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Search Section */}
        <div className={`${results === null ? 'py-24' : 'py-12'} transition-all duration-300`}>
          {/* Logo / Title (large when no results) */}
          {results === null && (
            <div className="text-center mb-8">
              <h1 className="text-5xl font-bold text-gray-900 mb-2">
                Search Documents
              </h1>
              <p className="text-lg text-gray-600">
                Find information across all your indexed documents
              </p>
            </div>
          )}

          {/* Search Bar */}
          <SearchBar
            onSearch={handleSearch}
            loading={loading}
            initialQuery={query}
          />
        </div>

        {/* Search Results */}
        {results !== null && !loading && (
          <div className="pb-12">
            <SearchResults
              results={results}
              query={query}
              searchTime={searchTime}
              onViewDocument={handleViewDocument}
            />
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="max-w-3xl mx-auto mt-8">
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
                  <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                </div>
              ))}
            </div>
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
