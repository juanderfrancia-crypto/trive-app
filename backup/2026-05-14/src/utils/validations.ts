/**
 * Centralized validation utilities for the app
 * Provides consistent validation across all screens and components
 */

// ============================================================================
// EMAIL VALIDATION
// ============================================================================
export const validateEmail = (email: string): { valid: boolean; error?: string } => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!email || email.trim() === '') {
    return { valid: false, error: 'El correo es requerido' };
  }
  
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Formato de correo inválido' };
  }
  
  if (email.length > 255) {
    return { valid: false, error: 'El correo es demasiado largo' };
  }
  
  return { valid: true };
};

// ============================================================================
// PHONE VALIDATION
// ============================================================================
export const validatePhone = (phone: string): { valid: boolean; error?: string } => {
  // Remove spaces, dashes, parentheses
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  const phoneRegex = /^\+?[\d]{7,15}$/;
  
  if (!phone || phone.trim() === '') {
    return { valid: false, error: 'El teléfono es requerido' };
  }
  
  if (!phoneRegex.test(cleanPhone)) {
    return { valid: false, error: 'El teléfono debe tener entre 7-15 dígitos' };
  }
  
  return { valid: true };
};

// ============================================================================
// PASSWORD VALIDATION
// ============================================================================
export const validatePassword = (password: string): { valid: boolean; error?: string } => {
  if (!password || password.trim() === '') {
    return { valid: false, error: 'La contraseña es requerida' };
  }
  
  if (password.length < 6) {
    return { valid: false, error: 'La contraseña debe tener al menos 6 caracteres' };
  }
  
  if (password.length > 128) {
    return { valid: false, error: 'La contraseña es demasiado larga' };
  }
  
  return { valid: true };
};

// ============================================================================
// NAME VALIDATION
// ============================================================================
export const validateName = (name: string): { valid: boolean; error?: string } => {
  const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s'-]{2,100}$/;
  
  if (!name || name.trim() === '') {
    return { valid: false, error: 'El nombre es requerido' };
  }
  
  if (name.trim().length < 2) {
    return { valid: false, error: 'El nombre debe tener al menos 2 caracteres' };
  }
  
  if (!nameRegex.test(name)) {
    return { valid: false, error: 'El nombre contiene caracteres inválidos' };
  }
  
  return { valid: true };
};

// ============================================================================
// PRICE VALIDATION
// ============================================================================
export const validatePrice = (price: number | string): { valid: boolean; error?: string } => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  
  if (price === null || price === undefined || price === '') {
    return { valid: false, error: 'El precio es requerido' };
  }
  
  if (isNaN(numPrice)) {
    return { valid: false, error: 'El precio debe ser un número válido' };
  }
  
  if (numPrice < 0) {
    return { valid: false, error: 'El precio no puede ser negativo' };
  }
  
  if (numPrice > 999999.99) {
    return { valid: false, error: 'El precio es demasiado alto' };
  }
  
  return { valid: true };
};

// ============================================================================
// DOCUMENT SIZE VALIDATION (KB)
// ============================================================================
export const validateDocumentSize = (sizeInBytes: number): { valid: boolean; error?: string } => {
  const maxSizeBytes = 5 * 1024 * 1024; // 5MB
  const minSizeBytes = 10 * 1024; // 10KB
  const sizeMB = sizeInBytes / (1024 * 1024);
  
  if (sizeInBytes < minSizeBytes) {
    return { valid: false, error: 'El archivo es demasiado pequeño (mín. 10KB)' };
  }
  
  if (sizeInBytes > maxSizeBytes) {
    return { valid: false, error: `El archivo es demasiado grande (máx. 5MB, actual: ${sizeMB.toFixed(2)}MB)` };
  }
  
  return { valid: true };
};

// ============================================================================
// DOCUMENT TYPE VALIDATION
// ============================================================================
export const validateDocumentType = (mimeType: string): { valid: boolean; error?: string } => {
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg',
  ];
  
  if (!mimeType) {
    return { valid: false, error: 'El tipo de archivo no se pudo determinar' };
  }
  
  if (!allowedTypes.includes(mimeType)) {
    return { 
      valid: false, 
      error: 'Tipo de archivo no soportado. Usa: PDF, JPG o PNG' 
    };
  }
  
  return { valid: true };
};

