// Utility functions for PDF export to ensure proper formatting

/**
 * Formats a number as a currency string safe for PDF export
 * Uses ASCII-compatible characters instead of locale-specific formatting
 */
export const formatCurrencyForPDF = (amount: number | string): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return 'Php 0.00';
  
  // Format with 2 decimal places and use simple comma separators
  const formatted = num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `Php ${formatted}`;
};

/**
 * Formats a number with commas for PDF export
 */
export const formatNumberForPDF = (num: number | string): string => {
  const value = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(value)) return '0';
  return value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};
