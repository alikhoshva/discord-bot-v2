import config from '../config.js';

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  constructor() {
    this.level = this._normalizeLevel(config.logLevel || 'info');
  }

  _normalizeLevel(levelStr) {
    const lower = (levelStr || 'info').toLowerCase();
    return LOG_LEVELS[lower] !== undefined ? LOG_LEVELS[lower] : LOG_LEVELS.info;
  }

  _format(levelName, message, ...extra) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${levelName.toUpperCase()}] ${message}`;

    if (extra.length === 0) {
      return [prefix];
    }
    return [prefix, ...extra];
  }

  debug(message, ...extra) {
    if (this.level <= LOG_LEVELS.debug) {
      console.log(...this._format('debug', message, ...extra));
    }
  }

  info(message, ...extra) {
    if (this.level <= LOG_LEVELS.info) {
      console.log(...this._format('info', message, ...extra));
    }
  }

  warn(message, ...extra) {
    if (this.level <= LOG_LEVELS.warn) {
      console.warn(...this._format('warn', message, ...extra));
    }
  }

  error(message, ...extra) {
    if (this.level <= LOG_LEVELS.error) {
      console.error(...this._format('error', message, ...extra));
    }
  }
}

const logger = new Logger();
export default logger;
