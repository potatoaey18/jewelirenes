import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileImage, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrencyForPDF } from "@/lib/pdfUtils";
import { useAuth } from "@/hooks/useAuth";

interface TransactionDetailDialogProps {
  transaction: any;
  customer?: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TransactionDetailDialog = ({ transaction, customer, open, onOpenChange }: TransactionDetailDialogProps) => {
  const { user } = useAuth();
  const [collections, setCollections] = useState<any[]>([]);
  const [paymentPlan, setPaymentPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [addingPayment, setAddingPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount_paid: "",
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: "",
    notes: ""
  });
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && transaction) {
      fetchTransactionDetails();
      resetPaymentForm();
    }
  }, [open, transaction]);

  const resetPaymentForm = () => {
    setPaymentForm({
      amount_paid: "",
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: "",
      notes: ""
    });
    setShowAddPayment(false);
  };

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

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentPlan || !user) return;

    const amount = parseFloat(paymentForm.amount_paid);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (amount > paymentPlan.balance) {
      toast.error(`Amount exceeds balance of ₱${paymentPlan.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
      return;
    }

    setAddingPayment(true);
    try {
      // Insert collection
      const { error: collectionError } = await supabase
        .from("collections")
        .insert({
          payment_plan_id: paymentPlan.id,
          amount_paid: amount,
          payment_date: paymentForm.payment_date,
          payment_method: paymentForm.payment_method || null,
          notes: paymentForm.notes || null,
          created_by: user.id
        });

      if (collectionError) throw collectionError;

      // Update payment plan
      const newAmountPaid = paymentPlan.amount_paid + amount;
      const newBalance = paymentPlan.balance - amount;
      const newStatus = newBalance <= 0 ? "completed" : "active";

      const { error: updateError } = await supabase
        .from("payment_plans")
        .update({
          amount_paid: newAmountPaid,
          balance: newBalance,
          status: newStatus
        })
        .eq("id", paymentPlan.id);

      if (updateError) throw updateError;

      toast.success("Payment added successfully");
      resetPaymentForm();
      fetchTransactionDetails();
    } catch (error: any) {
      toast.error(error.message || "Failed to add payment");
    } finally {
      setAddingPayment(false);
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
    
    let yPos = 30;
    
    if (customer) {
      doc.setFontSize(14);
      doc.text("Customer Information", 14, yPos);
      yPos += 8;
      doc.setFontSize(11);
      doc.text(`Name: ${customer.name}`, 14, yPos);
      yPos += 6;
      if (customer.phone) {
        doc.text(`Phone: ${customer.phone}`, 14, yPos);
        yPos += 6;
      }
      if (customer.email) {
        doc.text(`Email: ${customer.email}`, 14, yPos);
        yPos += 6;
      }
      if (customer.address) {
        doc.text(`Address: ${customer.address}`, 14, yPos);
        yPos += 6;
      }
      yPos += 4;
    }
    
    doc.setFontSize(12);
    doc.text(`Date: ${format(new Date(transaction.created_at), "PPP")}`, 14, yPos);
    yPos += 8;
    doc.text(`Total Amount: ${formatCurrencyForPDF(transaction.total_amount)}`, 14, yPos);
    yPos += 8;
    doc.text(`Type: ${transaction.transaction_type}`, 14, yPos);
    yPos += 8;
    doc.text(`Payment: ${transaction.payment_type || "N/A"}`, 14, yPos);
    yPos += 8;

    if (transaction.transaction_items && transaction.transaction_items.length > 0) {
      autoTable(doc, {
        startY: yPos,
        head: [["Item", "Qty", "Unit Price", "Subtotal"]],
        body: transaction.transaction_items.map((item: any) => [
          item.product_name,
          item.quantity,
          formatCurrencyForPDF(item.unit_price),
          formatCurrencyForPDF(item.subtotal),
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
          formatCurrencyForPDF(paymentPlan.total_amount),
          formatCurrencyForPDF(paymentPlan.amount_paid),
          formatCurrencyForPDF(paymentPlan.balance),
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
          formatCurrencyForPDF(col.amount_paid),
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
          {customer && (
            <div className="border-b pb-4">
              <h4 className="font-semibold mb-3">Customer Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{customer.name}</p>
                </div>
                {customer.phone && (
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{customer.phone}</p>
                  </div>
                )}
                {customer.email && (
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{customer.email}</p>
                  </div>
                )}
                {customer.address && (
                  <div>
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-medium">{customer.address}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Date</p>
              <p className="font-medium">{format(new Date(transaction.created_at), "PPP")}</p>
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

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 border rounded-lg bg-muted/30">
            <div>
              <p className="text-sm text-muted-foreground">Subtotal</p>
              <p className="font-bold">₱{((transaction.total_amount || 0) + (transaction.discount || 0) - (transaction.tax || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            {transaction.discount > 0 && (
              <div>
                <p className="text-sm text-muted-foreground">Discount</p>
                <p className="font-bold text-green-600">-₱{Number(transaction.discount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            )}
            {transaction.tax > 0 && (
              <div>
                <p className="text-sm text-muted-foreground">Tax</p>
                <p className="font-bold">+₱{Number(transaction.tax).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-xl font-bold text-accent">₱{Number(transaction.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
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
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold">Payment Summary</h4>
                {paymentPlan.balance > 0 && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setShowAddPayment(!showAddPayment)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Payment
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-4 p-4 border rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-lg font-bold">₱{paymentPlan.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Amount Paid</p>
                  <p className="text-lg font-bold text-green-600">₱{totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Balance</p>
                  <p className="text-lg font-bold text-red-600">₱{balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
              </div>

              {showAddPayment && (
                <form onSubmit={handleAddPayment} className="mt-4 p-4 border rounded-lg bg-muted/50 space-y-4">
                  <h5 className="font-medium">Add Payment Collection</h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Amount (₱)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder={`Max: ${paymentPlan.balance.toLocaleString()}`}
                        value={paymentForm.amount_paid}
                        onChange={(e) => setPaymentForm({ ...paymentForm, amount_paid: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label>Payment Date</Label>
                      <Input
                        type="date"
                        value={paymentForm.payment_date}
                        onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label>Payment Method</Label>
                      <Select
                        value={paymentForm.payment_method}
                        onValueChange={(value) => setPaymentForm({ ...paymentForm, payment_method: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Cash">Cash</SelectItem>
                          <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                          <SelectItem value="GCash">GCash</SelectItem>
                          <SelectItem value="Check">Check</SelectItem>
                          <SelectItem value="Credit Card">Credit Card</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Notes (Optional)</Label>
                      <Input
                        placeholder="Payment notes..."
                        value={paymentForm.notes}
                        onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={() => setShowAddPayment(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={addingPayment}>
                      {addingPayment ? "Adding..." : "Add Payment"}
                    </Button>
                  </div>
                </form>
              )}
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
                      <p className="text-lg font-bold text-green-600">₱{Number(collection.amount_paid).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
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
