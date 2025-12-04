import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

interface BankCheck {
  id: string;
  bank: string;
  branch: string;
  check_number: string;
  invoice_number: string;
  amount: number;
  check_date: string;
  date_received: string;
  expiry_date: string | null;
  status: string;
  customers?: { name: string };
  customer_id?: string;
}

interface BankCheckBookViewProps {
  checks: BankCheck[];
  customers?: { id: string; name: string }[];
  showCustomerFilter?: boolean;
  onCheckClick: (check: BankCheck) => void;
}

export function BankCheckBookView({ 
  checks, 
  customers = [], 
  showCustomerFilter = true,
  onCheckClick 
}: BankCheckBookViewProps) {
  const [selectedCustomer, setSelectedCustomer] = useState<string>('all');
  const [search, setSearch] = useState('');

  const filteredChecks = checks.filter(check => {
    const matchesCustomer = selectedCustomer === 'all' || check.customer_id === selectedCustomer;
    const matchesSearch = 
      check.bank?.toLowerCase().includes(search.toLowerCase()) ||
      check.check_number?.toLowerCase().includes(search.toLowerCase()) ||
      check.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
      check.customers?.name?.toLowerCase().includes(search.toLowerCase());
    return matchesCustomer && matchesSearch;
  });

  // Group checks by customer for bank book style
  const groupedByCustomer = filteredChecks.reduce((acc, check) => {
    const customerName = check.customers?.name || 'Unknown';
    if (!acc[customerName]) {
      acc[customerName] = [];
    }
    acc[customerName].push(check);
    return acc;
  }, {} as Record<string, BankCheck[]>);

  // Calculate running balance per customer
  const calculateRunningBalance = (customerChecks: BankCheck[]) => {
    let balance = 0;
    return customerChecks.map(check => {
      balance += Number(check.amount);
      return { ...check, runningBalance: balance };
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by bank, check number, or invoice..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        {showCustomerFilter && customers.length > 0 && (
          <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter by customer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Customers</SelectItem>
              {customers.map((customer) => (
                <SelectItem key={customer.id} value={customer.id}>
                  {customer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Bank Book Style View */}
      <div className="border rounded-lg overflow-hidden bg-card">
        {/* Header Row */}
        <div className="bg-muted/50 px-4 py-3 border-b grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <div className="col-span-2">Date</div>
          <div className="col-span-3">Bank / Branch</div>
          <div className="col-span-2">Check #</div>
          <div className="col-span-2 text-right">Amount</div>
          <div className="col-span-2 text-right">Balance</div>
          <div className="col-span-1 text-center">Status</div>
        </div>

        {Object.entries(groupedByCustomer).length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No bank checks found
          </div>
        ) : (
          Object.entries(groupedByCustomer).map(([customerName, customerChecks]) => {
            const checksWithBalance = calculateRunningBalance(
              customerChecks.sort((a, b) => 
                new Date(a.date_received).getTime() - new Date(b.date_received).getTime()
              )
            );
            
            return (
              <div key={customerName} className="border-b last:border-b-0">
                {/* Customer Header */}
                <div className="bg-primary/5 px-4 py-2 border-b">
                  <span className="font-semibold text-sm">{customerName}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({customerChecks.length} check{customerChecks.length !== 1 ? 's' : ''})
                  </span>
                </div>
                
                {/* Check Entries */}
                {checksWithBalance.map((check, idx) => (
                  <div
                    key={check.id}
                    onClick={() => onCheckClick(check)}
                    className={`px-4 py-3 grid grid-cols-12 gap-2 items-center cursor-pointer hover:bg-muted/30 transition-colors text-sm ${
                      idx % 2 === 0 ? 'bg-background' : 'bg-muted/10'
                    }`}
                  >
                    <div className="col-span-2 text-muted-foreground">
                      {format(new Date(check.date_received), 'MMM dd, yyyy')}
                    </div>
                    <div className="col-span-3">
                      <p className="font-medium truncate">{check.bank}</p>
                      <p className="text-xs text-muted-foreground truncate">{check.branch}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="font-mono text-xs">{check.check_number}</p>
                      <p className="text-xs text-muted-foreground">Inv: {check.invoice_number}</p>
                    </div>
                    <div className="col-span-2 text-right font-medium">
                      ₱{Number(check.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="col-span-2 text-right font-semibold text-primary">
                      ₱{check.runningBalance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="col-span-1 flex items-center justify-center gap-1">
                      <Badge 
                        variant={check.status === 'Encashed' ? 'default' : 'secondary'} 
                        className="text-xs"
                      >
                        {check.status === 'Encashed' ? '✓' : '○'}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
                
                {/* Customer Total */}
                <div className="bg-muted/30 px-4 py-2 grid grid-cols-12 gap-2 text-sm border-t">
                  <div className="col-span-7 text-right text-muted-foreground font-medium">
                    Total for {customerName}:
                  </div>
                  <div className="col-span-2 text-right font-bold text-accent">
                    ₱{customerChecks.reduce((sum, c) => sum + Number(c.amount), 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="col-span-3"></div>
                </div>
              </div>
            );
          })
        )}

        {/* Grand Total */}
        {filteredChecks.length > 0 && (
          <div className="bg-primary/10 px-4 py-3 grid grid-cols-12 gap-2 text-sm border-t-2 border-primary/20">
            <div className="col-span-7 text-right font-semibold">
              Grand Total:
            </div>
            <div className="col-span-2 text-right font-bold text-lg text-primary">
              ₱{filteredChecks.reduce((sum, c) => sum + Number(c.amount), 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </div>
            <div className="col-span-3"></div>
          </div>
        )}
      </div>
    </div>
  );
}
