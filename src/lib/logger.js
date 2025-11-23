/**
 * Logger Service
 * 
 * This service provides a centralized way to log messages.
 * Currently, it logs to the console, but it is designed to be easily extended
 * to log to a database, file, or external service in the future.
 */

const LOG_LEVELS = {
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  DEBUG: 'DEBUG',
};

class Logger {
  constructor() {
    // In the future, we can initialize DB connections or file streams here
  }

  /**
   * Formats the log message with timestamp and level.
   * @param {string} level 
   * @param {string} message 
   * @param {object} meta 
   */
  _format(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    return {
      timestamp,
      level,
      message,
      ...meta,
    };
  }

  /**
   * Log an info message
   * @param {string} message 
   * @param {object} meta - Additional metadata to log
   */
  info(message, meta = {}) {
    const logEntry = this._format(LOG_LEVELS.INFO, message, meta);
    console.log(JSON.stringify(logEntry));
    // Future: Save to DB
  }

  /**
   * Log a warning message
   * @param {string} message 
   * @param {object} meta 
   */
  warn(message, meta = {}) {
    const logEntry = this._format(LOG_LEVELS.WARN, message, meta);
    console.warn(JSON.stringify(logEntry));
    // Future: Save to DB
  }

  /**
   * Log an error message
   * @param {string} message 
   * @param {Error|object} error - The error object or message
   * @param {object} meta 
   */
  error(message, error = null, meta = {}) {
    const errorDetails = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : error;

    const logEntry = this._format(LOG_LEVELS.ERROR, message, { ...meta, error: errorDetails });
    console.error(JSON.stringify(logEntry));
    // Future: Save to DB
  }

  /**
   * Log a debug message (only in development)
   * @param {string} message 
   * @param {object} meta 
   */
  debug(message, meta = {}) {
    if (process.env.NODE_ENV === 'development') {
      const logEntry = this._format(LOG_LEVELS.DEBUG, message, meta);
      console.debug(JSON.stringify(logEntry));
    }
  }
}

// Export a singleton instance
export const logger = new Logger();
