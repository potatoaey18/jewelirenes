import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatPeso } from '@/lib/currency';

interface CheckDetailDialogProps {
  check: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CheckDetailDialog({ check, open, onOpenChange }: CheckDetailDialogProps) {
  if (!check) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">Check Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Amount and Date */}
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-muted-foreground">Amount</p>
              <p className="text-3xl font-bold">{formatPeso(check.amount)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Date Received</p>
              <p className="text-lg font-medium">{new Date(check.date_received).toLocaleDateString()}</p>
            </div>
          </div>

          <Separator />

          {/* Vendor Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <p className="text-sm text-muted-foreground">Vendor</p>
              <p className="text-lg font-semibold">{check.vendor}</p>
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
            <div>
              <p className="text-sm text-muted-foreground">Payment Method</p>
              <Badge variant="outline" className="mt-1">Check</Badge>
            </div>
          </div>

          <Separator />

          {/* Check Details */}
          <div>
            <p className="text-sm font-semibold text-muted-foreground mb-3">Check Information</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Bank</p>
                <p className="text-base font-medium">{check.bank}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Branch</p>
                <p className="text-base font-medium">{check.branch}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Check Number</p>
                <p className="text-base font-medium">{check.check_number}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Check Date</p>
                <p className="text-base font-medium">{new Date(check.check_date).toLocaleDateString()}</p>
              </div>
              {check.invoice_number && (
                <div>
                  <p className="text-sm text-muted-foreground">Invoice Number</p>
                  <p className="text-base font-medium">{check.invoice_number}</p>
                </div>
              )}
              {check.expiry_date && (
                <div>
                  <p className="text-sm text-muted-foreground">Expiry Date</p>
                  <p className="text-base font-medium">{new Date(check.expiry_date).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {check.notes && (
            <>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground">Notes</p>
                <p className="text-base mt-1">{check.notes}</p>
              </div>
            </>
          )}

          {/* Created Date */}
          {check.created_at && (
            <div className="text-xs text-muted-foreground pt-2">
              Created: {new Date(check.created_at).toLocaleString()}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
