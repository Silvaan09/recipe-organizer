type LogContext = Record<string, unknown>;

const DEBUG_STORAGE_KEY = 'recipe-organizer.debug';

function shouldDebugLog() {
  return localStorage.getItem(DEBUG_STORAGE_KEY) === 'true';
}

export const logger = {
  debug(message: string, context?: LogContext) {
    if (shouldDebugLog()) {
      console.debug(`[Recipe Organizer] ${message}`, context ?? '');
    }
  },
  error(message: string, error?: unknown, context?: LogContext) {
    console.error(`[Recipe Organizer] ${message}`, { error, ...context });
  },
  warn(message: string, context?: LogContext) {
    console.warn(`[Recipe Organizer] ${message}`, context ?? '');
  },
};
