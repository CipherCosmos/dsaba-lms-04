/**
 * Centralized logging utility
 * Provides consistent logging across the application
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'

  private log(level: LogLevel, message: string, ...args: any[]) {
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

  debug(message: string, ...args: any[]) {
    this.log('debug', message, ...args)
  }

  info(message: string, ...args: any[]) {
    this.log('info', message, ...args)
  }

  warn(message: string, ...args: any[]) {
    this.log('warn', message, ...args)
  }

  error(message: string, ...args: any[]) {
    this.log('error', message, ...args)
  }
}

export const logger = new Logger()

