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

  async incr(key: string, ttl?: number): Promise<number> {
    const current = (await this.get<number>(key)) ?? 0;
    const next = current + 1;
    await this.set(key, next, ttl);
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
