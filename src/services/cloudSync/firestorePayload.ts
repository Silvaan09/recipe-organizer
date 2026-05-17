type FirestorePayloadValue =
  | FirestorePayloadValue[]
  | { [key: string]: FirestorePayloadValue }
  | boolean
  | null
  | number
  | string;

function sanitizeValue(value: unknown): FirestorePayloadValue | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item) ?? null);
  }

  if (typeof value === 'object') {
    const sanitizedObject: Record<string, FirestorePayloadValue> = {};

    Object.entries(value).forEach(([key, nestedValue]) => {
      const sanitizedValue = sanitizeValue(nestedValue);

      if (sanitizedValue !== undefined) {
        sanitizedObject[key] = sanitizedValue;
      }
    });

    return sanitizedObject;
  }

  return null;
}

export function sanitizeFirestorePayload<T extends Record<string, unknown>>(payload: T) {
  return sanitizeValue(payload) as Record<string, FirestorePayloadValue>;
}

export function assertNoUndefinedFirestoreValues(value: unknown, path = 'payload') {
  if (value === undefined) {
    throw new Error(`Firestore payload contains undefined at ${path}.`);
  }

  if (value === null || typeof value !== 'object') {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoUndefinedFirestoreValues(item, `${path}[${index}]`));
    return;
  }

  Object.entries(value).forEach(([key, nestedValue]) => {
    assertNoUndefinedFirestoreValues(nestedValue, `${path}.${key}`);
  });
}
