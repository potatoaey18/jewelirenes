import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface VendorSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  vendors: string[];
  placeholder?: string;
  className?: string;
  id?: string;
  required?: boolean;
}

export function VendorSearchInput({ 
  value, 
  onChange, 
  vendors, 
  placeholder = "Search or enter vendor...",
  className,
  id,
  required
}: VendorSearchInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredVendors, setFilteredVendors] = useState<string[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const filtered = vendors
        .filter(v => v.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 10);
      setFilteredVendors(filtered);
    } else {
      setFilteredVendors(vendors.slice(0, 10));
    }
  }, [value, vendors]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (vendor: string) => {
    onChange(vendor);
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className={cn("h-12 text-base", className)}
        required={required}
        autoComplete="off"
      />
      {isOpen && filteredVendors.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filteredVendors.map((vendor) => (
            <div
              key={vendor}
              className="px-4 py-3 text-base cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors"
              onClick={() => handleSelect(vendor)}
            >
              {vendor}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
