import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { MdDescription, MdSearch, MdSettings, MdLogout } from 'react-icons/md';

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
    { path: '/documents', label: 'Documents', icon: MdDescription },
    { path: '/search', label: 'Search', icon: MdSearch },
    { path: '/ingestion', label: 'Ingestion', icon: MdSettings },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-white shadow-google-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div
            onClick={() => navigate('/documents')}
            className="flex items-center gap-3 cursor-pointer"
          >
            <MdDescription className="w-8 h-8 text-google-blue" />
            <span className="text-xl font-medium text-google-gray-900">
              RAG Manager
            </span>
          </div>

          {/* Nav Items */}
          <div className="hidden sm:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);

              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                    transition-colors duration-200
                    ${active
                      ? 'bg-google-gray-100 text-google-blue'
                      : 'text-google-gray-700 hover:bg-google-gray-50'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-google-gray-700 hover:bg-google-gray-50 rounded-lg transition-colors"
          >
            <MdLogout className="w-5 h-5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>

        {/* Mobile Navigation */}
        <div className="sm:hidden flex items-center gap-1 pb-3 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap
                  transition-colors duration-200
                  ${active
                    ? 'bg-google-gray-100 text-google-blue'
                    : 'text-google-gray-700 hover:bg-google-gray-50'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
