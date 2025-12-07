import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrencyForPDF } from '@/lib/pdfUtils';

export default function Expenses() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState({
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    category: '',
    description: '',
    vendor: '',
    payment_method: '',
    notes: ''
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

  const createExpense = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from('expenses')
        .insert([{ ...data, created_by: user?.id }]);
      
      if (error) throw error;
      await createAuditLog('CREATE', 'expenses', undefined, undefined, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Expense added successfully');
      setDialogOpen(false);
      setFormData({
        amount: '',
        expense_date: new Date().toISOString().split('T')[0],
        category: '',
        description: '',
        vendor: '',
        payment_method: '',
        notes: ''
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createExpense.mutate(formData);
  };

  const filteredExpenses = expenses.filter(expense =>
    expense.description?.toLowerCase().includes(search.toLowerCase()) ||
    expense.vendor?.toLowerCase().includes(search.toLowerCase()) ||
    expense.category?.toLowerCase().includes(search.toLowerCase())
  );

  const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

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
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-2">Expenses</h1>
            <p className="text-muted-foreground text-lg">Track and manage business expenses</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full md:w-auto">
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
                    <Input
                      id="vendor"
                      value={formData.vendor}
                      onChange={(e) => setFormData({...formData, vendor: e.target.value})}
                      className="h-12 text-base"
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

        <Card className="mb-8 p-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-base text-muted-foreground mb-2">Total Expenses</p>
              <p className="text-4xl sm:text-5xl font-bold">₱{totalExpenses.toFixed(2)}</p>
            </div>
          </div>
        </Card>

        <Tabs defaultValue="expenses" className="space-y-6">
          <TabsList>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="vendors">Vendor Directory</TabsTrigger>
            <TabsTrigger value="bank-checks">Bank Checks</TabsTrigger>
          </TabsList>

          <TabsContent value="expenses">
            <Card className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                  <Input
                    placeholder="Search expenses..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-12 h-14 text-base"
                  />
                </div>
                <Button variant="outline" onClick={handleExportPDF}>
                  <Download className="mr-2 h-4 w-4" />
                  Export PDF
                </Button>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="text-base">
                      <TableHead className="text-base font-semibold">Date</TableHead>
                      <TableHead className="text-base font-semibold">Description</TableHead>
                      <TableHead className="text-base font-semibold">Category</TableHead>
                      <TableHead className="text-base font-semibold">Vendor</TableHead>
                      <TableHead className="text-base font-semibold">Payment Method</TableHead>
                      <TableHead className="text-right text-base font-semibold">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExpenses.map((expense) => (
                      <TableRow key={expense.id} className="text-base">
                        <TableCell className="py-4">{new Date(expense.expense_date).toLocaleDateString()}</TableCell>
                        <TableCell className="py-4">{expense.description}</TableCell>
                        <TableCell className="py-4">{expense.category}</TableCell>
                        <TableCell className="py-4">{expense.vendor}</TableCell>
                        <TableCell className="py-4">{expense.payment_method}</TableCell>
                        <TableCell className="text-right font-semibold py-4 text-lg">₱{Number(expense.amount).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="vendors">
            <VendorDirectory expenses={expenses} />
          </TabsContent>

          <TabsContent value="bank-checks">
            <ExpenseBankChecks />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
