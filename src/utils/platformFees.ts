// Mismas fórmulas que las funciones de Supabase (calculate_route_fee / calculate_trip_accept_fee
// en 20261118120000_percentage_based_platform_fees.sql). Si cambia una, cambia la otra.

export const ROUTE_FEE_MIN = 2500
export const ROUTE_FEE_MAX = 20000
const ROUTE_FEE_RATE = 0.078125

export function calculateRouteFee(pricePerSeat: number, totalSeats: number): number {
  const raw = pricePerSeat * totalSeats * ROUTE_FEE_RATE
  return Math.min(ROUTE_FEE_MAX, Math.max(ROUTE_FEE_MIN, Math.round(raw)))
}

export const TRIP_ACCEPT_FEE_MIN = 3000
export const TRIP_ACCEPT_FEE_MAX = 25000
const TRIP_ACCEPT_FEE_RATE = 0.10

export function calculateTripAcceptFee(tripValue: number): number {
  const raw = tripValue * TRIP_ACCEPT_FEE_RATE
  return Math.min(TRIP_ACCEPT_FEE_MAX, Math.max(TRIP_ACCEPT_FEE_MIN, Math.round(raw)))
}
