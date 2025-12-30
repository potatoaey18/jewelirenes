// Currency formatting utilities
// Format: 1,000,000.00 (comma-separated thousands, exactly 2 decimal places)

/**
 * Formats a number as a currency string with comma separators and 2 decimal places
 * @param amount - The number or string to format
 * @returns Formatted string (e.g., "1,000,000.00")
 */
export const formatCurrency = (amount: number | string | null | undefined): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (num === null || num === undefined || isNaN(num)) return '0.00';
  
  return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

/**
 * Formats a number with peso sign prefix
 * @param amount - The number or string to format
 * @returns Formatted string with peso sign (e.g., "₱1,000,000.00")
 */
export const formatPeso = (amount: number | string | null | undefined): string => {
  return `₱${formatCurrency(amount)}`;
};

/**
 * Parses a formatted currency string back to a number
 * @param value - The formatted string (e.g., "1,000,000.00" or "₱1,000,000.00")
 * @returns The numeric value
 */
export const parseCurrency = (value: string): number => {
  // Remove peso sign, commas, and any other non-numeric characters except decimal point and minus
  const cleaned = value.replace(/[₱,\s]/g, '').replace(/[^0-9.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

/**
 * Formats an input value while typing - allows incomplete input
 * @param value - The current input value
 * @returns Object with formatted display value and raw numeric value
 */
export const formatCurrencyInput = (value: string): { display: string; raw: number } => {
  // Remove any existing commas
  const withoutCommas = value.replace(/,/g, '');
  
  // Allow only digits and one decimal point
  const cleaned = withoutCommas.replace(/[^0-9.]/g, '');
  
  // Handle multiple decimal points - keep only the first one
  const parts = cleaned.split('.');
  let normalized = parts[0];
  if (parts.length > 1) {
    // Limit to 2 decimal places
    normalized += '.' + parts[1].slice(0, 2);
  }
  
  // Parse the numeric value
  const numericValue = parseFloat(normalized) || 0;
  
  // Format with commas (but preserve incomplete decimals for typing)
  const integerPart = parts[0] || '0';
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  let display = formattedInteger;
  if (parts.length > 1) {
    display += '.' + parts[1].slice(0, 2);
  }
  
  return { display, raw: numericValue };
};

/**
 * Formats a value on blur to ensure proper format with 2 decimal places
 * @param value - The current input value
 * @returns Properly formatted currency string
 */
export const formatCurrencyOnBlur = (value: string): string => {
  const numericValue = parseCurrency(value);
  return formatCurrency(numericValue);
};

/**
 * Validates if a string represents a valid currency amount
 * @param value - The string to validate
 * @returns True if valid currency format
 */
export const isValidCurrencyFormat = (value: string): boolean => {
  if (!value || value.trim() === '') return false;
  
  // Remove commas for validation
  const withoutCommas = value.replace(/,/g, '');
  
  // Should match pattern: digits with optional decimal and exactly 2 decimal places
  const pattern = /^\d+(\.\d{2})?$/;
  return pattern.test(withoutCommas);
};

/**
 * Validates and returns error message if invalid
 * @param value - The string to validate
 * @returns Error message or null if valid
 */
export const validateCurrency = (value: string): string | null => {
  if (!value || value.trim() === '') {
    return 'Amount is required';
  }
  
  const numericValue = parseCurrency(value);
  
  if (numericValue < 0) {
    return 'Amount cannot be negative';
  }
  
  return null;
};
