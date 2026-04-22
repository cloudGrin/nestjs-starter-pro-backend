import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from './cache.service';
import { LoggerService } from '../logger/logger.service';

describe('CacheService', () => {
  let service: CacheService;

  const logger = {
    setContext: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    log: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useRealTimers();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: LoggerService,
          useValue: logger,
        },
      ],
    }).compile();

    service = module.get(CacheService);
  });

  it('stores and reads values from process memory', async () => {
    await service.set('test-key', { ok: true });

    await expect(service.get('test-key')).resolves.toEqual({ ok: true });
  });

  it('returns null for missing or expired values', async () => {
    jest.useFakeTimers();
    await service.set('short-key', 'value', 1);

    jest.advanceTimersByTime(1001);

    await expect(service.get('missing-key')).resolves.toBeNull();
    await expect(service.get('short-key')).resolves.toBeNull();
  });

  it('supports getOrSet without external dependencies', async () => {
    const factory = jest.fn().mockResolvedValue('computed');

    await expect(service.getOrSet('computed-key', factory, 60)).resolves.toBe('computed');
    await expect(service.getOrSet('computed-key', factory, 60)).resolves.toBe('computed');
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('increments and decrements counters in memory', async () => {
    await expect(service.increment('counter')).resolves.toBe(1);
    await expect(service.increment('counter')).resolves.toBe(2);
    await expect(service.decrement('counter')).resolves.toBe(1);
  });

  it('decrement never goes below zero', async () => {
    await expect(service.decrement('counter')).resolves.toBe(0);
  });

  it('preserves existing TTL when decrementing counters', async () => {
    jest.useFakeTimers();
    await service.set('limited-counter', 2, 1);

    await expect(service.decrement('limited-counter')).resolves.toBe(1);
    jest.advanceTimersByTime(1001);

    await expect(service.get('limited-counter')).resolves.toBeNull();
  });

  it('deletes keys by simple wildcard pattern', async () => {
    await service.set('user:1', 'a');
    await service.set('user:2', 'b');
    await service.set('role:1', 'c');

    await service.delByPattern('user:*');

    await expect(service.get('user:1')).resolves.toBeNull();
    await expect(service.get('user:2')).resolves.toBeNull();
    await expect(service.get('role:1')).resolves.toBe('c');
  });
});
