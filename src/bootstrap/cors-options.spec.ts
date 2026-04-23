import { buildCorsOptions } from './cors-options';

describe('buildCorsOptions', () => {
  it('disables credentials when CORS origin is wildcard', () => {
    expect(buildCorsOptions('*', true)).toEqual({
      origin: '*',
      credentials: false,
    });
  });

  it('keeps credentials for explicit origins', () => {
    expect(buildCorsOptions('http://localhost:5173', true)).toEqual({
      origin: 'http://localhost:5173',
      credentials: true,
    });
  });
});
