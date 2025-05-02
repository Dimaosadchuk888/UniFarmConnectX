// Экспортируем хранилище с реализацией адаптера (DatabaseStorage или MemStorage)
import { storage } from './storage-adapter';
import type { IStorage } from './storage-memory';

export { storage };
export type { IStorage };