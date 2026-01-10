import * as React from "react";
import { cn } from "@/lib/utils";
import { formatCurrencyInput, formatCurrencyOnBlur, parseCurrency } from "@/lib/currency";

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string | number;
  onChange: (value: string, numericValue: number) => void;
  showPesoSign?: boolean;
  error?: string;
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onChange, showPesoSign = false, error, onBlur, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState('');
    const [isFocused, setIsFocused] = React.useState(false);

    // Initialize display value from prop
    React.useEffect(() => {
      if (!isFocused) {
        const numValue = typeof value === 'number' ? value : parseCurrency(String(value || ''));
        setDisplayValue(formatCurrencyOnBlur(String(numValue)));
      }
    }, [value, isFocused]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      
      // Remove peso sign if present
      const cleanedInput = inputValue.replace(/₱/g, '').trim();
      
      // Allow empty input
      if (cleanedInput === '') {
        setDisplayValue('');
        onChange('', 0);
        return;
      }
      
      const { display, raw } = formatCurrencyInput(cleanedInput);
      setDisplayValue(display);
      onChange(display, raw);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      // Select all text on focus for easy replacement
      e.target.select();
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      
      // Format properly on blur
      const formatted = formatCurrencyOnBlur(displayValue);
      setDisplayValue(formatted);
      onChange(formatted, parseCurrency(formatted));
      
      // Call original onBlur if provided
      onBlur?.(e);
    };

    const displayWithPrefix = showPesoSign && displayValue ? `₱${displayValue}` : displayValue;

    return (
      <div className="relative">
        {showPesoSign && (
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground pointer-events-none">
            ₱
          </span>
        )}
        <input
          type="text"
          inputMode="decimal"
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            showPesoSign && "pl-7",
            error && "border-destructive focus-visible:ring-destructive",
            className
          )}
          ref={ref}
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
        {error && (
          <p className="text-sm text-destructive mt-1">{error}</p>
        )}
      </div>
    );
  }
);
CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };
