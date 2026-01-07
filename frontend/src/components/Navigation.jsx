import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const navItems = [
    { path: '/documents', label: 'Documents', icon: '📄' },
    { path: '/search', label: 'Search', icon: '🔍' },
    { path: '/ingestion', label: 'Ingestion', icon: '⚙️' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex justify-between items-center">
          {/* Logo and Navigation */}
          <div className="flex items-center space-x-6">
            <h1
              onClick={() => navigate('/documents')}
              className="text-xl font-bold text-indigo-700 cursor-pointer hover:text-indigo-900 transition-colors flex items-center space-x-2"
            >
              <span>📚</span>
              <span>RAG Manager</span>
            </h1>
            <nav className="hidden sm:flex space-x-2">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-all ${
                    isActive(item.path)
                      ? 'text-indigo-700 bg-indigo-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <span className="mr-1.5">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          {/* User Actions */}
          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-gray-50 rounded-md">
              <span className="text-xs text-gray-500">Signed in as</span>
              <span className="text-sm font-medium text-gray-900">{user?.username}</span>
            </div>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <nav className="sm:hidden flex space-x-2 mt-3 pb-2 overflow-x-auto">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-all ${
                isActive(item.path)
                  ? 'text-indigo-700 bg-indigo-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <span className="mr-1.5">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
