import { useEffect } from 'react';
import { ErrorUtils } from 'react-native';

/**
 * Hook para capturar errores no capturados globalmente en React Native
 * Úsalo en App.tsx o AppNavigator para envolver la app
 */
export const useCrashReporter = () => {
  useEffect(() => {
    // Captura errores no manejados en React Native
    const prevErrorHandler = ErrorUtils.getGlobalHandler?.();
    
    ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
      // Log error
      console.error('🚨 Global Error:', error, 'Fatal:', isFatal);
      
      // Llamar al manejador anterior si existe
      if (prevErrorHandler) {
        prevErrorHandler(error, isFatal);
      }
    });

    return () => {
      // Cleanup - restaurar el manejador anterior
      if (prevErrorHandler) {
        ErrorUtils.setGlobalHandler(prevErrorHandler);
      }
    };
  }, []);
};

