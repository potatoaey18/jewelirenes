import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface TransactionHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: any;
  transactions: any[];
}

export const TransactionHistoryDialog = ({
  open,
  onOpenChange,
  product,
  transactions,
}: TransactionHistoryDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Transaction History - {product?.name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          {transactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-lg">No transactions found for this product</p>
          ) : (
            transactions.map((item) => (
              <div key={item.id} className="border rounded-lg p-4 sm:p-6 space-y-3 hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <p className="font-bold text-lg">{item.transactions?.customers?.name || "Unknown Customer"}</p>
                      <Badge className="text-sm">{item.transactions?.transaction_type}</Badge>
                    </div>
                    <p className="text-muted-foreground text-base">
                      {format(new Date(item.transactions?.created_at), "PPP 'at' p")}
                    </p>
                  </div>
                  <div className="text-left sm:text-right space-y-1">
                    <p className="text-muted-foreground text-sm">Transaction Total</p>
                    <p className="text-2xl font-bold text-accent">
                      Php {parseFloat(item.transactions?.total_amount || "0").toLocaleString()}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-border">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Quantity Sold</p>
                    <p className="text-lg font-semibold">{item.quantity} units</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Unit Price</p>
                    <p className="text-lg font-semibold">Php {parseFloat(item.unit_price).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Subtotal</p>
                    <p className="text-lg font-semibold text-accent">Php {parseFloat(item.subtotal).toLocaleString()}</p>
                  </div>
                </div>

                {item.transactions?.payment_type && (
                  <div className="pt-2">
                    <p className="text-sm text-muted-foreground">Payment Method: <span className="font-medium text-foreground">{item.transactions.payment_type}</span></p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
