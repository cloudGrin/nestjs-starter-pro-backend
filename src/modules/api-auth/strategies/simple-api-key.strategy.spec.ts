import { ApiKeyStrategy } from './simple-api-key.strategy';
import { ApiAuthService } from '../services/api-auth.service';

describe('ApiKeyStrategy', () => {
  it('authenticates API key without platform statistics, IP whitelist, or custom rate limit', async () => {
    const apiAuthService = {
      validateApiKey: jest.fn().mockResolvedValue({
        id: 1,
        name: 'Mini Program',
        scopes: ['read:users'],
      }),
    } as unknown as jest.Mocked<ApiAuthService>;

    const strategy = new ApiKeyStrategy(apiAuthService);

    await strategy.validate({
      headers: {
        'x-api-key': 'sk_test_key',
        'user-agent': 'jest',
      },
      method: 'GET',
      path: '/v1/open/users',
      ip: '127.0.0.1',
      connection: {},
    } as any);

    expect(apiAuthService.validateApiKey).toHaveBeenCalledWith('sk_test_key');
  });
});
