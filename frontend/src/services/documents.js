import api from './api';

/**
 * Document management service
 * Wraps backend document API endpoints
 */

/**
 * List all documents
 * @returns {Promise<Object>} Response with documents array
 */
export const listDocuments = async () => {
  const response = await api.get('/api/documents');
  return response.data;
};

/**
 * Upload a new document
 * @param {File} file - The file to upload
 * @param {Function} onProgress - Progress callback (optional)
 * @returns {Promise<Object>} Upload response
 */
export const uploadDocument = async (file, onProgress = null) => {
  const formData = new FormData();
  formData.append('file', file);

  const config = {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  };

  if (onProgress) {
    config.onUploadProgress = (progressEvent) => {
      const percentCompleted = Math.round(
        (progressEvent.loaded * 100) / progressEvent.total
      );
      onProgress(percentCompleted);
    };
  }

  const response = await api.post('/api/documents/upload', formData, config);
  return response.data;
};

/**
 * Delete a document
 * @param {string} filename - Name of the file to delete
 * @returns {Promise<Object>} Delete response
 */
export const deleteDocument = async (filename) => {
  const response = await api.delete(`/api/documents/${encodeURIComponent(filename)}`);
  return response.data;
};

/**
 * Get document viewer URL
 * @param {string} filename - Name of the file to view
 * @returns {string} URL to view the document
 */
export const getDocumentViewUrl = (filename) => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3223';
  return `${baseUrl}/file/view/${encodeURIComponent(filename)}`;
};

/**
 * Format file size in human-readable format
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size (e.g., "1.5 MB")
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Get file type icon
 * @param {string} filename - Name of the file
 * @returns {string} Icon class or emoji
 */
export const getFileTypeIcon = (filename) => {
  const ext = filename.split('.').pop().toLowerCase();
  const icons = {
    pdf: '📄',
    docx: '📝',
    doc: '📝',
    pptx: '📊',
    ppt: '📊',
    xlsx: '📈',
    xls: '📈',
  };
  return icons[ext] || '📎';
};

export default {
  listDocuments,
  uploadDocument,
  deleteDocument,
  getDocumentViewUrl,
  formatFileSize,
  getFileTypeIcon,
};
