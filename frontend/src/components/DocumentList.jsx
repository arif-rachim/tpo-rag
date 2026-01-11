import { MdDescription, MdDelete, MdCheckCircle, MdPending, MdVisibility } from 'react-icons/md';
import { formatFileSize } from '../services/documents';

export default function DocumentList({ documents, summary, loading, onDelete, onView, onRefresh }) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-google-sm p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-google-gray-200 rounded"></div>
          <div className="h-10 bg-google-gray-200 rounded"></div>
          <div className="h-10 bg-google-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-google-sm p-8 text-center">
        <p className="text-google-gray-500 text-lg mb-2">No documents found</p>
        <p className="text-google-gray-500 text-sm">Upload your first document to get started</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-google-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-google-gray-200 bg-google-gray-50">
              <th className="px-6 py-4 text-left text-sm font-medium text-google-gray-700">Document</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-google-gray-700">Size</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-google-gray-700">Pages</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-google-gray-700">Chunks</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-google-gray-700">Status</th>
              <th className="px-6 py-4 text-right text-sm font-medium text-google-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-google-gray-200">
            {documents.map((doc) => (
              <tr key={doc.filename} className="hover:bg-google-gray-50 transition-colors">
                {/* Document */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <MdDescription className="w-5 h-5 text-google-blue flex-shrink-0" />
                    <span className="text-sm font-medium text-google-gray-900 truncate">
                      {doc.filename}
                    </span>
                  </div>
                </td>

                {/* Size */}
                <td className="px-6 py-4">
                  <span className="text-sm text-google-gray-700">
                    {formatFileSize(doc.file_size)}
                  </span>
                </td>

                {/* Pages */}
                <td className="px-6 py-4">
                  <span className="text-sm text-google-gray-700">
                    {doc.total_pages > 0 ? doc.total_pages : '-'}
                  </span>
                </td>

                {/* Chunks */}
                <td className="px-6 py-4">
                  <span className="text-sm text-google-gray-700">
                    {doc.chunks || '-'}
                  </span>
                </td>

                {/* Status */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {doc.status === 'indexed' ? (
                      <>
                        <MdCheckCircle className="w-5 h-5 text-google-green" />
                        <span className="text-sm font-medium text-google-green">Indexed</span>
                      </>
                    ) : (
                      <>
                        <MdPending className="w-5 h-5 text-google-yellow" />
                        <span className="text-sm font-medium text-google-yellow">Pending</span>
                      </>
                    )}
                  </div>
                </td>

                {/* Actions */}
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    {onView && (
                      <button
                        onClick={() => onView(doc)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-google-gray-700 bg-google-gray-100 hover:bg-google-gray-200 rounded-lg transition-colors"
                      >
                        <MdVisibility className="w-4 h-4" />
                        View
                      </button>
                    )}
                    <button
                      onClick={() => onDelete(doc)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-google-red hover:bg-red-700 rounded-lg transition-colors"
                    >
                      <MdDelete className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
