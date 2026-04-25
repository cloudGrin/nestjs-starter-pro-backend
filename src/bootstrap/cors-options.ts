export interface CorsOptions {
  origin: string | string[];
  credentials: boolean;
}

export function buildCorsOptions(origin: string | string[], credentials: boolean): CorsOptions {
  const hasWildcard = origin === '*' || (Array.isArray(origin) && origin.includes('*'));

  return {
    origin,
    credentials: hasWildcard ? false : credentials,
  };
}
