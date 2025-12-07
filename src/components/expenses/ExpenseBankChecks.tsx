import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Download } from 'lucide-react';
import { toast } from 'sonner';
import { createAuditLog } from '@/lib/auditLog';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { BankCheckBookView } from '@/components/collections/BankCheckBookView';
import { BankCheckDetailDialog } from '@/components/customers/BankCheckDetailDialog';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrencyForPDF } from '@/lib/pdfUtils';

export function ExpenseBankChecks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedCheck, setSelectedCheck] = useState<any>(null);
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
        .from('bank_checks')
        .select('*, customers(name)')
        .order('date_received', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const createBankCheck = useMutation({
    mutationFn: async (data: any) => {
      // For expense bank checks, we don't associate with a customer
      const { error } = await supabase
        .from('bank_checks')
        .insert([{ 
          ...data, 
          created_by: user?.id,
          // Use a placeholder customer_id or create a vendor tracking system
        }]);
      
      if (error) throw error;
      await createAuditLog('CREATE', 'bank_checks', undefined, undefined, { ...data, type: 'expense' });
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createBankCheck.mutate(formData);
  };

  // Sort and filter bank checks
  const sortedChecks = [...bankChecks]
    .filter(check => 
      check.customers?.name?.toLowerCase().includes(search.toLowerCase()) ||
      check.bank?.toLowerCase().includes(search.toLowerCase()) ||
      check.check_number?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'vendor') {
        return (a.customers?.name || '').localeCompare(b.customers?.name || '');
      }
      return new Date(b.date_received).getTime() - new Date(a.date_received).getTime();
    });

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Bank Checks Report (Expenses)", 14, 20);
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);
    
    const tableData = sortedChecks.map((check) => [
      check.customers?.name || 'Unknown',
      check.bank,
      check.check_number,
      new Date(check.check_date).toLocaleDateString(),
      formatCurrencyForPDF(check.amount),
      check.status
    ]);
    
    autoTable(doc, {
      head: [["Vendor/Customer", "Bank", "Check Number", "Check Date", "Amount", "Status"]],
      body: tableData,
      startY: 35,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [212, 175, 55] }
    });
    
    const finalY = (doc as any).lastAutoTable?.finalY || 35;
    const totalAmount = sortedChecks.reduce((sum, c) => sum + Number(c.amount), 0);
    const encashedTotal = sortedChecks.filter(c => c.status === 'Encashed').reduce((sum, c) => sum + Number(c.amount), 0);
    const pendingTotal = sortedChecks.filter(c => c.status !== 'Encashed').reduce((sum, c) => sum + Number(c.amount), 0);
    
    doc.setFontSize(12);
    doc.text(`Total Checks: ${sortedChecks.length}`, 14, finalY + 10);
    doc.text(`Total Amount: ${formatCurrencyForPDF(totalAmount)}`, 14, finalY + 18);
    doc.text(`Encashed: ${formatCurrencyForPDF(encashedTotal)}`, 14, finalY + 26);
    doc.text(`Pending: ${formatCurrencyForPDF(pendingTotal)}`, 14, finalY + 34);
    
    doc.save(`expense-bank-checks-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success("PDF exported successfully");
  };

  const handleCheckClick = (check: any) => {
    setSelectedCheck(check);
    setDetailOpen(true);
  };

  const handleStatusUpdate = async (checkId: string, newStatus: string) => {
    const { error } = await supabase
      .from('bank_checks')
      .update({ status: newStatus })
      .eq('id', checkId);
    
    if (error) {
      toast.error('Failed to update status');
    } else {
      queryClient.invalidateQueries({ queryKey: ['expense_bank_checks'] });
      toast.success('Status updated');
    }
  };

  return (
    <div className="space-y-6">
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
        </div>
      </div>

      <BankCheckBookView 
        checks={sortedChecks} 
        onCheckClick={handleCheckClick}
      />

      <BankCheckDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        check={selectedCheck}
      />
    </div>
  );
}
