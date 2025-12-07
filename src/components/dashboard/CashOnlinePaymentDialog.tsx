import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { Banknote, Smartphone, User, Package } from "lucide-react";

interface TransactionSummary {
  id: string;
  customer_name: string;
  product_names: string[];
  amount: number;
  date: string;
  source: "transaction" | "collection" | "bank_check";
  payment_method?: string;
}

interface OnlinePaymentSummary {
  gcash: TransactionSummary[];
  bdo: TransactionSummary[];
  bpi: TransactionSummary[];
}

interface CashOnlinePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "cash" | "online";
  cashData: TransactionSummary[];
  onlineData: OnlinePaymentSummary;
  totalCash: number;
  totalOnline: { gcash: number; bdo: number; bpi: number };
  periodLabel: string;
}

export function CashOnlinePaymentDialog({
  open,
  onOpenChange,
  type,
  cashData,
  onlineData,
  totalCash,
  totalOnline,
  periodLabel,
}: CashOnlinePaymentDialogProps) {
  const isCash = type === "cash";

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

  const renderTransactionTable = (data: TransactionSummary[], colorClass: string) => (
    <div className="overflow-auto max-h-[400px]">
      {data.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No transactions found for this period
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
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isCash ? (
              <>
                <Banknote className="h-5 w-5 text-green-600" />
                Cash Received Summary - {periodLabel}
              </>
            ) : (
              <>
                <Smartphone className="h-5 w-5 text-blue-600" />
                Online Payment Summary - {periodLabel}
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {isCash ? (
          <>
            <Card className="bg-green-500/10 border-0">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Cash Received</span>
                  <span className="text-2xl font-bold text-green-600">
                    ₱{totalCash.toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>
            <div className="flex-1 overflow-auto">
              {renderTransactionTable(cashData, "text-green-600")}
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4">
              <Card className="bg-blue-500/10 border-0">
                <CardContent className="py-3">
                  <p className="text-xs text-muted-foreground">GCash</p>
                  <p className="text-lg font-bold text-blue-600">₱{totalOnline.gcash.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card className="bg-orange-500/10 border-0">
                <CardContent className="py-3">
                  <p className="text-xs text-muted-foreground">BDO</p>
                  <p className="text-lg font-bold text-orange-600">₱{totalOnline.bdo.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card className="bg-purple-500/10 border-0">
                <CardContent className="py-3">
                  <p className="text-xs text-muted-foreground">BPI</p>
                  <p className="text-lg font-bold text-purple-600">₱{totalOnline.bpi.toLocaleString()}</p>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="gcash" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="gcash">GCash ({onlineData.gcash.length})</TabsTrigger>
                <TabsTrigger value="bdo">BDO ({onlineData.bdo.length})</TabsTrigger>
                <TabsTrigger value="bpi">BPI ({onlineData.bpi.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="gcash" className="flex-1 overflow-auto mt-4">
                {renderTransactionTable(onlineData.gcash, "text-blue-600")}
              </TabsContent>
              <TabsContent value="bdo" className="flex-1 overflow-auto mt-4">
                {renderTransactionTable(onlineData.bdo, "text-orange-600")}
              </TabsContent>
              <TabsContent value="bpi" className="flex-1 overflow-auto mt-4">
                {renderTransactionTable(onlineData.bpi, "text-purple-600")}
              </TabsContent>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
