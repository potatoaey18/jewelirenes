import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileImage } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface TransactionDetailDialogProps {
  transaction: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TransactionDetailDialog = ({ transaction, open, onOpenChange }: TransactionDetailDialogProps) => {
  const [collections, setCollections] = useState<any[]>([]);
  const [paymentPlan, setPaymentPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && transaction) {
      fetchTransactionDetails();
    }
  }, [open, transaction]);

  const fetchTransactionDetails = async () => {
    try {
      setLoading(true);
      
      const { data: planData } = await supabase
        .from("payment_plans")
        .select("*")
        .eq("transaction_id", transaction.id)
        .maybeSingle();

      setPaymentPlan(planData);

      if (planData) {
        const { data: collectionsData } = await supabase
          .from("collections")
          .select("*")
          .eq("payment_plan_id", planData.id)
          .order("payment_date", { ascending: false });

        setCollections(collectionsData || []);
      } else {
        setCollections([]);
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportImage = async () => {
    if (!contentRef.current) return;

    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
      });

      const url = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = url;
      link.download = `transaction-${transaction.id}-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Image exported successfully");
    } catch (error) {
      toast.error("Failed to export image");
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Transaction Details", 14, 20);
    
    doc.setFontSize(12);
    doc.text(`Date: ${format(new Date(transaction.created_at), "PPP")}`, 14, 30);
    doc.text(`Total Amount: Php ${transaction.total_amount}`, 14, 38);
    doc.text(`Type: ${transaction.transaction_type}`, 14, 46);
    doc.text(`Payment: ${transaction.payment_type || "N/A"}`, 14, 54);

    if (transaction.transaction_items && transaction.transaction_items.length > 0) {
      autoTable(doc, {
        startY: 62,
        head: [["Item", "Qty", "Unit Price", "Subtotal"]],
        body: transaction.transaction_items.map((item: any) => [
          item.product_name,
          item.quantity,
          `Php ${item.unit_price}`,
          `Php ${item.subtotal}`,
        ]),
      });
    }

    if (paymentPlan) {
      const finalY = (doc as any).lastAutoTable?.finalY || 70;
      doc.text("Payment Plan", 14, finalY + 10);
      autoTable(doc, {
        startY: finalY + 15,
        head: [["Total", "Paid", "Balance", "Status"]],
        body: [[
          `Php ${paymentPlan.total_amount}`,
          `Php ${paymentPlan.amount_paid}`,
          `Php ${paymentPlan.balance}`,
          paymentPlan.status,
        ]],
      });
    }

    if (collections.length > 0) {
      const finalY = (doc as any).lastAutoTable?.finalY || 80;
      doc.text("Collections History", 14, finalY + 10);
      autoTable(doc, {
        startY: finalY + 15,
        head: [["Date", "Amount", "Method", "Notes"]],
        body: collections.map((col: any) => [
          format(new Date(col.payment_date), "PP"),
          `Php ${col.amount_paid}`,
          col.payment_method || "N/A",
          col.notes || "",
        ]),
      });
    }

    doc.save(`transaction-${transaction.id}.pdf`);
    toast.success("PDF exported successfully");
  };

  if (!transaction) return null;

  const totalPaid = paymentPlan?.amount_paid || transaction.total_amount;
  const balance = paymentPlan?.balance || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Transaction Details</DialogTitle>
        </DialogHeader>

        <div ref={contentRef} className="space-y-6 p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Date</p>
              <p className="font-medium">{format(new Date(transaction.created_at), "PPP")}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-2xl font-bold text-accent">Php {transaction.total_amount}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Type</p>
              <Badge>{transaction.transaction_type}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Payment Type</p>
              <p className="font-medium">{transaction.payment_type || "N/A"}</p>
            </div>
          </div>

          {transaction.notes && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Notes</p>
              <p className="text-sm">{transaction.notes}</p>
            </div>
          )}

          {transaction.transaction_items && transaction.transaction_items.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3">Items Purchased</h4>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-3 text-sm">Item</th>
                      <th className="text-right p-3 text-sm">Qty</th>
                      <th className="text-right p-3 text-sm">Unit Price</th>
                      <th className="text-right p-3 text-sm">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transaction.transaction_items.map((item: any) => (
                      <tr key={item.id} className="border-t">
                        <td className="p-3">{item.product_name}</td>
                        <td className="text-right p-3">{item.quantity}</td>
                        <td className="text-right p-3">Php {item.unit_price}</td>
                        <td className="text-right p-3 font-medium">Php {item.subtotal}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {paymentPlan && (
            <div>
              <h4 className="font-semibold mb-3">Payment Summary</h4>
              <div className="grid grid-cols-3 gap-4 p-4 border rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-lg font-bold">Php {paymentPlan.total_amount}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Amount Paid</p>
                  <p className="text-lg font-bold text-green-600">Php {totalPaid}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Balance</p>
                  <p className="text-lg font-bold text-red-600">Php {balance}</p>
                </div>
              </div>
            </div>
          )}

          {collections.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3">Collections History</h4>
              <div className="space-y-2">
                {collections.map((collection) => (
                  <div key={collection.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium">{format(new Date(collection.payment_date), "PPP")}</p>
                        <p className="text-sm text-muted-foreground">{collection.payment_method || "N/A"}</p>
                      </div>
                      <p className="text-lg font-bold text-green-600">Php {collection.amount_paid}</p>
                    </div>
                    {collection.notes && (
                      <p className="text-sm text-muted-foreground">{collection.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && !paymentPlan && collections.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              <p>This transaction was paid in full at checkout.</p>
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end pt-4 border-t">
          <Button onClick={handleExportImage} variant="outline">
            <FileImage className="mr-2 h-4 w-4" />
            Export Image
          </Button>
          <Button onClick={handleExportPDF}>
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
