import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, Receipt, Calendar, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Navigation from "@/components/Navigation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { formatPeso } from "@/lib/currency";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrencyForPDF } from "@/lib/pdfUtils";
import { useIsMobile } from "@/hooks/use-mobile";

const VendorDetail = () => {
  const { vendorName } = useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [bankChecks, setBankChecks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const decodedVendorName = decodeURIComponent(vendorName || "");

  useEffect(() => {
    fetchVendorData();
  }, [vendorName]);

  const fetchVendorData = async () => {
    try {
      setLoading(true);
      
      // Fetch expenses for this vendor
      const { data: expenseData, error: expenseError } = await supabase
        .from("expenses")
        .select("*")
        .eq("vendor", decodedVendorName)
        .order("expense_date", { ascending: false });

      if (expenseError) throw expenseError;
      setExpenses(expenseData || []);

      // Fetch bank checks for this vendor
      const { data: checksData, error: checksError } = await supabase
        .from("expense_bank_checks")
        .select("*")
        .eq("vendor", decodedVendorName)
        .order("date_received", { ascending: false });

      if (checksError) throw checksError;
      setBankChecks(checksData || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalChecks = bankChecks.reduce((sum, c) => sum + Number(c.amount), 0);
  const categories = [...new Set(expenses.map(e => e.category).filter(Boolean))];
  const lastPayment = expenses.length > 0 ? expenses[0].expense_date : null;

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text(`Vendor: ${decodedVendorName}`, 14, 20);
    
    doc.setFontSize(12);
    doc.text(`Total Expenses: ${formatCurrencyForPDF(totalExpenses)}`, 14, 32);
    doc.text(`Total Bank Checks: ${formatCurrencyForPDF(totalChecks)}`, 14, 40);
    doc.text(`Categories: ${categories.join(", ") || "N/A"}`, 14, 48);
    
    // Expenses table
    doc.setFontSize(14);
    doc.text("Expense Transactions", 14, 62);
    
    autoTable(doc, {
      startY: 68,
      head: [["Date", "Category", "Description", "Payment Method", "Amount"]],
      body: expenses.map(e => [
        format(new Date(e.expense_date), "PP"),
        e.category || "-",
        e.description || "-",
        e.payment_method || "-",
        formatCurrencyForPDF(e.amount),
      ]),
      styles: { fontSize: 9 },
    });

    // Bank checks table if any
    if (bankChecks.length > 0) {
      const finalY = (doc as any).lastAutoTable?.finalY || 70;
      doc.setFontSize(14);
      doc.text("Bank Checks", 14, finalY + 15);
      
      autoTable(doc, {
        startY: finalY + 20,
        head: [["Date", "Bank", "Check #", "Status", "Amount"]],
        body: bankChecks.map(c => [
          format(new Date(c.date_received), "PP"),
          c.bank || "-",
          c.check_number || "-",
          c.status || "-",
          formatCurrencyForPDF(c.amount),
        ]),
        styles: { fontSize: 9 },
      });
    }
    
    doc.save(`${decodedVendorName}-transactions.pdf`);
    toast.success("PDF exported successfully");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30">
      <Navigation />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        <Button
          variant="ghost"
          onClick={() => navigate("/expenses")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Expenses
        </Button>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">{decodedVendorName}</h1>
              <p className="text-sm text-muted-foreground">Vendor Transactions</p>
            </div>
          </div>
          <Button onClick={handleExportPDF} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <Receipt className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Expenses</p>
                  <p className="text-2xl font-bold">{formatPeso(totalExpenses)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Bank Checks</p>
                  <p className="text-2xl font-bold">{formatPeso(totalChecks)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary rounded-lg">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Transactions</p>
                  <p className="text-2xl font-bold">{expenses.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Calendar className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last Payment</p>
                  <p className="text-lg font-bold">
                    {lastPayment ? format(new Date(lastPayment), "PP") : "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Categories */}
        {categories.length > 0 && (
          <div className="mb-6">
            <p className="text-sm text-muted-foreground mb-2">Categories</p>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <Badge key={cat} variant="secondary">{cat}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Expenses Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Expense Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {expenses.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No expenses found</p>
            ) : isMobile ? (
              <div className="space-y-3">
                {expenses.map((expense) => (
                  <Card key={expense.id} className="overflow-hidden border-border/50">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(expense.expense_date), "PP")}
                          </p>
                          <Badge variant="outline" className="mt-1">{expense.category}</Badge>
                        </div>
                        <p className="text-lg font-bold text-accent">
                          {formatPeso(expense.amount)}
                        </p>
                      </div>
                      {expense.description && (
                        <p className="text-sm text-muted-foreground">{expense.description}</p>
                      )}
                      <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
                        <span>{expense.payment_method || "N/A"}</span>
                        {expense.notes && <span className="truncate max-w-[150px]">{expense.notes}</span>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(expense.expense_date), "PP")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{expense.category}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {expense.description || "-"}
                        </TableCell>
                        <TableCell>{expense.payment_method || "-"}</TableCell>
                        <TableCell className="max-w-[150px] truncate">
                          {expense.notes || "-"}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatPeso(expense.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bank Checks Section */}
        {bankChecks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Bank Checks</CardTitle>
            </CardHeader>
            <CardContent>
              {isMobile ? (
                <div className="space-y-3">
                  {bankChecks.map((check) => (
                    <Card key={check.id} className="overflow-hidden border-border/50">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold">{check.bank}</p>
                            <p className="text-xs text-muted-foreground">{check.branch}</p>
                          </div>
                          <Badge variant={check.status === "Encashed" ? "default" : "secondary"}>
                            {check.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground">Check #</p>
                            <p className="font-medium">{check.check_number}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Check Date</p>
                            <p className="font-medium">{format(new Date(check.check_date), "PP")}</p>
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-border/50">
                          <span className="text-xs text-muted-foreground">
                            Received: {format(new Date(check.date_received), "PP")}
                          </span>
                          <span className="text-lg font-bold text-accent">
                            {formatPeso(check.amount)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date Received</TableHead>
                        <TableHead>Bank</TableHead>
                        <TableHead>Branch</TableHead>
                        <TableHead>Check #</TableHead>
                        <TableHead>Check Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bankChecks.map((check) => (
                        <TableRow key={check.id}>
                          <TableCell className="whitespace-nowrap">
                            {format(new Date(check.date_received), "PP")}
                          </TableCell>
                          <TableCell>{check.bank}</TableCell>
                          <TableCell>{check.branch}</TableCell>
                          <TableCell>{check.check_number}</TableCell>
                          <TableCell>
                            {format(new Date(check.check_date), "PP")}
                          </TableCell>
                          <TableCell>
                            <Badge variant={check.status === "Encashed" ? "default" : "secondary"}>
                              {check.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatPeso(check.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default VendorDetail;
