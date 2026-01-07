import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { uploadDocument } from '../services/documents';

const ALLOWED_FILE_TYPES = ['.pdf', '.docx', '.doc', '.pptx', '.ppt', '.xlsx', '.xls'];
const MAX_FILE_SIZE_MB = 50;

export default function DocumentUpload({ onUploadSuccess, disabled }) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const validateFile = (file) => {
    // Check file type
    const fileExt = '.' + file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_FILE_TYPES.includes(fileExt)) {
      toast.error(`Invalid file type. Allowed types: ${ALLOWED_FILE_TYPES.join(', ')}`);
      return false;
    }

    // Check file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > MAX_FILE_SIZE_MB) {
      toast.error(`File too large. Maximum size: ${MAX_FILE_SIZE_MB}MB`);
      return false;
    }

    return true;
  };

  const handleFileSelect = (file) => {
    if (!validateFile(file)) {
      return;
    }
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || uploading) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const result = await uploadDocument(selectedFile, (progress) => {
        setUploadProgress(progress);
      });

      if (result.success) {
        toast.success(`File "${selectedFile.name}" uploaded successfully!`);
        setSelectedFile(null);
        setUploadProgress(0);
        if (onUploadSuccess) {
          onUploadSuccess(result);
        }
      } else {
        toast.error(result.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);

      // Handle specific error cases
      if (error.response?.status === 423) {
        toast.error('Cannot upload files while ingestion is running');
      } else if (error.response?.status === 401) {
        toast.error('Please login again');
      } else {
        toast.error(error.response?.data?.message || 'Failed to upload file');
      }
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !uploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled || uploading) {
      if (disabled) {
        toast.error('Upload is disabled during ingestion');
      }
      return;
    }

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Document</h3>

      {/* Warning when disabled */}
      {disabled && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            File uploads are disabled while ingestion is running
          </p>
        </div>
      )}

      {/* Drag and drop area */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50'
            : disabled
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
            : 'border-gray-300 hover:border-indigo-400'
        }`}
      >
        {!selectedFile ? (
          <>
            <svg
              className={`mx-auto h-12 w-12 ${disabled ? 'text-gray-300' : 'text-gray-400'}`}
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="mt-4">
              <label
                htmlFor="file-upload"
                className={`relative cursor-pointer rounded-md font-medium ${
                  disabled
                    ? 'text-gray-400'
                    : 'text-indigo-600 hover:text-indigo-500'
                }`}
              >
                <span>Upload a file</span>
                <input
                  ref={fileInputRef}
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  className="sr-only"
                  accept={ALLOWED_FILE_TYPES.join(',')}
                  onChange={handleFileInputChange}
                  disabled={disabled || uploading}
                />
              </label>
              <span className="text-gray-500"> or drag and drop</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              PDF, DOCX, PPTX, XLSX up to {MAX_FILE_SIZE_MB}MB
            </p>
          </>
        ) : (
          <div className="space-y-4">
            {/* Selected file info */}
            <div className="flex items-center justify-center space-x-2">
              <span className="text-2xl">📎</span>
              <span className="text-sm font-medium text-gray-900">{selectedFile.name}</span>
              <span className="text-xs text-gray-500">
                ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
              </span>
            </div>

            {/* Upload progress */}
            {uploading && (
              <div className="w-full">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-indigo-700">Uploading...</span>
                  <span className="text-sm font-medium text-indigo-700">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Action buttons */}
            {!uploading && (
              <div className="flex justify-center space-x-3">
                <button
                  onClick={handleUpload}
                  disabled={disabled}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Upload
                </button>
                <button
                  onClick={handleClearFile}
                  disabled={disabled}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
