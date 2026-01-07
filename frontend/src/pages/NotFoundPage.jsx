import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* 404 Illustration */}
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-indigo-600">404</h1>
          <div className="text-6xl mb-4">📄🔍</div>
        </div>

        {/* Message */}
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Page Not Found
        </h2>
        <p className="text-gray-600 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={() => navigate('/documents')}
            className="w-full px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors font-medium"
          >
            Go to Documents
          </button>
          <button
            onClick={() => navigate('/search')}
            className="w-full px-6 py-3 bg-white text-indigo-600 border-2 border-indigo-600 rounded-md hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors font-medium"
          >
            Search Documents
          </button>
          <button
            onClick={() => navigate(-1)}
            className="w-full px-6 py-3 text-gray-600 hover:text-gray-900 transition-colors"
          >
            ← Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
