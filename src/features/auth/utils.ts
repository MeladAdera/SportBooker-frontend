/**
 * Maps a user role string to the appropriate home route after login.
 * Extend this as new roles are added.
 */
export function getRoleHomePath(role: string): string {
  switch (role.toLowerCase()) {
    case 'super-admin':
    case 'platform-admin':
      return '/admin';
    case 'operator':
    case 'club-admin':
      return '/operator';
    case 'player':
    case 'member':
      return '/';
    default:
      return '/';
  }
}
