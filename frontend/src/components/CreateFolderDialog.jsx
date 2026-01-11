import { useState } from 'react';
import { MdFolder, MdClose } from 'react-icons/md';
import { Button } from './Button';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function CreateFolderDialog({ parentPath, onClose, onSuccess }) {
  const [folderName, setFolderName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!folderName.trim()) {
      setError('Folder name is required');
      return;
    }

    setCreating(true);
    setError('');

    try {
      const fullPath = parentPath ? `${parentPath}/${folderName}` : folderName;

      const response = await api.post('/api/folders', { path: fullPath });

      if (response.data.success) {
        toast.success(`Folder created: ${folderName}`);
        onSuccess?.();
        onClose();
      } else {
        setError(response.data.message || 'Failed to create folder');
      }
    } catch (err) {
      console.error('Error creating folder:', err);
      setError(err.response?.data?.message || 'Network error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-google-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MdFolder className="w-6 h-6 text-google-blue" />
            <h2 className="text-xl font-medium text-google-gray-900">New Folder</h2>
          </div>
          <button
            onClick={onClose}
            className="text-google-gray-500 hover:text-google-gray-700"
          >
            <MdClose className="w-6 h-6" />
          </button>
        </div>

        {/* Parent path indicator */}
        {parentPath && (
          <div className="mb-4 text-sm text-google-gray-500">
            Creating in: <span className="font-medium">{parentPath}/</span>
          </div>
        )}

        {/* Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-google-gray-700 mb-2">
            Folder Name
          </label>
          <input
            type="text"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="e.g., contracts, 2024, archive"
            className="w-full px-4 py-2 border border-google-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-google-blue"
            onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-google-red rounded-lg text-sm text-google-red">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleCreate}
            disabled={creating || !folderName.trim()}
          >
            {creating ? 'Creating...' : 'Create'}
          </Button>
        </div>
      </div>
    </div>
  );
}
