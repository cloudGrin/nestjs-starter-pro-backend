export interface CorsOptions {
  origin: string | string[];
  credentials: boolean;
}

export function buildCorsOptions(origin: string | string[], credentials: boolean): CorsOptions {
  return {
    origin,
    credentials: origin === '*' ? false : credentials,
  };
}
