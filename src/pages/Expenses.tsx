import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Download } from 'lucide-react';
import { toast } from 'sonner';
import { createAuditLog } from '@/lib/auditLog';
import { useAuth } from '@/hooks/useAuth';
import { VendorDirectory } from '@/components/expenses/VendorDirectory';
import { ExpenseBankChecks } from '@/components/expenses/ExpenseBankChecks';
import { VendorSearchInput } from '@/components/expenses/VendorSearchInput';
import { ExpenseDetailDialog } from '@/components/expenses/ExpenseDetailDialog';
import { ResponsiveTable } from '@/components/ui/responsive-table';
import { CsvImport, CsvSampleDownload } from '@/components/CsvImport';
import { ViewToggle, ViewMode } from '@/components/ui/view-toggle';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrencyForPDF } from '@/lib/pdfUtils';

const ONLINE_PAYMENT_METHODS = ['GCash', 'BDO', 'BPI', 'Bank Transfer', 'Credit Card', 'Debit Card'];
const CHECK_PAYMENT_METHOD = 'Check';

export default function Expenses() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>(() => 
    (localStorage.getItem("expenses-view") as ViewMode) || "table"
  );
  const [formData, setFormData] = useState({
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    category: '',
    description: '',
    vendor: '',
    payment_method: '',
    notes: '',
    reference_number: '',
    account_name: '',
    check_number: '',
    check_date: '',
    bank: '',
    branch: '',
    invoice_number: '',
    expiry_date: ''
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch expense bank checks (for total calculation - checks added directly in Checks tab)
  const { data: expenseBankChecks = [] } = useQuery({
    queryKey: ['expense_bank_checks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expense_bank_checks')
        .select('*');
      
      if (error) throw error;
      return data;
    }
  });

  // Get unique vendors for suggestions
  const uniqueVendors = useMemo(() => {
    const vendors = new Set<string>();
    expenses.forEach(exp => {
      if (exp.vendor) vendors.add(exp.vendor);
    });
    return Array.from(vendors).sort();
  }, [expenses]);

  const createExpense = useMutation({
    mutationFn: async (data: any) => {
      const expenseData = {
        amount: data.amount,
        expense_date: data.expense_date,
        category: data.category,
        description: data.description,
        vendor: data.vendor,
        payment_method: data.payment_method,
        notes: data.notes,
        reference_number: data.reference_number || null,
        account_name: data.account_name || null,
        check_number: data.check_number || null,
        check_date: data.check_date || null,
        bank: data.bank || null,
        branch: data.branch || null,
        created_by: user?.id
      };

      const { error } = await supabase
        .from('expenses')
        .insert([expenseData]);
      
      if (error) throw error;

      // If payment method is Check, also create an expense_bank_check entry
      if (data.payment_method === CHECK_PAYMENT_METHOD && data.check_number) {
        const bankCheckData = {
          vendor: data.vendor,
          bank: data.bank,
          branch: data.branch,
          check_number: data.check_number,
          check_date: data.check_date,
          amount: data.amount,
          invoice_number: data.invoice_number || null,
          date_received: data.expense_date,
          expiry_date: data.expiry_date || null,
          status: 'Not Yet',
          notes: data.notes,
          created_by: user?.id
        };

        const { error: checkError } = await supabase
          .from('expense_bank_checks')
          .insert([bankCheckData]);
        
        if (checkError) {
          console.error('Failed to create bank check entry:', checkError);
        }
      }

      await createAuditLog('CREATE', 'expenses', undefined, undefined, expenseData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense_bank_checks'] });
      toast.success('Expense added successfully');
      setDialogOpen(false);
      resetForm();
    }
  });

  const resetForm = () => {
    setFormData({
      amount: '',
      expense_date: new Date().toISOString().split('T')[0],
      category: '',
      description: '',
      vendor: '',
      payment_method: '',
      notes: '',
      reference_number: '',
      account_name: '',
      check_number: '',
      check_date: '',
      bank: '',
      branch: '',
      invoice_number: '',
      expiry_date: ''
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createExpense.mutate(formData);
  };

  const filteredExpenses = expenses.filter(expense =>
    expense.description?.toLowerCase().includes(search.toLowerCase()) ||
    expense.vendor?.toLowerCase().includes(search.toLowerCase()) ||
    expense.category?.toLowerCase().includes(search.toLowerCase())
  );

  // Calculate total: expenses + standalone checks (checks not already in expenses via Check payment method)
  // Get check numbers from expenses that were paid via Check
  const expenseCheckNumbers = useMemo(() => {
    return new Set(
      expenses
        .filter(exp => exp.payment_method === 'Check' && exp.check_number)
        .map(exp => exp.check_number)
    );
  }, [expenses]);

  // Sum of standalone checks (not already counted in expenses)
  const standaloneChecksTotal = useMemo(() => {
    return expenseBankChecks
      .filter(check => !expenseCheckNumbers.has(check.check_number))
      .reduce((sum, check) => sum + (Number(check.amount) || 0), 0);
  }, [expenseBankChecks, expenseCheckNumbers]);

  const totalExpenses = expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0) + standaloneChecksTotal;

  const isCheckPayment = formData.payment_method === CHECK_PAYMENT_METHOD;
  const isCardPayment = ['Credit Card', 'Debit Card'].includes(formData.payment_method);
  const isOnlinePayment = ['GCash', 'BDO', 'BPI', 'Bank Transfer'].includes(formData.payment_method);
  const showTransactionFields = isCardPayment || isOnlinePayment;

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Expenses Report", 14, 20);
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);
    doc.text(`Total Expenses: ${formatCurrencyForPDF(totalExpenses)}`, 14, 38);
    
    const tableData = filteredExpenses.map((expense) => [
      new Date(expense.expense_date).toLocaleDateString(),
      expense.description || '-',
      expense.category || '-',
      expense.vendor || '-',
      expense.payment_method || '-',
      formatCurrencyForPDF(expense.amount)
    ]);
    
    autoTable(doc, {
      head: [["Date", "Description", "Category", "Vendor", "Payment Method", "Amount"]],
      body: tableData,
      startY: 45,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [212, 175, 55] }
    });
    
    doc.save(`expenses-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success("PDF exported successfully");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold mb-1 sm:mb-2">Expenses</h1>
            <p className="text-sm sm:text-base lg:text-lg text-muted-foreground">Track and manage business expenses</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-64 lg:w-80">
              <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 sm:h-5 sm:w-5" />
              <Input
                placeholder="Search expenses..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 sm:pl-12 h-10 sm:h-12 text-sm sm:text-base"
              />
            </div>
            <CsvSampleDownload
              title="Import Expenses"
              columns={[
                { key: "amount", label: "Amount", required: true },
                { key: "expense_date", label: "Date (YYYY-MM-DD)", required: true },
                { key: "category", label: "Category", required: true },
                { key: "vendor", label: "Vendor Name" },
                { key: "description", label: "Description" },
                { key: "payment_method", label: "Payment Method" },
                { key: "notes", label: "Notes" },
              ]}
              sampleData={[
                { amount: "5000", expense_date: "2024-01-15", category: "Supplies", vendor: "ABC Supplies", description: "Office supplies", payment_method: "Cash", notes: "Monthly restock" },
                { amount: "15000", expense_date: "2024-01-20", category: "Utilities", vendor: "Electric Company", description: "Electric bill", payment_method: "Bank Transfer", notes: "" },
              ]}
            />
            <CsvImport
              title="Import Expenses"
              columns={[
                { key: "amount", label: "Amount", required: true },
                { key: "expense_date", label: "Date (YYYY-MM-DD)", required: true },
                { key: "category", label: "Category", required: true },
                { key: "vendor", label: "Vendor Name" },
                { key: "description", label: "Description" },
                { key: "payment_method", label: "Payment Method" },
                { key: "notes", label: "Notes" },
              ]}
              sampleData={[
                { amount: "5000", expense_date: "2024-01-15", category: "Supplies", vendor: "ABC Supplies", description: "Office supplies", payment_method: "Cash", notes: "Monthly restock" },
                { amount: "15000", expense_date: "2024-01-20", category: "Utilities", vendor: "Electric Company", description: "Electric bill", payment_method: "Bank Transfer", notes: "" },
              ]}
              onImport={async (data) => {
                if (!user?.id) throw new Error("User not authenticated");
                const validCategories = ["Supplies", "Utilities", "Rent", "Salaries", "Marketing", "Equipment", "Other"];
                const expenses = data.map(row => {
                  if (!validCategories.includes(row.category)) {
                    throw new Error(`Invalid category "${row.category}". Valid: ${validCategories.join(", ")}`);
                  }
                  return {
                    amount: parseFloat(row.amount) || 0,
                    expense_date: row.expense_date,
                    category: row.category,
                    vendor: row.vendor || null,
                    description: row.description || null,
                    payment_method: row.payment_method || null,
                    notes: row.notes || null,
                    created_by: user.id,
                  };
                });
                const { error } = await supabase.from("expenses").insert(expenses);
                if (error) throw error;
                queryClient.invalidateQueries({ queryKey: ['expenses'] });
              }}
            />
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full md:w-auto h-10 sm:h-12">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Expense
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Expense</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="amount" className="text-base font-semibold mb-2 block">Amount (₱)</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        required
                        value={formData.amount}
                        onChange={(e) => setFormData({...formData, amount: e.target.value})}
                        className="h-12 text-base"
                      />
                    </div>
                    <div>
                      <Label htmlFor="expense_date" className="text-base font-semibold mb-2 block">Date</Label>
                      <Input
                        id="expense_date"
                        type="date"
                        required
                        value={formData.expense_date}
                        onChange={(e) => setFormData({...formData, expense_date: e.target.value})}
                        className="h-12 text-base"
                      />
                    </div>
                    <div>
                      <Label htmlFor="category" className="text-base font-semibold mb-2 block">Category</Label>
                      <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                        <SelectTrigger className="h-12 text-base">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Supplies">Supplies</SelectItem>
                          <SelectItem value="Utilities">Utilities</SelectItem>
                          <SelectItem value="Rent">Rent</SelectItem>
                          <SelectItem value="Salaries">Salaries</SelectItem>
                          <SelectItem value="Marketing">Marketing</SelectItem>
                          <SelectItem value="Equipment">Equipment</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="vendor" className="text-base font-semibold mb-2 block">Vendor</Label>
                      <VendorSearchInput
                        id="vendor"
                        value={formData.vendor}
                        onChange={(value) => setFormData({...formData, vendor: value})}
                        vendors={uniqueVendors}
                        placeholder="Search or enter vendor..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="payment_method" className="text-base font-semibold mb-2 block">Payment Method</Label>
                      <Select value={formData.payment_method} onValueChange={(value) => setFormData({...formData, payment_method: value})}>
                        <SelectTrigger className="h-12 text-base">
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Cash">Cash</SelectItem>
                          <SelectItem value="Credit Card">Credit Card</SelectItem>
                          <SelectItem value="Debit Card">Debit Card</SelectItem>
                          <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                          <SelectItem value="Check">Check</SelectItem>
                          <SelectItem value="GCash">GCash</SelectItem>
                          <SelectItem value="BDO">BDO</SelectItem>
                          <SelectItem value="BPI">BPI</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Card/Online Payment Transaction Fields */}
                    {showTransactionFields && (
                      <>
                        <div>
                          <Label htmlFor="reference_number" className="text-base font-semibold mb-2 block">
                            {isCardPayment ? 'Transaction/Reference Number' : 'Reference Number'}
                          </Label>
                          <Input
                            id="reference_number"
                            value={formData.reference_number}
                            onChange={(e) => setFormData({...formData, reference_number: e.target.value})}
                            className="h-12 text-base"
                            placeholder={isCardPayment ? "Enter transaction number" : "Enter reference number"}
                          />
                        </div>
                        <div>
                          <Label htmlFor="account_name" className="text-base font-semibold mb-2 block">
                            {isCardPayment ? 'Card Holder / Account Name' : 'Account Name'}
                          </Label>
                          <Input
                            id="account_name"
                            value={formData.account_name}
                            onChange={(e) => setFormData({...formData, account_name: e.target.value})}
                            className="h-12 text-base"
                            placeholder="Enter account name"
                          />
                        </div>
                        {isOnlinePayment && (
                          <div>
                            <Label htmlFor="bank" className="text-base font-semibold mb-2 block">Bank / Provider</Label>
                            <Input
                              id="bank"
                              value={formData.bank}
                              onChange={(e) => setFormData({...formData, bank: e.target.value})}
                              className="h-12 text-base"
                              placeholder="Enter bank or provider name"
                            />
                          </div>
                        )}
                      </>
                    )}

                    {/* Check Payment Fields - matching Bank Check form */}
                    {isCheckPayment && (
                      <>
                        <div>
                          <Label htmlFor="bank" className="text-base font-semibold mb-2 block">Bank *</Label>
                          <Input
                            id="bank"
                            required
                            value={formData.bank}
                            onChange={(e) => setFormData({...formData, bank: e.target.value})}
                            className="h-12 text-base"
                            placeholder="Enter bank name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="branch" className="text-base font-semibold mb-2 block">Branch *</Label>
                          <Input
                            id="branch"
                            required
                            value={formData.branch}
                            onChange={(e) => setFormData({...formData, branch: e.target.value})}
                            className="h-12 text-base"
                            placeholder="Enter branch"
                          />
                        </div>
                        <div>
                          <Label htmlFor="check_number" className="text-base font-semibold mb-2 block">Check Number *</Label>
                          <Input
                            id="check_number"
                            required
                            value={formData.check_number}
                            onChange={(e) => setFormData({...formData, check_number: e.target.value})}
                            className="h-12 text-base"
                            placeholder="Enter check number"
                          />
                        </div>
                        <div>
                          <Label htmlFor="check_date" className="text-base font-semibold mb-2 block">Check Date *</Label>
                          <Input
                            id="check_date"
                            type="date"
                            required
                            value={formData.check_date}
                            onChange={(e) => setFormData({...formData, check_date: e.target.value})}
                            className="h-12 text-base"
                          />
                        </div>
                        <div>
                          <Label htmlFor="invoice_number" className="text-base font-semibold mb-2 block">Invoice Number</Label>
                          <Input
                            id="invoice_number"
                            value={formData.invoice_number}
                            onChange={(e) => setFormData({...formData, invoice_number: e.target.value})}
                            className="h-12 text-base"
                            placeholder="Enter invoice number"
                          />
                        </div>
                      </>
                    )}

                    <div className="md:col-span-2">
                      <Label htmlFor="description" className="text-base font-semibold mb-2 block">Description</Label>
                      <Input
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        className="h-12 text-base"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="notes" className="text-base font-semibold mb-2 block">Notes</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({...formData, notes: e.target.value})}
                        className="min-h-[100px] text-base"
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full text-lg">Add Expense</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card className="mb-6 sm:mb-8 p-4 sm:p-6 lg:p-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm sm:text-base text-muted-foreground mb-1 sm:mb-2">Total Expenses</p>
              <p className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold">₱{(totalExpenses || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>
        </Card>

        <Tabs defaultValue="expenses" className="space-y-4 sm:space-y-6">
          <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:flex">
            <TabsTrigger value="expenses" className="text-xs sm:text-sm">Expenses</TabsTrigger>
            <TabsTrigger value="vendors" className="text-xs sm:text-sm">Vendors</TabsTrigger>
            <TabsTrigger value="bank-checks" className="text-xs sm:text-sm">Checks</TabsTrigger>
          </TabsList>

          <TabsContent value="expenses">
            <Card className="p-3 sm:p-6 lg:p-8">
              <div className="flex flex-col sm:flex-row justify-between gap-3 mb-4 sm:mb-6">
                <ViewToggle 
                  viewMode={viewMode} 
                  onViewModeChange={(mode) => {
                    setViewMode(mode);
                    localStorage.setItem("expenses-view", mode);
                  }} 
                />
                <Button variant="outline" onClick={handleExportPDF} className="w-full sm:w-auto">
                  <Download className="mr-2 h-4 w-4" />
                  Export PDF
                </Button>
              </div>

              {viewMode === "cards" ? (
                <div className="space-y-2">
                  {filteredExpenses.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground text-sm">No expenses found</p>
                  ) : (
                    filteredExpenses.map((expense) => (
                      <Card 
                        key={expense.id} 
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => {
                          setSelectedExpense(expense);
                          setDetailDialogOpen(true);
                        }}
                      >
                        <CardContent className="p-3 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">{new Date(expense.expense_date).toLocaleDateString()}</span>
                            <span className="font-bold text-sm text-accent">₱{Number(expense.amount).toLocaleString()}</span>
                          </div>
                          <p className="font-medium text-sm truncate">{expense.description || expense.category}</p>
                          <p className="text-xs text-muted-foreground truncate">{expense.vendor || '-'}</p>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              ) : (
                <ResponsiveTable
                  columns={[
                    {
                      key: 'expense_date',
                      label: 'Date',
                      render: (value: string) => new Date(value).toLocaleDateString()
                    },
                    { key: 'description', label: 'Description' },
                    { key: 'category', label: 'Category' },
                    { key: 'vendor', label: 'Vendor' },
                    { key: 'payment_method', label: 'Payment' },
                    {
                      key: 'amount',
                      label: 'Amount',
                      className: 'text-right font-semibold',
                      render: (value: number) => `₱${Number(value).toLocaleString()}`
                    }
                  ]}
                  data={filteredExpenses}
                  onRowClick={(expense) => {
                    setSelectedExpense(expense);
                    setDetailDialogOpen(true);
                  }}
                  emptyMessage="No expenses found"
                />
              )}
            </Card>
          </TabsContent>

          <TabsContent value="vendors">
            <VendorDirectory expenses={expenses} />
          </TabsContent>

          <TabsContent value="bank-checks">
            <ExpenseBankChecks />
          </TabsContent>
        </Tabs>

        <ExpenseDetailDialog
          expense={selectedExpense}
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
        />
      </div>
    </div>
  );
}
