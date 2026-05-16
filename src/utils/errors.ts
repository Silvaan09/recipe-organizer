import { logger } from './logger';

export function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

export function logAndReturnMessage(error: unknown, fallback: string, context?: Record<string, unknown>) {
  logger.error(fallback, error, context);

  return toErrorMessage(error, fallback);
}
