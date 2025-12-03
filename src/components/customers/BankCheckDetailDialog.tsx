import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface BankCheckDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  check: any;
}

export function BankCheckDetailDialog({ open, onOpenChange, check }: BankCheckDetailDialogProps) {
  if (!check) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Bank Check Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Bank</p>
              <p className="font-medium">{check.bank}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Branch</p>
              <p className="font-medium">{check.branch}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Check Number</p>
              <p className="font-medium">{check.check_number}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Invoice Number</p>
              <p className="font-medium">{check.invoice_number}</p>
            </div>
          </div>
          
          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground">Amount</p>
            <p className="text-2xl font-bold text-accent">₱{Number(check.amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Check Date</p>
              <p className="font-medium">{format(new Date(check.check_date), "PPP")}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Date Received</p>
              <p className="font-medium">{format(new Date(check.date_received), "PPP")}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Expiry Date</p>
              <p className="font-medium">
                {check.expiry_date ? format(new Date(check.expiry_date), "PPP") : "Not Set"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge 
                variant={check.status === 'Encashed' ? 'default' : 'secondary'} 
                className="mt-1"
              >
                {check.status}
              </Badge>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
