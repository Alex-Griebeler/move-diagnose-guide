// ============================================
// Logger Utility
// Controle de logs por ambiente
// Em produção: apenas erros críticos
// Em desenvolvimento: logs completos
// ============================================

const isDev = import.meta.env.DEV;

interface LoggerConfig {
  prefix?: string;
  showTimestamp?: boolean;
}

class Logger {
  private prefix: string;
  private showTimestamp: boolean;

  constructor(config: LoggerConfig = {}) {
    this.prefix = config.prefix || '[FABRIK]';
    this.showTimestamp = config.showTimestamp ?? false;
  }

  private formatMessage(level: string, message: string): string {
    const timestamp = this.showTimestamp 
      ? `[${new Date().toISOString()}] ` 
      : '';
    return `${timestamp}${this.prefix} ${level}: ${message}`;
  }

  /**
   * Debug logs - apenas em desenvolvimento
   */
  debug(message: string, ...args: unknown[]): void {
    if (isDev) {
      console.log(this.formatMessage('DEBUG', message), ...args);
    }
  }

  /**
   * Info logs - apenas em desenvolvimento
   */
  info(message: string, ...args: unknown[]): void {
    if (isDev) {
      console.info(this.formatMessage('INFO', message), ...args);
    }
  }

  /**
   * Warning logs - apenas em desenvolvimento
   */
  warn(message: string, ...args: unknown[]): void {
    if (isDev) {
      console.warn(this.formatMessage('WARN', message), ...args);
    }
  }

  /**
   * Error logs - sempre exibidos (produção e desenvolvimento)
   * Mas sem dados sensíveis
   */
  error(message: string, error?: unknown): void {
    // Em produção, apenas a mensagem genérica
    if (!isDev) {
      console.error(this.formatMessage('ERROR', message));
      return;
    }
    
    // Em dev, log completo
    console.error(this.formatMessage('ERROR', message), error);
  }

  /**
   * Group logs - apenas em desenvolvimento
   */
  group(label: string): void {
    if (isDev) {
      console.group(`${this.prefix} ${label}`);
    }
  }

  /**
   * End group - apenas em desenvolvimento
   */
  groupEnd(): void {
    if (isDev) {
      console.groupEnd();
    }
  }

  /**
   * Table logs - apenas em desenvolvimento
   */
  table(data: unknown): void {
    if (isDev) {
      console.table(data);
    }
  }
}

// Instância principal do logger
export const logger = new Logger();

// Factory para criar loggers com prefixos específicos
export function createLogger(prefix: string): Logger {
  return new Logger({ prefix: `[${prefix}]` });
}

// Export da classe para casos especiais
export { Logger };
