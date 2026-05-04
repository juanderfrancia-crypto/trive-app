/**
 * Centralized Error Handling Service
 * Manages error logging, reporting, and user feedback
 */

import Toast from 'react-native-toast-message';
import { supabase } from './supabase';

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum ErrorType {
  NETWORK = 'NETWORK_ERROR',
  AUTH = 'AUTH_ERROR',
  VALIDATION = 'VALIDATION_ERROR',
  DATABASE = 'DATABASE_ERROR',
  PAYMENT = 'PAYMENT_ERROR',
  FILE = 'FILE_ERROR',
  UNKNOWN = 'UNKNOWN_ERROR',
}

interface ErrorLog {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  userMessage: string;
  timestamp: Date;
  userId?: string;
  context?: Record<string, any>;
  stack?: string;
}

class ErrorHandler {
  private errorLogs: ErrorLog[] = [];
  private readonly maxLogs = 100;

  /**
   * Log error internally and optionally show to user
   */
  handle(
    error: Error | string,
    type: ErrorType = ErrorType.UNKNOWN,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    showToast = true,
    context?: Record<string, any>
  ) {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const stack = typeof error === 'string' ? undefined : error.stack;

    const userMessage = this.getUserMessage(errorMessage, type);
    const errorLog: ErrorLog = {
      type,
      severity,
      message: errorMessage,
      userMessage,
      timestamp: new Date(),
      context,
      stack,
    };

    // Guardar log
    this.addLog(errorLog);

    // Registrar en consola en desarrollo
    if (__DEV__) {
      console.error(`[${type}]`, {
        message: errorMessage,
        severity,
        context,
        stack,
      });
    }

    // Reportar errores críticos a logging service
    if (severity === ErrorSeverity.CRITICAL || severity === ErrorSeverity.HIGH) {
      this.reportError(errorLog);
    }

    // Mostrar toast al usuario
    if (showToast) {
      this.showErrorToast(userMessage, severity);
    }

    return errorLog;
  }

  /**
   * Handle API errors specifically
   */
  handleApiError(
    error: any,
    context?: Record<string, any>
  ) {
    let type = ErrorType.NETWORK;
    let severity = ErrorSeverity.MEDIUM;
    let message = 'Error en servidor';

    if (error?.status) {
      if (error.status === 401 || error.status === 403) {
        type = ErrorType.AUTH;
        message = 'No tienes permisos para esta acción';
        severity = ErrorSeverity.HIGH;
      } else if (error.status === 400) {
        type = ErrorType.VALIDATION;
        message = error.message || 'Datos inválidos';
      } else if (error.status === 500) {
        type = ErrorType.DATABASE;
        message = 'Error en el servidor';
        severity = ErrorSeverity.HIGH;
      } else if (error.status === 503) {
        type = ErrorType.NETWORK;
        message = 'Servicio no disponible - intenta más tarde';
      }
    } else if (error?.message?.includes('Network')) {
      type = ErrorType.NETWORK;
      message = 'No hay conexión a internet';
    }

    return this.handle(message, type, severity, true, context);
  }

  /**
   * Handle Supabase errors
   */
  handleSupabaseError(
    error: any,
    operation: string,
    context?: Record<string, any>
  ) {
    let type = ErrorType.DATABASE;
    let severity = ErrorSeverity.MEDIUM;
    let message = 'Error en la base de datos';

    if (error?.code === 'PGRST116') {
      message = 'Recurso no encontrado';
    } else if (error?.code === '23505') {
      type = ErrorType.VALIDATION;
      message = 'Este registro ya existe';
    } else if (error?.code === '23503') {
      type = ErrorType.VALIDATION;
      message = 'No se puede eliminar: hay datos relacionados';
    } else if (error?.code === '23502') {
      type = ErrorType.VALIDATION;
      message = 'Faltan datos requeridos';
    } else if (error?.message?.includes('auth')) {
      type = ErrorType.AUTH;
      message = 'Error de autenticación';
    }

    const fullContext = {
      ...context,
      operation,
      code: error?.code,
      hint: error?.hint,
    };

    return this.handle(message, type, severity, true, fullContext);
  }

  /**
   * Handle payment errors
   */
  handlePaymentError(
    error: any,
    context?: Record<string, any>
  ) {
    let message = 'Error al procesar el pago';
    let severity = ErrorSeverity.HIGH;

    if (error?.code === 'card_declined') {
      message = 'Tu tarjeta fue rechazada';
    } else if (error?.code === 'insufficient_funds') {
      message = 'Fondos insuficientes';
    } else if (error?.code === 'expired_card') {
      message = 'Tu tarjeta está vencida';
    } else if (error?.code === 'lost_card') {
      message = 'Tarjeta reportada como perdida';
    }

    return this.handle(message, ErrorType.PAYMENT, severity, true, context);
  }

