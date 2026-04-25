export function resolveEnvFilePaths(nodeEnv = process.env.NODE_ENV || 'development'): string[] {
  if (nodeEnv === 'test') {
    return ['.env.test'];
  }

  return ['.env.local', `.env.${nodeEnv}`, '.env'];
}
