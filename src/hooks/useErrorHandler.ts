/**
 * Hook for easy error handling in components
 */

import { useCallback } from 'react';
import { errorHandler, ErrorType, ErrorSeverity } from '../services/errorHandler';

export const useErrorHandler = () => {
  const handleError = useCallback(
    (
      error: Error | string,
      type: ErrorType = ErrorType.UNKNOWN,
      severity: ErrorSeverity = ErrorSeverity.MEDIUM,
      showToast = true
    ) => {
      errorHandler.handle(error, type, severity, showToast);
    },
    []
  );

  const handleApiError = useCallback((error: any, context?: Record<string, any>) => {
    errorHandler.handleApiError(error, context);
  }, []);

  const handleSupabaseError = useCallback(
    (error: any, operation: string, context?: Record<string, any>) => {
      errorHandler.handleSupabaseError(error, operation, context);
    },
    []
  );

  const handlePaymentError = useCallback((error: any, context?: Record<string, any>) => {
    errorHandler.handlePaymentError(error, context);
  }, []);

  const handleFileError = useCallback((error: any, context?: Record<string, any>) => {
    errorHandler.handleFileError(error, context);
  }, []);

  return {
    handleError,
    handleApiError,
    handleSupabaseError,
    handlePaymentError,
    handleFileError,
  };
};
