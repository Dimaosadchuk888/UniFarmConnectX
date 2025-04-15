import { authUsers, type AuthUser, type InsertAuthUser } from "@shared/schema";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: number): Promise<AuthUser | undefined>;
  getUserByUsername(username: string): Promise<AuthUser | undefined>;
  createUser(user: InsertAuthUser): Promise<AuthUser>;
}

export class MemStorage implements IStorage {
  private users: Map<number, AuthUser>;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.currentId = 1;
  }

  async getUser(id: number): Promise<AuthUser | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<AuthUser | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertAuthUser): Promise<AuthUser> {
    const id = this.currentId++;
    const user: AuthUser = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
}

export const storage = new MemStorage();
