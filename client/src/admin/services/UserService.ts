import { nowIso } from "@/extensions/date";
import { makeId } from "@/utilities/id";
import { UserRole, type User } from "../models";
import type { UserRepository } from "../repositories/AdminRepositories";

/**
 * Manages application users. The app runs single-user today, but the model and
 * repository already support operators, masters and administrators, so
 * multi-user work can be added without a schema change.
 */
export interface UserService {
  ensureDefault(): Promise<User>;
  list(): Promise<User[]>;
  current(): Promise<User | undefined>;
  add(name: string, role: UserRole): Promise<User>;
}

export function createUserService(repository: UserRepository): UserService {
  return {
    async ensureDefault() {
      const existing = await repository.getAll();
      if (existing.length > 0) {
        return existing[0];
      }
      const admin: User = {
        id: makeId(),
        name: "Администратор",
        role: UserRole.admin,
        active: true,
        createdAt: nowIso(),
      };
      await repository.save(admin);
      return admin;
    },
    async list() {
      return repository.getAll();
    },
    async current() {
      const all = await repository.getAll();
      return all.find((user) => user.active) ?? all[0];
    },
    async add(name, role) {
      const user: User = { id: makeId(), name, role, active: true, createdAt: nowIso() };
      await repository.save(user);
      return user;
    },
  };
}
