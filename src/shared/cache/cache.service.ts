import { Injectable } from '@nestjs/common';
import { LoggerService } from '../logger/logger.service';

interface CacheEntry<T = unknown> {
  value: T;
  expiresAt?: number;
}

@Injectable()
export class CacheService {
  private readonly store = new Map<string, CacheEntry>();

  constructor(private readonly logger: LoggerService) {
    this.logger.setContext(CacheService.name);
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }

    if (entry.expiresAt && entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: ttl ? Date.now() + this.normalizeTtl(ttl) : undefined,
    });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async reset(): Promise<void> {
    this.store.clear();
  }

  async delByPattern(pattern: string): Promise<void> {
    const regex = this.patternToRegExp(pattern);
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
      }
    }
  }

  async getOrSet<T>(key: string, factory: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    if (value !== null && value !== undefined) {
      await this.set(key, value, ttl);
    }
    return value;
  }

  async mget<T>(keys: string[]): Promise<Map<string, T>> {
    const result = new Map<string, T>();
    await Promise.all(
      keys.map(async (key) => {
        const value = await this.get<T>(key);
        if (value !== null) {
          result.set(key, value);
        }
      }),
    );
    return result;
  }

  async mset<T>(items: Array<{ key: string; value: T; ttl?: number }>): Promise<void> {
    await Promise.all(items.map((item) => this.set(item.key, item.value, item.ttl)));
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = this.patternToRegExp(pattern);
    const result: string[] = [];
    for (const key of this.store.keys()) {
      if ((await this.get(key)) !== null && regex.test(key)) {
        result.push(key);
      }
    }
    return result;
  }

  async incr(key: string, ttl?: number): Promise<number> {
    const current = (await this.get<number>(key)) ?? 0;
    const next = current + 1;
    await this.set(key, next, ttl);
    return next;
  }

  async increment(key: string, ttl?: number): Promise<number> {
    return this.incr(key, ttl);
  }

  async decrement(key: string): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) {
      return 0;
    }

    if (entry.expiresAt && entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return 0;
    }

    const current = typeof entry.value === 'number' ? entry.value : 0;
    const next = Math.max(0, current - 1);
    this.store.set(key, {
      value: next,
      expiresAt: entry.expiresAt,
    });
    return next;
  }

  private normalizeTtl(ttl: number): number {
    // Most project TTLs are expressed in seconds; login lockouts already pass milliseconds.
    return ttl <= 86_400 ? ttl * 1000 : ttl;
  }

  private patternToRegExp(pattern: string): RegExp {
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    return new RegExp(`^${escaped}$`);
  }
}