// ============================================================================
// BOOKING VALIDATION
// ============================================================================
export const validateBooking = (booking: {
  passengerId?: string;
  routeId?: string;
  seats?: number;
  price?: number;
}): { valid: boolean; error?: string } => {
  if (!booking.passengerId || booking.passengerId.trim() === '') {
    return { valid: false, error: 'ID de pasajero inválido' };
  }
  
  if (!booking.routeId || booking.routeId.trim() === '') {
    return { valid: false, error: 'ID de ruta inválido' };
  }
  
  if (!booking.seats || booking.seats < 1 || booking.seats > 5) {
    return { valid: false, error: 'La cantidad de asientos debe estar entre 1 y 5' };
  }
  
  const priceValidation = validatePrice(booking.price || 0);
  if (!priceValidation.valid) {
    return { valid: false, error: priceValidation.error };
  }
  
  return { valid: true };
};

// ============================================================================
// VEHICLE VALIDATION
// ============================================================================
export const validateVehicle = (vehicle: {
  plate?: string;
  model?: string;
  capacity?: number;
}): { valid: boolean; error?: string } => {
  if (!vehicle.plate || vehicle.plate.trim() === '') {
    return { valid: false, error: 'La placa del vehículo es requerida' };
  }
  
  if (!vehicle.model || vehicle.model.trim() === '') {
    return { valid: false, error: 'El modelo del vehículo es requerido' };
  }
  
  if (!vehicle.capacity || vehicle.capacity < 1 || vehicle.capacity > 9) {
    return { valid: false, error: 'La capacidad debe estar entre 1 y 9 asientos' };
  }
  
  return { valid: true };
};

// ============================================================================
// ROUTE VALIDATION
// ============================================================================
export const validateRoute = (route: {
  origin?: string;
  destination?: string;
  departureTime?: string | Date;
  estimatedDuration?: number;
  price?: number;
  availableSeats?: number;
}): { valid: boolean; error?: string } => {
  if (!route.origin || route.origin.trim() === '') {
    return { valid: false, error: 'El origen es requerido' };
  }
  
  if (!route.destination || route.destination.trim() === '') {
    return { valid: false, error: 'El destino es requerido' };
  }
  
  if (route.origin.trim() === route.destination.trim()) {
    return { valid: false, error: 'El origen y destino no pueden ser iguales' };
  }
  
  if (!route.departureTime) {
    return { valid: false, error: 'La fecha/hora de salida es requerida' };
  }
  
  const departureDate = new Date(route.departureTime);
  const now = new Date();
  if (departureDate <= now) {
    return { valid: false, error: 'La hora de salida debe ser en el futuro' };
  }
  
  if (!route.estimatedDuration || route.estimatedDuration < 15 || route.estimatedDuration > 1440) {
    return { valid: false, error: 'La duración estimada debe estar entre 15 minutos y 24 horas' };
  }
  
  const priceValidation = validatePrice(route.price || 0);
  if (!priceValidation.valid) {
    return { valid: false, error: priceValidation.error };
  }
  
  if (!route.availableSeats || route.availableSeats < 0 || route.availableSeats > 9) {
    return { valid: false, error: 'Los asientos disponibles deben estar entre 0 y 9' };
  }
  
  return { valid: true };
};

// ============================================================================
// GENERIC FIELD VALIDATION
// ============================================================================
export const validateRequired = (value: any, fieldName: string): { valid: boolean; error?: string } => {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
    return { valid: false, error: `${fieldName} es requerido` };
  }
  
  return { valid: true };
};

export const validateMinLength = (value: string, minLength: number, fieldName: string): { valid: boolean; error?: string } => {
  if (!value || value.length < minLength) {
    return { valid: false, error: `${fieldName} debe tener al menos ${minLength} caracteres` };
  }
  
  return { valid: true };
};

export const validateMaxLength = (value: string, maxLength: number, fieldName: string): { valid: boolean; error?: string } => {
  if (value && value.length > maxLength) {
    return { valid: false, error: `${fieldName} no debe exceder ${maxLength} caracteres` };
  }
  
  return { valid: true };
};
