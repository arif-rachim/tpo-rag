import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { MdDescription, MdPerson, MdLock } from 'react-icons/md';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!username || !password) {
      toast.error('Please enter username and password');
      return;
    }

    setLoading(true);
    try {
      const result = await login(username, password);

      if (result.success) {
        toast.success('Login successful!');
        navigate('/documents');
      } else {
        toast.error(result.message || 'Login failed');
      }
    } catch (error) {
      toast.error('An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-google-gray-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-3">
            <MdDescription className="w-12 h-12 text-google-blue" />
            <h1 className="text-2xl font-medium text-google-gray-900">RAG Manager</h1>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-google-gray-700 mb-2">
              Username
            </label>
            <div className="relative">
              <MdPerson className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-google-gray-500" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                autoComplete="username"
                required
                className="w-full pl-10 pr-4 py-3 border border-google-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-google-blue focus:border-transparent disabled:opacity-50"
                placeholder="Enter username"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-google-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <MdLock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-google-gray-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="current-password"
                required
                className="w-full pl-10 pr-4 py-3 border border-google-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-google-blue focus:border-transparent disabled:opacity-50"
                placeholder="Enter password"
              />
            </div>
          </div>

          {/* Submit */}
          <Button variant="primary" size="lg" type="submit" disabled={loading} className="w-full">
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        {/* Default Credentials Hint */}
        <div className="mt-6 text-center text-xs text-google-gray-500">
          <p>Default credentials: admin / admin</p>
        </div>
      </Card>
    </div>
  );
}
