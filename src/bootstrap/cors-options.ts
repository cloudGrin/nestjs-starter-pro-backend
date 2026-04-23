export interface CorsOptions {
  origin: string;
  credentials: boolean;
}

export function buildCorsOptions(origin: string, credentials: boolean): CorsOptions {
  return {
    origin,
    credentials: origin === '*' ? false : credentials,
  };
}
