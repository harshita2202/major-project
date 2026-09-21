/**
 * auth.js
 * Frontend demo authentication and session management.
 *
 * Provides role-based authentication between:
 * - STUDENT
 * - INVIGILATOR
 *
 * NOTE: This is client-side demo authentication stored in localStorage.
 * Backend JWT authentication can be integrated later without altering component APIs.
 */

export const ROLES = {
  STUDENT: 'STUDENT',
  INVIGILATOR: 'INVIGILATOR',
};

const STORAGE_KEY = 'proctor_auth_user';

// Demo credential database
export const DEMO_CREDENTIALS = {
  student: {
    id: 'STU001',
    password: 'student123',
    name: 'Alex Johnson',
    role: ROLES.STUDENT,
  },
  invigilator: {
    username: 'admin',
    password: 'admin123',
    name: 'Lead Invigilator',
    role: ROLES.INVIGILATOR,
  },
};

/**
 * Authenticates a user against demo credentials.
 * @param {'STUDENT' | 'INVIGILATOR'} role
 * @param {string} identifier - Student ID or Username
 * @param {string} password
 * @returns {{ success: boolean, user?: object, error?: string }}
 */
export function login(role, identifier, password) {
  const cleanId = (identifier || '').trim();
  const cleanPass = (password || '').trim();

  if (!cleanId || !cleanPass) {
    return { success: false, error: 'Please enter both credentials.' };
  }

  if (role === ROLES.STUDENT) {
    if (
      cleanId.toLowerCase() === DEMO_CREDENTIALS.student.id.toLowerCase() &&
      cleanPass === DEMO_CREDENTIALS.student.password
    ) {
      const user = {
        role: ROLES.STUDENT,
        userId: DEMO_CREDENTIALS.student.id,
        name: DEMO_CREDENTIALS.student.name,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      return { success: true, user };
    }
    // Allow any STU-prefixed student demo login for convenience
    if (cleanId.toUpperCase().startsWith('STU') && cleanPass === 'student123') {
      const user = {
        role: ROLES.STUDENT,
        userId: cleanId.toUpperCase(),
        name: `Student (${cleanId.toUpperCase()})`,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      return { success: true, user };
    }
    return {
      success: false,
      error: 'Invalid Student ID or password. Use STU001 / student123.',
    };
  }

  if (role === ROLES.INVIGILATOR) {
    if (
      cleanId.toLowerCase() === DEMO_CREDENTIALS.invigilator.username.toLowerCase() &&
      cleanPass === DEMO_CREDENTIALS.invigilator.password
    ) {
      const user = {
        role: ROLES.INVIGILATOR,
        userId: DEMO_CREDENTIALS.invigilator.username,
        name: DEMO_CREDENTIALS.invigilator.name,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      return { success: true, user };
    }
    return {
      success: false,
      error: 'Invalid Admin username or password. Use admin / admin123.',
    };
  }

  return { success: false, error: 'Unknown role specification.' };
}

/**
 * Clears authentication session.
 */
export function logout() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    void err;
  }
}

/**
 * Returns currently logged-in user or null.
 * @returns {{ role: string, userId: string, name: string } | null}
 */
export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    void err;
    return null;
  }
}

/**
 * Checks if any user is logged in.
 * @returns {boolean}
 */
export function isAuthenticated() {
  return !!getCurrentUser();
}

/**
 * Checks if current user possesses the required role.
 * @param {'STUDENT' | 'INVIGILATOR'} requiredRole
 * @returns {boolean}
 */
export function hasRole(requiredRole) {
  const user = getCurrentUser();
  return !!user && user.role === requiredRole;
}
