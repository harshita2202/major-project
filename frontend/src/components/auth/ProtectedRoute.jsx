import { Navigate, Outlet } from 'react-router-dom';
import { getCurrentUser, ROLES } from '../../services/auth';

/**
 * Route protector checking authentication and role authorization.
 *
 * @param {object} props
 * @param {'STUDENT' | 'INVIGILATOR'} props.allowedRole
 * @param {React.ReactNode} [props.children]
 */
export default function ProtectedRoute({ allowedRole, children }) {
  const user = getCurrentUser();

  // 1. Not authenticated at all
  if (!user) {
    if (allowedRole === ROLES.STUDENT) {
      return <Navigate to="/student-login" replace />;
    }
    if (allowedRole === ROLES.INVIGILATOR) {
      return <Navigate to="/invigilator-login" replace />;
    }
    return <Navigate to="/" replace />;
  }

  // 2. Authenticated, but role mismatch
  if (allowedRole && user.role !== allowedRole) {
    if (user.role === ROLES.STUDENT) {
      return <Navigate to="/student" replace />;
    }
    if (user.role === ROLES.INVIGILATOR) {
      return <Navigate to="/dashboard" replace />;
    }
    return <Navigate to="/" replace />;
  }

  // 3. Authorized
  return children ? children : <Outlet />;
}
