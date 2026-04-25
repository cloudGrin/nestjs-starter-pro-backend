import {
  ApiAppDeleteResponseDto,
  ApiKeyCreatedResponseDto,
  ApiKeyListItemDto,
  ApiKeyRevokeResponseDto,
} from './api-app-response.dto';

describe('api app response DTOs', () => {
  it('maps one-time API key creation response without leaking key hash', () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const expiresAt = new Date('2026-02-01T00:00:00.000Z');

    const response = ApiKeyCreatedResponseDto.fromKey({
      id: 1,
      name: 'Mini Program',
      rawKey: 'sk_test_secret',
      prefix: 'sk_test',
      suffix: 'abcd',
      scopes: ['users:read'],
      expiresAt,
      createdAt,
      keyHash: 'hash-should-not-leak',
    } as any);

    expect(response).toEqual({
      id: 1,
      name: 'Mini Program',
      key: 'sk_test_secret',
      prefix: 'sk_test',
      suffix: 'abcd',
      scopes: ['users:read'],
      expiresAt,
      createdAt,
      message: '请立即复制并安全保存此密钥，它将不会再次显示',
    });
    expect(response).not.toHaveProperty('keyHash');
  });

  it('maps listed API keys to display-only values', () => {
    const lastUsedAt = new Date('2026-01-02T00:00:00.000Z');
    const expiresAt = new Date('2026-02-01T00:00:00.000Z');
    const createdAt = new Date('2026-01-01T00:00:00.000Z');

    const response = ApiKeyListItemDto.fromKey({
      id: 2,
      name: 'Server Key',
      rawKey: 'sk_live_secret',
      prefix: 'sk_live',
      suffix: 'wxyz',
      scopes: ['users:read'],
      isActive: true,
      lastUsedAt,
      usageCount: 3,
      expiresAt,
      createdAt,
      keyHash: 'hash-should-not-leak',
    } as any);

    expect(response).toEqual({
      id: 2,
      name: 'Server Key',
      displayKey: 'sk_live_****...wxyz',
      scopes: ['users:read'],
      isActive: true,
      lastUsedAt,
      usageCount: 3,
      expiresAt,
      createdAt,
    });
    expect(response).not.toHaveProperty('rawKey');
    expect(response).not.toHaveProperty('keyHash');
  });

  it('keeps command responses explicit', () => {
    expect(ApiAppDeleteResponseDto.success()).toEqual({
      message: 'API应用已停用',
    });
    expect(ApiKeyRevokeResponseDto.success()).toEqual({
      message: 'API密钥已撤销',
    });
  });
});
