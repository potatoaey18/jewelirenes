import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Banknote, CreditCard, User, Package } from "lucide-react";

interface TransactionSummary {
  id: string;
  customer_name: string;
  product_names: string[];
  amount: number;
  date: string;
  source: "transaction" | "collection" | "bank_check";
}

interface CashCheckSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "cash" | "check";
  data: TransactionSummary[];
  totalAmount: number;
  periodLabel: string;
}

export function CashCheckSummaryDialog({
  open,
  onOpenChange,
  type,
  data,
  totalAmount,
  periodLabel,
}: CashCheckSummaryDialogProps) {
  const isCash = type === "cash";
  const Icon = isCash ? Banknote : CreditCard;
  const colorClass = isCash ? "text-green-600" : "text-blue-600";
  const bgClass = isCash ? "bg-green-500/10" : "bg-blue-500/10";

  const getSourceLabel = (source: string) => {
    switch (source) {
      case "transaction":
        return "Sale";
      case "collection":
        return "Collection";
      case "bank_check":
        return "Bank Check";
      default:
        return source;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${colorClass}`} />
            {isCash ? "Cash" : "Check"} Received Summary - {periodLabel}
          </DialogTitle>
        </DialogHeader>

        <Card className={`${bgClass} border-0`}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total {isCash ? "Cash" : "Check"} Received</span>
              <span className={`text-2xl font-bold ${colorClass}`}>
                ₱{totalAmount.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="flex-1 overflow-auto">
          {data.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No {isCash ? "cash" : "check"} transactions found for this period
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Product(s)</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item) => (
                  <TableRow key={`${item.source}-${item.id}`}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(item.date), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {item.customer_name || "N/A"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 max-w-[200px]">
                        <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="truncate" title={item.product_names.join(", ")}>
                          {item.product_names.length > 0 
                            ? item.product_names.slice(0, 2).join(", ") + (item.product_names.length > 2 ? ` +${item.product_names.length - 2} more` : "")
                            : "—"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {getSourceLabel(item.source)}
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-right font-medium ${colorClass}`}>
                      ₱{item.amount.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
