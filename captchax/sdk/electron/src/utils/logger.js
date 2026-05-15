class Logger {
  constructor(options = {}) {
    this.level = options.level || 'info';
    this.prefix = options.prefix || '[CaptchaX]';
    this.enabled = options.enabled !== false;
    
    this.levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
  }

  shouldLog(level) {
    return this.levels[level] >= this.levels[this.level];
  }

  formatMessage(level, message, data) {
    const timestamp = new Date().toISOString();
    let formatted = `${timestamp} ${this.prefix} [${level.toUpperCase()}] ${message}`;
    
    if (data) {
      formatted += ` ${JSON.stringify(data)}`;
    }
    
    return formatted;
  }

  debug(message, data) {
    if (this.enabled && this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, data));
    }
  }

  info(message, data) {
    if (this.enabled && this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, data));
    }
  }

  warn(message, data) {
    if (this.enabled && this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, data));
    }
  }

  error(message, data) {
    if (this.enabled && this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, data));
    }
  }

  setLevel(level) {
    if (this.levels[level] !== undefined) {
      this.level = level;
    }
  }

  setPrefix(prefix) {
    this.prefix = prefix;
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
  }
}

const defaultLogger = new Logger();

module.exports = {
  Logger,
  defaultLogger
};
