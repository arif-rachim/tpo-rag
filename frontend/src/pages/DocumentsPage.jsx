import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { listDocuments, deleteDocument, uploadDocument } from '../services/documents';
import { MdUpload, MdRefresh, MdViewList, MdAccountTree, MdCreateNewFolder } from 'react-icons/md';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import Navigation from '../components/Navigation';
import DocumentList from '../components/DocumentList';
import DocumentViewer from '../components/DocumentViewer';
import DeleteConfirmDialog from '../components/DeleteConfirmDialog';
import FolderTreeView from '../components/FolderTreeView';
import CreateFolderDialog from '../components/CreateFolderDialog';
import FolderContextMenu from '../components/FolderContextMenu';
import api from '../services/api';

export default function DocumentsPage() {
  // State management
  const [documents, setDocuments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewingDocument, setViewingDocument] = useState(null);
  const [deletingDocument, setDeletingDocument] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'tree'
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [refreshTreeTrigger, setRefreshTreeTrigger] = useState(0);
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

    // Get target folder from fileInput dataset (set by context menu)
    const targetFolder = fileInputRef.current?.dataset.folder || '';

    setUploading(true);
    try {
      const result = await uploadDocument(file, targetFolder);
      if (result.success) {
        toast.success(`File "${file.name}" uploaded successfully!`);
        await fetchDocuments();
        setRefreshTreeTrigger(prev => prev + 1); // Refresh tree view
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
        delete fileInputRef.current.dataset.folder; // Clear folder
      }
    }
  };

  // Handle context menu
  const handleContextMenu = (node, event) => {
    setContextMenu({
      node,
      position: { x: event.clientX, y: event.clientY }
    });
  };

  // Handle upload to folder
  const handleUploadToFolder = () => {
    if (selectedFolder) {
      fileInputRef.current.dataset.folder = selectedFolder.path;
    }
    fileInputRef.current?.click();
  };

  // Handle delete folder
  const handleDeleteFolder = async (folderPath) => {
    if (!confirm(`Delete folder "${folderPath}" and all its contents?`)) {
      return;
    }

    try {
      const response = await api.delete(`/api/folders/${encodeURIComponent(folderPath)}?recursive=true`);

      if (response.data.success) {
        toast.success('Folder deleted successfully');
        await fetchDocuments();
        setRefreshTreeTrigger(prev => prev + 1); // Refresh tree view
      } else {
        toast.error(response.data.message || 'Failed to delete folder');
      }
    } catch (error) {
      console.error('Delete folder error:', error);
      if (error.response?.status === 423) {
        toast.error('Cannot delete folders while ingestion is running');
      } else if (error.response?.status === 401) {
        toast.error('Please login again');
      } else {
        toast.error(error.response?.data?.message || 'Failed to delete folder');
      }
    }
  };

  // Handle folder created
  const handleFolderCreated = () => {
    fetchDocuments();
    setRefreshTreeTrigger(prev => prev + 1); // Refresh tree view
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
              {/* View Mode Toggle */}
              <div className="flex border border-google-gray-300 rounded-lg">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-2 text-sm flex items-center gap-1 ${
                    viewMode === 'list'
                      ? 'bg-google-blue text-white'
                      : 'text-google-gray-700 hover:bg-google-gray-100'
                  } rounded-l-lg transition-colors`}
                >
                  <MdViewList className="w-4 h-4" />
                  List
                </button>
                <button
                  onClick={() => setViewMode('tree')}
                  className={`px-3 py-2 text-sm flex items-center gap-1 ${
                    viewMode === 'tree'
                      ? 'bg-google-blue text-white'
                      : 'text-google-gray-700 hover:bg-google-gray-100'
                  } rounded-r-lg transition-colors`}
                >
                  <MdAccountTree className="w-4 h-4" />
                  Tree
                </button>
              </div>

              <Button
                variant="ghost"
                icon={MdCreateNewFolder}
                onClick={() => setShowCreateFolder(true)}
              >
                New Folder
              </Button>

              <Button
                variant="ghost"
                icon={MdRefresh}
                onClick={() => {
                  fetchDocuments();
                  setRefreshTreeTrigger(prev => prev + 1);
                }}
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

        {/* Content - List or Tree View */}
        {viewMode === 'list' ? (
          <DocumentList
            documents={documents}
            summary={summary}
            loading={loading}
            onDelete={handleDeleteDocument}
            onView={handleViewDocument}
            onRefresh={fetchDocuments}
          />
        ) : (
          <Card className="min-h-[600px]">
            <FolderTreeView
              onFolderSelect={setSelectedFolder}
              onFileSelect={(node) => {
                // Find document by filename
                const doc = documents.find(d => d.filename === node.path);
                if (doc) {
                  handleViewDocument(doc);
                }
              }}
              onContextMenu={handleContextMenu}
              refreshTrigger={refreshTreeTrigger}
            />
          </Card>
        )}
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

      {/* Create Folder Dialog */}
      {showCreateFolder && (
        <CreateFolderDialog
          parentPath={selectedFolder?.path || ''}
          onClose={() => setShowCreateFolder(false)}
          onSuccess={handleFolderCreated}
        />
      )}

      {/* Context Menu */}
      {contextMenu && (
        <FolderContextMenu
          node={contextMenu.node}
          position={contextMenu.position}
          onClose={() => setContextMenu(null)}
          onCreateFolder={() => setShowCreateFolder(true)}
          onDelete={() => {
            if (contextMenu.node.type === 'folder') {
              handleDeleteFolder(contextMenu.node.path);
            } else {
              // Find document by filename
              const doc = documents.find(d => d.filename === contextMenu.node.path);
              if (doc) {
                handleDeleteDocument(doc);
              }
            }
          }}
          onUpload={handleUploadToFolder}
        />
      )}
    </div>
  );
}
