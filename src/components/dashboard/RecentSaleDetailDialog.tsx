import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { formatPeso } from '@/lib/currency';

interface RecentSaleDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: any;
}

export function RecentSaleDetailDialog({ open, onOpenChange, sale }: RecentSaleDetailDialogProps) {
  if (!sale) return null;

  const productNames = sale.transaction_items?.map((item: any) => item.product_name) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Transaction Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Customer</p>
              <p className="font-medium">{sale.customers?.name || 'Walk-in'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Date & Time</p>
              <p className="font-medium">{format(new Date(sale.created_at), "PPp")}</p>
            </div>
          </div>
          
          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground mb-2">Items</p>
            <div className="space-y-2">
              {sale.transaction_items?.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center bg-muted/50 px-3 py-2 rounded-md">
                  <div>
                    <p className="font-medium text-sm">{item.product_name}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="border-t pt-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">Payment Method</p>
              <Badge variant="outline">{sale.payment_type || 'Cash'}</Badge>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between items-center">
              <p className="text-lg font-semibold">Total</p>
              <p className="text-2xl font-bold text-accent">{formatPeso(sale.total_amount)}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
