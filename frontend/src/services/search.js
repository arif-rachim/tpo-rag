import api from './api';

/**
 * Search service
 * Wraps backend search API endpoints
 */

/**
 * Search documents
 * @param {string} query - Search query text
 * @param {Object} options - Search options
 * @param {number} options.maxResults - Maximum number of results (default: 10)
 * @param {Object} options.filters - Optional filters
 * @returns {Promise<Object>} Search results
 */
export const searchDocuments = async (query, options = {}) => {
  const { maxResults = 10, filters = {} } = options;

  const response = await api.post('/api/search', {
    query,
    max_results: maxResults,
    filters,
  });

  return response.data;
};

/**
 * Highlight query terms in text
 * @param {string} text - Text to highlight
 * @param {string} query - Search query
 * @returns {Array} Array of text segments with highlight flags
 */
export const highlightQueryTerms = (text, query) => {
  if (!text || !query) return [{ text, highlight: false }];

  // Split query into terms
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter(term => term.length > 2); // Only highlight terms longer than 2 chars

  if (terms.length === 0) return [{ text, highlight: false }];

  // Create regex pattern to match any term (case insensitive)
  const pattern = new RegExp(`(${terms.join('|')})`, 'gi');

  // Split text by matches
  const segments = [];
  let lastIndex = 0;
  let match;

  const regex = new RegExp(pattern);
  while ((match = regex.exec(text)) !== null) {
    // Add non-highlighted text before match
    if (match.index > lastIndex) {
      segments.push({
        text: text.substring(lastIndex, match.index),
        highlight: false,
      });
    }

    // Add highlighted match
    segments.push({
      text: match[0],
      highlight: true,
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining non-highlighted text
  if (lastIndex < text.length) {
    segments.push({
      text: text.substring(lastIndex),
      highlight: false,
    });
  }

  return segments.length > 0 ? segments : [{ text, highlight: false }];
};

/**
 * Format score as percentage
 * @param {number} score - Score value (0-1)
 * @returns {string} Formatted percentage
 */
export const formatScore = (score) => {
  if (typeof score !== 'number') return 'N/A';
  return `${Math.round(score * 100)}%`;
};

/**
 * Truncate text to specified length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export const truncateText = (text, maxLength = 300) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Get snippet with context around query match
 * @param {string} text - Full text
 * @param {string} query - Search query
 * @param {number} contextLength - Characters of context on each side
 * @returns {string} Text snippet with context
 */
export const getContextSnippet = (text, query, contextLength = 150) => {
  if (!text || !query) return text;

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase().split(/\s+/)[0]; // Use first term

  const matchIndex = lowerText.indexOf(lowerQuery);
  if (matchIndex === -1) {
    // No match found, return beginning of text
    return truncateText(text, contextLength * 2);
  }

  // Calculate start and end positions
  const start = Math.max(0, matchIndex - contextLength);
  const end = Math.min(text.length, matchIndex + lowerQuery.length + contextLength);

  let snippet = text.substring(start, end);

  // Add ellipsis if truncated
  if (start > 0) snippet = '...' + snippet;
  if (end < text.length) snippet = snippet + '...';

  return snippet;
};

export default {
  searchDocuments,
  highlightQueryTerms,
  formatScore,
  truncateText,
  getContextSnippet,
};
