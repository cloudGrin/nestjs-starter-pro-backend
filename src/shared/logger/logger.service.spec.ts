import { ConfigService } from '@nestjs/config';
import { LoggerService } from './logger.service';
import * as winston from 'winston';

const loggerMock = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
};

jest.mock('winston', () => ({
  createLogger: jest.fn(() => loggerMock),
  format: {
    combine: jest.fn((...args) => args),
    timestamp: jest.fn((arg) => arg),
    errors: jest.fn((arg) => arg),
    splat: jest.fn(() => ({})),
    json: jest.fn(() => ({})),
    colorize: jest.fn((arg) => arg),
    printf: jest.fn((formatter) => formatter),
  },
  transports: {
    Console: jest.fn(),
  },
}));

jest.mock('winston-daily-rotate-file', () => jest.fn());

describe('LoggerService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not keep mutable shared context from setContext', () => {
    const logger = new LoggerService({
      get: jest.fn((key: string, defaultValue?: unknown) => {
        const config = {
          'logging.level': 'debug',
          'logging.dir': './logs',
          isDevelopment: false,
        };
        return config[key] ?? defaultValue;
      }),
    } as unknown as ConfigService);

    logger.setContext('UserService');
    logger.setContext('RoleService');
    logger.log('created');

    expect(loggerMock.info).toHaveBeenCalledWith('created', { context: undefined });
  });

  it('keeps console logging enabled in production so bootstrap credentials are visible in container logs', () => {
    new LoggerService({
      get: jest.fn((key: string, defaultValue?: unknown) => {
        const config = {
          'logging.level': 'info',
          'logging.dir': './logs',
          isDevelopment: false,
        };
        return config[key] ?? defaultValue;
      }),
    } as unknown as ConfigService);

    expect(winston.transports.Console).toHaveBeenCalled();
  });
});
