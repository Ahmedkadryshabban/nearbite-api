export const ROLES = ['admin', 'customer'] as const;
export type Role = (typeof ROLES)[number];