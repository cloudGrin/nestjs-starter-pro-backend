import { createHash } from 'crypto';

export const hashRefreshToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

export function getExpiresInSeconds(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)([dhms])$/);
  if (!match) {
    return 3600;
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 'd':
      return value * 86400;
    case 'h':
      return value * 3600;
    case 'm':
      return value * 60;
    case 's':
      return value;
    default:
      return 3600;
  }
}
