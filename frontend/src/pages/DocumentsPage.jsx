import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { listDocuments, deleteDocument } from '../services/documents';
import Navigation from '../components/Navigation';
import DocumentList from '../components/DocumentList';
import DocumentUpload from '../components/DocumentUpload';
import DocumentViewer from '../components/DocumentViewer';
import DeleteConfirmDialog from '../components/DeleteConfirmDialog';

export default function DocumentsPage() {
  // State management
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewingDocument, setViewingDocument] = useState(null);
  const [deletingDocument, setDeletingDocument] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [uploadDisabled, setUploadDisabled] = useState(false);

  // Fetch documents
  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const result = await listDocuments();
      if (result.success) {
        setDocuments(result.documents || []);
      } else {
        toast.error(result.message || 'Failed to load documents');
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  // Load documents on mount
  useEffect(() => {
    fetchDocuments();
  }, []);

  // Handle view document
  const handleViewDocument = (doc) => {
    setViewingDocument(doc);
  };

  // Handle delete document
  const handleDeleteDocument = (doc) => {
    setDeletingDocument(doc);
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!deletingDocument) return;

    setIsDeleting(true);
    try {
      const result = await deleteDocument(deletingDocument.filename);

      if (result.success) {
        toast.success(`Document "${deletingDocument.filename}" deleted successfully`);
        setDeletingDocument(null);
        // Refresh document list
        await fetchDocuments();
      } else {
        toast.error(result.message || 'Failed to delete document');
      }
    } catch (error) {
      console.error('Delete error:', error);

      // Handle specific error cases
      if (error.response?.status === 423) {
        toast.error('Cannot delete files while ingestion is running');
      } else if (error.response?.status === 401) {
        toast.error('Please login again');
      } else {
        toast.error(error.response?.data?.message || 'Failed to delete document');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // Cancel delete
  const cancelDelete = () => {
    if (!isDeleting) {
      setDeletingDocument(null);
    }
  };

  // Handle upload success
  const handleUploadSuccess = () => {
    // Refresh document list
    fetchDocuments();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <Navigation />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Document Management</h2>
          <p className="text-sm text-gray-600 mt-1">Upload, view, and manage your documents</p>
        </div>

        <div className="space-y-6">
          {/* Upload Section */}
          <DocumentUpload
            onUploadSuccess={handleUploadSuccess}
            disabled={uploadDisabled}
          />

          {/* Document List Section */}
          <DocumentList
            documents={documents}
            loading={loading}
            onDelete={handleDeleteDocument}
            onView={handleViewDocument}
            onRefresh={fetchDocuments}
          />
        </div>
      </main>

      {/* Document Viewer Modal */}
      {viewingDocument && (
        <DocumentViewer
          document={viewingDocument}
          onClose={() => setViewingDocument(null)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deletingDocument && (
        <DeleteConfirmDialog
          document={deletingDocument}
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
          deleting={isDeleting}
        />
      )}
    </div>
  );
}
