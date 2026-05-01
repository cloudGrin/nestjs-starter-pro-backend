export interface ApiScopeDefinition {
  code: string;
  label: string;
  description: string;
}

export interface ApiEndpointDefinition {
  scope: string;
  method: string;
  path: string;
  summary: string;
  description?: string;
}

export interface ApiScopeGroup {
  key: string;
  title: string;
  scopes: ApiScopeDefinition[];
  endpoints: ApiEndpointDefinition[];
}

export interface OpenApiEndpointMetadata {
  scope: string;
  label: string;
  description: string;
  group: {
    key: string;
    title: string;
  };
  summary: string;
}

export const OPEN_API_CONTROLLER_KEY = 'open-api-controller';
export const OPEN_API_ENDPOINT_KEY = 'open-api-endpoint';