  /**
   * Handle file errors
   */
  handleFileError(
    error: any,
    context?: Record<string, any>
  ) {
    let message = 'Error al procesar el archivo';

    if (error?.message?.includes('size')) {
      message = 'El archivo es demasiado grande (máx 5MB)';
    } else if (error?.message?.includes('type')) {
      message = 'Formato de archivo no soportado';
    } else if (error?.message?.includes('upload')) {
      message = 'Error al subir el archivo';
    }

    return this.handle(message, ErrorType.FILE, ErrorSeverity.MEDIUM, true, context);
  }

  /**
   * Get user-friendly error message
   */
  private getUserMessage(error: string, type: ErrorType): string {
    // Si el error ya es amigable, devolverlo
    if (
      error.includes('is required') ||
      error.includes('debe') ||
      error.includes('Debes') ||
      error.includes('no puede') ||
      error.includes('correctos') ||
      error.includes('inválido')
    ) {
      return error;
    }

    // Mapeo de errores técnicos a mensajes amigables en español
    const messages: Record<ErrorType, string> = {
      [ErrorType.NETWORK]: '📡 Sin conexión a internet. Verifica tu WiFi o datos móviles.',
      [ErrorType.AUTH]: '🔐 Error de autenticación. Por favor inicia sesión de nuevo.',
      [ErrorType.VALIDATION]: '✏️ Algunos datos no son válidos. Revisa la información.',
      [ErrorType.DATABASE]: '🔧 Tuvimos un problema. Por favor intenta más tarde.',
      [ErrorType.PAYMENT]: '💳 No pudimos procesar el pago. Intenta con otro método.',
      [ErrorType.FILE]: '📁 Problema al procesar el archivo. Intenta de nuevo.',
      [ErrorType.UNKNOWN]: '⚠️ Algo salió mal. Por favor intenta de nuevo.',
    };

    return messages[type] || messages[ErrorType.UNKNOWN];
  }

  /**
   * Show error toast
   */
  private showErrorToast(message: string, severity: ErrorSeverity) {
    const toastType = severity === ErrorSeverity.CRITICAL ? 'error' : 'info';

    Toast.show({
      type: toastType,
      text1: 'Error',
      text2: message,
      visibilityTime: severity === ErrorSeverity.CRITICAL ? 5000 : 3000,
    });
  }

  /**
   * Add log to internal storage
   */
  private addLog(log: ErrorLog) {
    this.errorLogs.push(log);

    // Mantener límite de logs
    if (this.errorLogs.length > this.maxLogs) {
      this.errorLogs = this.errorLogs.slice(-this.maxLogs);
    }
  }

  /**
   * Report critical errors to backend
   */
  private async reportError(log: ErrorLog) {
    try {
      // TODO: Implementar tabla de error_logs en Supabase
      // await supabase.from('error_logs').insert([{
      //   type: log.type,
      //   severity: log.severity,
      //   message: log.message,
      //   context: log.context,
      //   stack: log.stack,
      //   timestamp: log.timestamp,
      // }]);
    } catch (error) {
      console.error('Failed to report error:', error);
    }
  }

  /**
   * Get all logged errors
   */
  getLogs(): ErrorLog[] {
    return [...this.errorLogs];
  }

  /**
   * Clear error logs
   */
  clearLogs() {
    this.errorLogs = [];
  }

  /**
   * Get logs filtered by type or severity
   */
  getFilteredLogs(
    type?: ErrorType,
    severity?: ErrorSeverity
  ): ErrorLog[] {
    return this.errorLogs.filter(log =>
      (!type || log.type === type) &&
      (!severity || log.severity === severity)
    );
  }

  /**
   * Export logs for debugging
   */
  exportLogs(): string {
    return JSON.stringify(this.errorLogs, null, 2);
  }
}

// Singleton instance
export const errorHandler = new ErrorHandler();

/**
 * Async error handler wrapper for promises
 */
export const handleAsync = async <T>(
  fn: () => Promise<T>,
  errorType: ErrorType = ErrorType.UNKNOWN,
  context?: Record<string, any>
): Promise<T | null> => {
  try {
    return await fn();
  } catch (error) {
    errorHandler.handle(
      error as Error,
      errorType,
      ErrorSeverity.MEDIUM,
      true,
      context
    );
    return null;
  }
};
