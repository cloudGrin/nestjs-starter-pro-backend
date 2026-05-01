export function toOptionalBoolean(value: unknown): unknown {
  if (value === '' || value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') {
      return true;
    }
    if (normalized === 'false') {
      return false;
    }
  }

  return value;
}

export function toOptionalBooleanFromTransform({
  value,
  obj,
  key,
}: {
  value: unknown;
  obj?: Record<string, unknown>;
  key?: string;
}): unknown {
  const rawValue = key && obj && Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : value;

  return toOptionalBoolean(rawValue);
}
