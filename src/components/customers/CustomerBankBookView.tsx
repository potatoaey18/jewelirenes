import { Badge } from '@/components/ui/badge';
import { ChevronRight } from 'lucide-react';
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
}

interface CustomerBankBookViewProps {
  checks: BankCheck[];
  onCheckClick: (check: BankCheck) => void;
}

export function CustomerBankBookView({ checks, onCheckClick }: CustomerBankBookViewProps) {
  // Sort by date received and calculate running balance
  const sortedChecks = [...checks].sort((a, b) => 
    new Date(a.date_received).getTime() - new Date(b.date_received).getTime()
  );

  let runningBalance = 0;
  const checksWithBalance = sortedChecks.map(check => {
    runningBalance += Number(check.amount);
    return { ...check, runningBalance };
  });

  const totalAmount = checks.reduce((sum, c) => sum + Number(c.amount), 0);
  const encashedAmount = checks
    .filter(c => c.status === 'Encashed')
    .reduce((sum, c) => sum + Number(c.amount), 0);
  const pendingAmount = totalAmount - encashedAmount;

  if (checks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No bank checks found
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-muted/30 rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Checks</p>
          <p className="text-xl font-bold text-primary">₱{totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-green-500/10 rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Encashed</p>
          <p className="text-xl font-bold text-green-600">₱{encashedAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-amber-500/10 rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Pending</p>
          <p className="text-xl font-bold text-amber-600">₱{pendingAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* Bank Book Ledger */}
      <div className="border rounded-lg overflow-hidden bg-card">
        {/* Header */}
        <div className="bg-muted/50 px-3 py-2 border-b grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <div className="col-span-2">Date</div>
          <div className="col-span-3">Bank Info</div>
          <div className="col-span-2">Reference</div>
          <div className="col-span-2 text-right">Amount</div>
          <div className="col-span-2 text-right">Balance</div>
          <div className="col-span-1"></div>
        </div>

        {/* Entries */}
        {checksWithBalance.map((check, idx) => (
          <div
            key={check.id}
            onClick={() => onCheckClick(check)}
            className={`px-3 py-3 grid grid-cols-12 gap-2 items-center cursor-pointer hover:bg-muted/30 transition-colors text-sm ${
              idx % 2 === 0 ? 'bg-background' : 'bg-muted/10'
            }`}
          >
            <div className="col-span-2">
              <p className="font-medium text-xs">{format(new Date(check.date_received), 'MMM dd')}</p>
              <p className="text-xs text-muted-foreground">{format(new Date(check.date_received), 'yyyy')}</p>
            </div>
            <div className="col-span-3">
              <p className="font-medium text-sm truncate">{check.bank}</p>
              <p className="text-xs text-muted-foreground truncate">{check.branch}</p>
            </div>
            <div className="col-span-2">
              <p className="font-mono text-xs">#{check.check_number}</p>
              <p className="text-xs text-muted-foreground truncate">Inv: {check.invoice_number}</p>
            </div>
            <div className="col-span-2 text-right">
              <p className="font-medium">₱{Number(check.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
              <Badge 
                variant={check.status === 'Encashed' ? 'default' : 'secondary'} 
                className="text-xs mt-1"
              >
                {check.status}
              </Badge>
            </div>
            <div className="col-span-2 text-right font-semibold text-primary">
              ₱{check.runningBalance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </div>
            <div className="col-span-1 flex justify-end">
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
