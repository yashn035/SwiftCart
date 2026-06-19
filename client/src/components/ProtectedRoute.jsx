import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

/**
 * ProtectedRoute — guards routes by auth status and optional role.
 * @param {string[]} roles - allowed roles. Empty = any authenticated user.
 */
export default function ProtectedRoute({ children, roles = [] }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles.length > 0 && !roles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card text-center max-w-md">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-gray-400 mb-6">
            This page requires the <span className="text-primary-400 font-semibold">{roles.join(' or ')}</span> role.
            You are signed in as <span className="text-white font-semibold">{user.role}</span>.
          </p>
          <a href="/" className="btn-primary inline-block">Go Home</a>
        </div>
      </div>
    );
  }

  return children;
}
