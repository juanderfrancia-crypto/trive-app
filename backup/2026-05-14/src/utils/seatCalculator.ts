/**
 * Calcula el número de asientos disponibles en una ruta
 * basándose en los bookings confirmados
 */
export const getAvailableSeats = (route: any): number => {
  const confirmedPassengers = (route.passengers || []).filter(
    (p: any) => p.booking_status === 'confirmed'
  ).length;
  return Math.max(0, route.total_seats - confirmedPassengers);
};

/**
 * Obtiene el número de asientos ocupados en una ruta
 */
export const getOccupiedSeats = (route: any): number => {
  return (route.passengers || []).filter(
    (p: any) => p.booking_status === 'confirmed'
  ).length;
};
