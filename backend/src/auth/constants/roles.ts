export const ROLES = {
  ADMIN: 'ADMIN',
  STUDENT: 'STUDENT',
  TEAM_LEADER: 'TEAM_LEADER',
  COORDINATOR: 'COORDINATOR',
  ADVISOR: 'ADVISOR',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

const ROLE_ALIASES: Record<Role, string[]> = {
  [ROLES.ADMIN]: ['ADMIN', 'Admin'],
  [ROLES.STUDENT]: ['STUDENT', 'Student'],
  [ROLES.TEAM_LEADER]: ['TEAM_LEADER', 'TeamLeader', 'TEAMLEADER'],
  [ROLES.COORDINATOR]: ['COORDINATOR', 'Coordinator'],
  [ROLES.ADVISOR]: ['ADVISOR', 'PROFESSOR'],
};

export function normalizeRole(role?: string): Role | undefined {
  if (!role) {
    return undefined;
  }

  const normalized = role.trim();

  for (const canonicalRole of Object.values(ROLES)) {
    if (ROLE_ALIASES[canonicalRole].includes(normalized)) {
      return canonicalRole;
    }
  }

  return undefined;
}

export function hasAnyRole(
  role: string | undefined,
  acceptedRoles: Role[],
): boolean {
  const normalizedRole = normalizeRole(role);
  return normalizedRole !== undefined && acceptedRoles.includes(normalizedRole);
}

export function getAdvisorRoleFilters(): string[] {
  return [...ROLE_ALIASES[ROLES.ADVISOR]];
}
