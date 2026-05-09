export const normalizeRole = (role) => String(role || '').trim().toLowerCase();

export const hasRole = (role, expectedRole) =>
  normalizeRole(role) === normalizeRole(expectedRole);

export const hasAnyRole = (role, expectedRoles = []) =>
  expectedRoles.some((expectedRole) => hasRole(role, expectedRole));
