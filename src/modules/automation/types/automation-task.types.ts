export interface AutomationTaskResult {
  message?: string;
  metadata?: Record<string, unknown>;
}

export type AutomationTaskParams = Record<string, unknown>;

export interface AutomationTaskDefinition {
  key: string;
  name: string;
  description?: string;
  defaultCron: string;
  defaultEnabled?: boolean;
  defaultParams?: AutomationTaskParams;
  validateParams?: (params: AutomationTaskParams) => AutomationTaskParams;
  handler: (params: AutomationTaskParams) => Promise<AutomationTaskResult | void>;
}
