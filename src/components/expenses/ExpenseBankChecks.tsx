import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Download, Pencil, Trash2, FileText, Banknote } from 'lucide-react';
import { toast } from 'sonner';
import { createAuditLog } from '@/lib/auditLog';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrencyForPDF } from '@/lib/pdfUtils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { VendorSearchInput } from '@/components/expenses/VendorSearchInput';

interface ExpenseBankCheck {
  id: string;
  vendor: string;
  bank: string;
  branch: string;
  check_number: string;
  check_date: string;
  amount: number;
  invoice_number: string | null;
  date_received: string;
  expiry_date: string | null;
  status: string;
  notes: string | null;
  created_by: string;
}

export function ExpenseBankChecks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCheck, setEditingCheck] = useState<ExpenseBankCheck | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'vendor'>('date');
  const [search, setSearch] = useState('');
  
  const [formData, setFormData] = useState({
    vendor: '',
    bank: '',
    branch: '',
    check_number: '',
    check_date: '',
    amount: '',
    invoice_number: '',
    date_received: new Date().toISOString().split('T')[0],
    expiry_date: '',
    status: 'Not Yet',
    notes: ''
  });

  const { data: bankChecks = [] } = useQuery({
    queryKey: ['expense_bank_checks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expense_bank_checks')
        .select('*')
        .order('date_received', { ascending: false });
      if (error) throw error;
      return data as ExpenseBankCheck[];
    }
  });

  // Fetch expenses to get unique vendors - use different query key to avoid cache conflicts
  const { data: expenseVendors = [] } = useQuery({
    queryKey: ['expense_vendors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('vendor')
        .not('vendor', 'is', null);
      if (error) throw error;
      return data;
    }
  });

  // Get unique vendors for suggestions
  const uniqueVendors = useMemo(() => {
    const vendors = new Set<string>();
    expenseVendors.forEach(exp => {
      if (exp.vendor) vendors.add(exp.vendor);
    });
    bankChecks.forEach(check => {
      if (check.vendor) vendors.add(check.vendor);
    });
    return Array.from(vendors).sort();
  }, [expenseVendors, bankChecks]);

  const createBankCheck = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from('expense_bank_checks')
        .insert([{ 
          ...data, 
          created_by: user?.id,
        }]);
      
      if (error) throw error;
      await createAuditLog('CREATE', 'expense_bank_checks', undefined, undefined, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense_bank_checks'] });
      toast.success('Bank check added successfully');
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add bank check');
    }
  });

  const updateBankCheck = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const oldData = bankChecks.find(c => c.id === id);
      const { error } = await supabase
        .from('expense_bank_checks')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
      await createAuditLog('UPDATE', 'expense_bank_checks', id, oldData, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense_bank_checks'] });
      toast.success('Bank check updated successfully');
      setDialogOpen(false);
      setEditingCheck(null);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update bank check');
    }
  });

  const deleteBankCheck = useMutation({
    mutationFn: async (id: string) => {
      const oldData = bankChecks.find(c => c.id === id);
      const { error } = await supabase
        .from('expense_bank_checks')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      await createAuditLog('DELETE', 'expense_bank_checks', id, oldData, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense_bank_checks'] });
      toast.success('Bank check deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete bank check');
    }
  });

  const resetForm = () => {
    setFormData({
      vendor: '',
      bank: '',
      branch: '',
      check_number: '',
      check_date: '',
      amount: '',
      invoice_number: '',
      date_received: new Date().toISOString().split('T')[0],
      expiry_date: '',
      status: 'Not Yet',
      notes: ''
    });
  };

  const handleEdit = (check: ExpenseBankCheck) => {
    setEditingCheck(check);
    setFormData({
      vendor: check.vendor,
      bank: check.bank,
      branch: check.branch,
      check_number: check.check_number,
      check_date: check.check_date.split('T')[0],
      amount: String(check.amount),
      invoice_number: check.invoice_number || '',
      date_received: check.date_received.split('T')[0],
      expiry_date: check.expiry_date?.split('T')[0] || '',
      status: check.status,
      notes: check.notes || ''
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCheck) {
      updateBankCheck.mutate({ id: editingCheck.id, data: formData });
    } else {
      createBankCheck.mutate(formData);
    }
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingCheck(null);
      resetForm();
    }
  };

  // Sort and filter bank checks
  const sortedChecks = [...bankChecks]
    .filter(check => 
      check.vendor?.toLowerCase().includes(search.toLowerCase()) ||
      check.bank?.toLowerCase().includes(search.toLowerCase()) ||
      check.check_number?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'vendor') {
        return (a.vendor || '').localeCompare(b.vendor || '');
      }
      return new Date(b.date_received).getTime() - new Date(a.date_received).getTime();
    });

  const totalAmount = bankChecks.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Expense Bank Checks Report", 14, 20);
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);
    
    const tableData = sortedChecks.map((check) => [
      check.vendor,
      check.bank,
      check.check_number,
      new Date(check.check_date).toLocaleDateString(),
      formatCurrencyForPDF(check.amount)
    ]);
    
    autoTable(doc, {
      head: [["Vendor", "Bank", "Check Number", "Check Date", "Amount"]],
      body: tableData,
      startY: 35,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [212, 175, 55] }
    });
    
    const finalY = (doc as any).lastAutoTable?.finalY || 35;
    
    doc.setFontSize(12);
    doc.text(`Total Checks: ${sortedChecks.length}`, 14, finalY + 10);
    doc.text(`Total Amount: ${formatCurrencyForPDF(totalAmount)}`, 14, finalY + 18);
    
    doc.save(`expense-bank-checks-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success("PDF exported successfully");
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Checks</p>
                <p className="text-2xl font-bold">{bankChecks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-lg">
                <Banknote className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-bold">₱{totalAmount.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by vendor, bank, or check number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={sortBy} onValueChange={(value: 'date' | 'vendor') => setSortBy(value)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Sort by Date</SelectItem>
              <SelectItem value="vendor">Sort by Vendor</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportPDF}>
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
          <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Check
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingCheck ? 'Edit Bank Check' : 'Add Bank Check'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="vendor">Vendor Name *</Label>
                    <VendorSearchInput
                      id="vendor"
                      value={formData.vendor}
                      onChange={(value) => setFormData({...formData, vendor: value})}
                      vendors={uniqueVendors}
                      placeholder="Search or enter vendor..."
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="bank">Bank *</Label>
                    <Input
                      id="bank"
                      required
                      value={formData.bank}
                      onChange={(e) => setFormData({...formData, bank: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="branch">Branch *</Label>
                    <Input
                      id="branch"
                      required
                      value={formData.branch}
                      onChange={(e) => setFormData({...formData, branch: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="check_number">Check Number *</Label>
                    <Input
                      id="check_number"
                      required
                      value={formData.check_number}
                      onChange={(e) => setFormData({...formData, check_number: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="check_date">Check Date *</Label>
                    <Input
                      id="check_date"
                      type="date"
                      required
                      value={formData.check_date}
                      onChange={(e) => setFormData({...formData, check_date: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="amount">Amount (₱) *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      required
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="invoice_number">Invoice Number</Label>
                    <Input
                      id="invoice_number"
                      value={formData.invoice_number}
                      onChange={(e) => setFormData({...formData, invoice_number: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="date_received">Date Received *</Label>
                    <Input
                      id="date_received"
                      type="date"
                      required
                      value={formData.date_received}
                      onChange={(e) => setFormData({...formData, date_received: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="expiry_date">Expiry Date</Label>
                    <Input
                      id="expiry_date"
                      type="date"
                      value={formData.expiry_date}
                      onChange={(e) => setFormData({...formData, expiry_date: e.target.value})}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full">
                  {editingCheck ? 'Update Check' : 'Add Check'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="p-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor</TableHead>
                <TableHead>Bank</TableHead>
                <TableHead>Check #</TableHead>
                <TableHead>Check Date</TableHead>
                <TableHead>Date Received</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedChecks.map((check) => (
                <TableRow key={check.id}>
                  <TableCell className="font-medium">{check.vendor}</TableCell>
                  <TableCell>{check.bank}</TableCell>
                  <TableCell>{check.check_number}</TableCell>
                  <TableCell>{new Date(check.check_date).toLocaleDateString()}</TableCell>
                  <TableCell>{new Date(check.date_received).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right font-semibold">₱{Number(check.amount).toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(check)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Bank Check?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the bank check record.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteBankCheck.mutate(check.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {sortedChecks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No expense bank checks found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}