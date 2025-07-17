import { LOG_LEVEL } from './config.js';

const levels = ['error', 'warn', 'info', 'debug'];

function shouldLog(level) {
  return levels.indexOf(level) <= levels.indexOf(LOG_LEVEL);
}

export const logger = {
  error: (...args) => shouldLog('error') && console.error(...args),
  warn:  (...args) => shouldLog('warn')  && console.warn(...args),
  info:  (...args) => shouldLog('info')  && console.log(...args),
  debug: (...args) => shouldLog('debug') && console.debug(...args),
};
