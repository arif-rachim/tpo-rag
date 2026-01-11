import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { listDocuments, deleteDocument, uploadDocument } from '../services/documents';
import { MdUpload, MdRefresh } from 'react-icons/md';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import Navigation from '../components/Navigation';
import DocumentList from '../components/DocumentList';
import DocumentViewer from '../components/DocumentViewer';
import DeleteConfirmDialog from '../components/DeleteConfirmDialog';

export default function DocumentsPage() {
  // State management
  const [documents, setDocuments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewingDocument, setViewingDocument] = useState(null);
  const [deletingDocument, setDeletingDocument] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Fetch documents
  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const result = await listDocuments();
      if (result.success) {
        setDocuments(result.documents || []);
        setSummary(result.summary || null);
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

  // Handle file upload
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await uploadDocument(file);
      if (result.success) {
        toast.success(`File "${file.name}" uploaded successfully!`);
        await fetchDocuments();
      } else {
        toast.error(result.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      if (error.response?.status === 423) {
        toast.error('Cannot upload files while ingestion is running');
      } else if (error.response?.status === 401) {
        toast.error('Please login again');
      } else {
        toast.error(error.response?.data?.message || 'Failed to upload file');
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="min-h-screen bg-google-gray-50">
      <Navigation />

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Header Card */}
        <Card className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-medium text-google-gray-900 mb-2">
                Documents
              </h1>
              {summary && (
                <p className="text-google-gray-500">
                  {summary.indexed_count || 0} indexed · {summary.not_indexed_count || 0} pending
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                icon={MdRefresh}
                onClick={fetchDocuments}
                disabled={loading}
              >
                Refresh
              </Button>

              <Button
                variant="primary"
                icon={MdUpload}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>

              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.docx,.doc,.pptx,.ppt,.xlsx,.xls"
                onChange={handleFileChange}
              />
            </div>
          </div>
        </Card>

        {/* Document List */}
        <DocumentList
          documents={documents}
          summary={summary}
          loading={loading}
          onDelete={handleDeleteDocument}
          onView={handleViewDocument}
          onRefresh={fetchDocuments}
        />
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
