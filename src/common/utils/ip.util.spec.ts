import { Request } from 'express';
import { IpUtil } from './ip.util';

describe('IpUtil', () => {
  const createRequest = (overrides: Partial<Request>): Request =>
    ({
      headers: {},
      ip: '10.0.0.5',
      socket: { remoteAddress: '::ffff:10.0.0.6' },
      connection: { remoteAddress: '::ffff:10.0.0.7' },
      ...overrides,
    }) as Request;

  it('does not trust forwarded headers by default', () => {
    const req = createRequest({
      headers: {
        'x-forwarded-for': '203.0.113.10, 10.0.0.1',
        'x-real-ip': '203.0.113.11',
      },
      ip: '::ffff:10.0.0.9',
    });

    expect(IpUtil.getRealIp(req)).toBe('10.0.0.9');
  });

  it('uses forwarded headers only when proxy trust is enabled', () => {
    const req = createRequest({
      headers: {
        'x-forwarded-for': '203.0.113.10, 10.0.0.1',
      },
    });

    expect(IpUtil.getRealIp(req, true)).toBe('203.0.113.10');
  });
});
