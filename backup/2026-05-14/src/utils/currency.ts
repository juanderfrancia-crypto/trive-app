/**
 * Utility functions for Colombian Peso (COP) formatting
 */

/**
 * Formats a number as Colombian Peso
 * @param amount - The amount to format
 * @param showSymbol - Whether to include the COP symbol (default: true)
 * @returns Formatted string with COP currency
 * @example
 * formatCOP(50000) → "COP 50.000"
 * formatCOP(50000, false) → "50.000"
 */
export const formatCOP = (amount: number, showSymbol: boolean = true): string => {
  const formatted = amount.toLocaleString('es-CO');
  return showSymbol ? `COP ${formatted}` : formatted;
};

/**
 * Formats price per seat with unit label
 * @param price - The price per seat
 * @returns Formatted string
 * @example
 * formatPricePerSeat(5500) → "COP 5.500 c/u"
 */
export const formatPricePerSeat = (price: number): string => {
  return `${formatCOP(price)} c/u`;
};

/**
 * Formats total price for multiple items
 * @param unitPrice - The price per unit
 * @param quantity - Number of units
 * @returns Formatted string
 * @example
 * formatTotalPrice(5500, 2) → "COP 11.000"
 */
export const formatTotalPrice = (unitPrice: number, quantity: number): string => {
  const total = unitPrice * quantity;
  return formatCOP(total);
};
