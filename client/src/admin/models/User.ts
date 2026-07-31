/** Role of an application user. Single-user today; the model already supports
 *  operators, masters and administrators for future multi-user work. */
export enum UserRole {
  operator = "operator",
  master = "master",
  admin = "admin",
}

const roleTitles: Record<UserRole, string> = {
  [UserRole.operator]: "Оператор",
  [UserRole.master]: "Мастер",
  [UserRole.admin]: "Администратор",
};

export function userRoleTitle(role: UserRole): string {
  return roleTitles[role];
}

export const userRoleOrder: readonly UserRole[] = [
  UserRole.operator,
  UserRole.master,
  UserRole.admin,
];

export interface User {
  id: string;
  name: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
}
