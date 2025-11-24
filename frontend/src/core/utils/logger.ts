/**
 * Centralized logging utility
 * Provides consistent logging across the application
 */

import type { LoggerArgs } from '../types'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'

  /**
   * Logs a message with the specified level and additional arguments.
   * @param level - The log level (e.g., 'debug', 'info', 'warn', 'error')
   * @param message - The primary log message
   * @param args - Additional arguments to log, which can include strings, numbers, booleans, objects, null, or undefined
   */
  private log(level: LogLevel, message: string, ...args: LoggerArgs) {
    if (!this.isDevelopment && level === 'debug') {
      return // Skip debug logs in production
    }

    const prefix = `[${level.toUpperCase()}]`
    const timestamp = new Date().toISOString()

    switch (level) {
      case 'debug':
        console.debug(`${timestamp} ${prefix}`, message, ...args)
        break
      case 'info':
        console.info(`${timestamp} ${prefix}`, message, ...args)
        break
      case 'warn':
        console.warn(`${timestamp} ${prefix}`, message, ...args)
        break
      case 'error':
        console.error(`${timestamp} ${prefix}`, message, ...args)
        break
    }
  }

  debug(message: string, ...args: LoggerArgs) {
    this.log('debug', message, ...args)
  }

  info(message: string, ...args: LoggerArgs) {
    this.log('info', message, ...args)
  }

  warn(message: string, ...args: LoggerArgs) {
    this.log('warn', message, ...args)
  }

  error(message: string, ...args: LoggerArgs) {
    this.log('error', message, ...args)
  }
}

export const logger = new Logger()

