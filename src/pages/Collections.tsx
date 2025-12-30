import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createAuditLog } from '@/lib/auditLog';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { BankCheckDialog } from '@/components/collections/BankCheckDialog';
import { BankCheckBookView } from '@/components/collections/BankCheckBookView';
import { BankCheckDetailDialog } from '@/components/customers/BankCheckDetailDialog';
import { ViewToggle, ViewMode } from '@/components/ui/view-toggle';
import { CurrencyInput } from '@/components/ui/currency-input';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrencyForPDF } from '@/lib/pdfUtils';
import { formatPeso, parseCurrency } from '@/lib/currency';

export default function Collections() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [bankCheckDialogOpen, setBankCheckDialogOpen] = useState(false);
  const [bankCheckDetailOpen, setBankCheckDetailOpen] = useState(false);
  const [selectedBankCheck, setSelectedBankCheck] = useState<any>(null);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [plansViewMode, setPlansViewMode] = useState<ViewMode>(() => 
    (localStorage.getItem("collections-plans-view") as ViewMode) || "table"
  );
  const [historyViewMode, setHistoryViewMode] = useState<ViewMode>(() => 
    (localStorage.getItem("collections-history-view") as ViewMode) || "table"
  );
  
  const [planFormData, setPlanFormData] = useState({
    customer_id: '',
    transaction_id: '',
    item_name: '',
    sku: '',
    total_amount: '',
    amount_paid: '0',
    balance: '',
    status: 'active'
  });

  const [paymentFormData, setPaymentFormData] = useState({
    amount_paid: '',
    payment_date: new Date().toISOString().split('T')[0],
    due_date: '',
    payment_method: '',
    notes: '',
    invoice_image: null as File | null
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('customers').select('*');
      if (error) throw error;
      return data;
    }
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, customers(name), transaction_items(product_name, product_id, products(sku))')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const { data: paymentPlans = [] } = useQuery({
    queryKey: ['payment_plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_plans')
        .select('*, customers(name), transactions(total_amount, transaction_items(product_name))')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const { data: collections = [] } = useQuery({
    queryKey: ['collections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collections')
        .select('*, payment_plans(*, customers(name), transactions(transaction_items(product_name)))')
        .order('payment_date', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const { data: bankChecks = [] } = useQuery({
    queryKey: ['bank_checks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_checks')
        .select('*, customers(name)')
        .order('date_received', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const createPlan = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from('payment_plans')
        .insert([{ ...data, created_by: user?.id }]);
      
      if (error) throw error;
      await createAuditLog('CREATE', 'payment_plans', undefined, undefined, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment_plans'] });
      toast.success('Payment plan created successfully');
      setDialogOpen(false);
      resetPlanForm();
    }
  });

  const addPayment = useMutation({
    mutationFn: async ({ planId, payment }: { planId: string; payment: any }) => {
      const { error: paymentError } = await supabase
        .from('collections')
        .insert([{ ...payment, payment_plan_id: planId, created_by: user?.id }]);
      
      if (paymentError) throw paymentError;

      const plan = paymentPlans.find(p => p.id === planId);
      const oldPlanData = { amount_paid: plan.amount_paid, balance: plan.balance, status: plan.status };
      const newAmountPaid = Number(plan.amount_paid) + Number(payment.amount_paid);
      const newBalance = Number(plan.total_amount) - newAmountPaid;
      const newStatus = newBalance <= 0 ? 'completed' : 'active';

      const { error: updateError } = await supabase
        .from('payment_plans')
        .update({
          amount_paid: newAmountPaid,
          balance: newBalance,
          status: newStatus
        })
        .eq('id', planId);
      
      if (updateError) throw updateError;
      await createAuditLog('CREATE', 'collections', undefined, undefined, { ...payment, customer: plan.customers?.name });
      await createAuditLog('UPDATE', 'payment_plans', planId, oldPlanData, { amount_paid: newAmountPaid, balance: newBalance, status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment_plans'] });
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      toast.success('Payment recorded successfully');
      setPaymentDialogOpen(false);
      resetPaymentForm();
    }
  });

  const resetPlanForm = () => {
    setPlanFormData({
      customer_id: '',
      transaction_id: '',
      item_name: '',
      sku: '',
      total_amount: '',
      amount_paid: '0',
      balance: '',
      status: 'active'
    });
  };

  const resetPaymentForm = () => {
    setPaymentFormData({
      amount_paid: '',
      payment_date: new Date().toISOString().split('T')[0],
      due_date: '',
      payment_method: '',
      notes: '',
      invoice_image: null
    });
  };

  const handlePlanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const balance = Number(planFormData.total_amount) - Number(planFormData.amount_paid);
    createPlan.mutate({ ...planFormData, balance });
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPlan) {
      const numericAmount = parseCurrency(paymentFormData.amount_paid);
      addPayment.mutate({ planId: selectedPlan.id, payment: { ...paymentFormData, amount_paid: numericAmount } });
    }
  };

  const createBankCheck = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from('bank_checks')
        .insert([{ ...data, created_by: user?.id }]);
      
      if (error) throw error;
      await createAuditLog('CREATE', 'bank_checks', undefined, undefined, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank_checks'] });
      toast.success('Bank check added successfully');
      setBankCheckDialogOpen(false);
    }
  });

  const filteredPlans = paymentPlans.filter(plan =>
    plan.customers?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleExportPaymentPlansPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Payment Plans Report", 14, 20);
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);
    
    const tableData = filteredPlans.map((plan) => {
      const productNames = plan.transactions?.transaction_items?.map((item: any) => item.product_name).join(', ') || '-';
      return [
        plan.customers?.name || 'Unknown',
        productNames,
        formatCurrencyForPDF(plan.total_amount),
        formatCurrencyForPDF(plan.amount_paid),
        formatCurrencyForPDF(plan.balance),
        plan.status
      ];
    });
    
    autoTable(doc, {
      head: [["Customer", "Products", "Total Amount", "Amount Paid", "Balance", "Status"]],
      body: tableData,
      startY: 35,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [212, 175, 55] }
    });
    
    doc.save(`payment-plans-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success("PDF exported successfully");
  };

  const handleExportPaymentHistoryPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Payment History Report", 14, 20);
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);
    
    const tableData = collections.map((collection) => {
      const productNames = collection.payment_plans?.transactions?.transaction_items?.map((item: any) => item.product_name).join(', ') || '-';
      return [
        new Date(collection.payment_date).toLocaleDateString(),
        collection.payment_plans?.customers?.name || 'Unknown',
        productNames,
        formatCurrencyForPDF(collection.amount_paid),
        collection.payment_method || '-',
        collection.notes || '-'
      ];
    });
    
    autoTable(doc, {
      head: [["Payment Date", "Customer", "Products", "Amount Paid", "Payment Method", "Notes"]],
      body: tableData,
      startY: 35,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [212, 175, 55] }
    });
    
    doc.save(`payment-history-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success("PDF exported successfully");
  };

  const handleExportBankChecksPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Bank Checks Report", 14, 20);
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);
    
    const tableData = bankChecks.map((check) => [
      check.customers?.name || 'Unknown',
      check.bank,
      check.check_number,
      new Date(check.check_date).toLocaleDateString(),
      formatCurrencyForPDF(check.amount),
      check.status
    ]);
    
    autoTable(doc, {
      head: [["Customer", "Bank", "Check Number", "Check Date", "Amount", "Status"]],
      body: tableData,
      startY: 35,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [212, 175, 55] }
    });
    
    // Add summary
    const finalY = (doc as any).lastAutoTable?.finalY || 35;
    const totalAmount = bankChecks.reduce((sum, c) => sum + Number(c.amount), 0);
    const encashedTotal = bankChecks.filter(c => c.status === 'Encashed').reduce((sum, c) => sum + Number(c.amount), 0);
    const pendingTotal = bankChecks.filter(c => c.status !== 'Encashed').reduce((sum, c) => sum + Number(c.amount), 0);
    
    doc.setFontSize(12);
    doc.text(`Total Checks: ${bankChecks.length}`, 14, finalY + 10);
    doc.text(`Total Amount: ${formatCurrencyForPDF(totalAmount)}`, 14, finalY + 18);
    doc.text(`Encashed: ${formatCurrencyForPDF(encashedTotal)}`, 14, finalY + 26);
    doc.text(`Pending: ${formatCurrencyForPDF(pendingTotal)}`, 14, finalY + 34);
    
    doc.save(`bank-checks-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success("PDF exported successfully");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 sm:mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Collections</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Manage installment plans and payments</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full md:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                New Record
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Record</DialogTitle>
              </DialogHeader>
              <form onSubmit={handlePlanSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="customer_id">Customer</Label>
                  <Select value={planFormData.customer_id} onValueChange={(value) => setPlanFormData({...planFormData, customer_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="transaction_id">Transaction</Label>
                  <Select 
                    value={planFormData.transaction_id} 
                    onValueChange={(value) => {
                      const selectedTransaction = transactions.find(t => t.id === value);
                      const itemName = selectedTransaction?.transaction_items?.[0]?.product_name || '';
                      const sku = selectedTransaction?.transaction_items?.[0]?.products?.sku || '';
                      const totalAmount = selectedTransaction?.total_amount?.toString() || '';
                      setPlanFormData({
                        ...planFormData, 
                        transaction_id: value,
                        item_name: itemName,
                        sku: sku,
                        total_amount: totalAmount
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select transaction" />
                    </SelectTrigger>
                    <SelectContent>
                      {transactions.map((transaction) => (
                        <SelectItem key={transaction.id} value={transaction.id}>
                          ₱{formatPeso(transaction.total_amount).slice(1)} - {transaction.customers?.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="item_name">Item Name</Label>
                  <Input
                    id="item_name"
                    value={planFormData.item_name}
                    onChange={(e) => setPlanFormData({...planFormData, item_name: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    value={planFormData.sku}
                    onChange={(e) => setPlanFormData({...planFormData, sku: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="total_amount">Total Amount (₱)</Label>
                  <Input
                    id="total_amount"
                    type="number"
                    step="0.01"
                    required
                    value={planFormData.total_amount}
                    disabled
                  />
                </div>
                <div>
                  <Label htmlFor="amount_paid">Initial Payment (₱)</Label>
                  <Input
                    id="amount_paid"
                    type="number"
                    step="0.01"
                    value={planFormData.amount_paid}
                    onChange={(e) => setPlanFormData({...planFormData, amount_paid: e.target.value})}
                  />
                </div>
                <Button type="submit" className="w-full">Create Record</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="plans" className="space-y-4 sm:space-y-6">
          <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:flex">
            <TabsTrigger value="plans" className="text-xs sm:text-sm">Plans</TabsTrigger>
            <TabsTrigger value="payments" className="text-xs sm:text-sm">History</TabsTrigger>
            <TabsTrigger value="checks" className="text-xs sm:text-sm">Checks</TabsTrigger>
          </TabsList>

          <TabsContent value="plans">
            <Card className="p-3 sm:p-6">
              <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search by customer..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2">
                  <ViewToggle 
                    viewMode={plansViewMode} 
                    onViewModeChange={(mode) => {
                      setPlansViewMode(mode);
                      localStorage.setItem("collections-plans-view", mode);
                    }} 
                  />
                  <Button variant="outline" onClick={handleExportPaymentPlansPDF} className="flex-1 sm:flex-none">
                    <Download className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Export PDF</span>
                  </Button>
                </div>
              </div>
              
              {plansViewMode === "cards" ? (
                <div className="space-y-2">
                  {filteredPlans.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground text-sm">No payment plans found</p>
                  ) : (
                    filteredPlans.map((plan) => {
                      const productNames = plan.transactions?.transaction_items?.map((item: any) => item.product_name).join(', ') || '-';
                      return (
                        <Card key={plan.id} className="hover:bg-muted/50 transition-colors">
                          <CardContent className="p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm">{plan.customers?.name}</span>
                              <Badge variant={plan.status === 'completed' ? 'default' : 'secondary'} className="text-[10px]">
                                {plan.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{productNames}</p>
                            <div className="flex justify-between text-xs">
                              <span>Paid: {formatPeso(plan.amount_paid)}</span>
                              <span className="font-bold">Bal: {formatPeso(plan.balance)}</span>
                            </div>
                            {plan.status === 'active' && (
                              <Button
                                size="sm"
                                className="w-full h-7 text-xs"
                                onClick={() => {
                                  setSelectedPlan(plan);
                                  setPaymentDialogOpen(true);
                                }}
                              >
                                Add Payment
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Product Names</TableHead>
                        <TableHead>Total Amount</TableHead>
                        <TableHead>Amount Paid</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPlans.map((plan) => {
                        const productNames = plan.transactions?.transaction_items?.map((item: any) => item.product_name).join(', ') || '-';
                        return (
                          <TableRow key={plan.id}>
                            <TableCell className="font-medium">{plan.customers?.name}</TableCell>
                            <TableCell>{productNames}</TableCell>
                            <TableCell>{formatPeso(plan.total_amount)}</TableCell>
                            <TableCell>{formatPeso(plan.amount_paid)}</TableCell>
                            <TableCell>{formatPeso(plan.balance)}</TableCell>
                            <TableCell>
                              <Badge variant={plan.status === 'completed' ? 'default' : 'secondary'}>
                                {plan.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {plan.status === 'active' && (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedPlan(plan);
                                    setPaymentDialogOpen(true);
                                  }}
                                >
                                  Add Payment
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card className="p-3 sm:p-6">
              <div className="flex flex-col sm:flex-row justify-between gap-3 mb-4">
                <ViewToggle 
                  viewMode={historyViewMode} 
                  onViewModeChange={(mode) => {
                    setHistoryViewMode(mode);
                    localStorage.setItem("collections-history-view", mode);
                  }} 
                />
                <Button variant="outline" onClick={handleExportPaymentHistoryPDF}>
                  <Download className="mr-2 h-4 w-4" />
                  Export PDF
                </Button>
              </div>
              
              {historyViewMode === "cards" ? (
                <div className="space-y-2">
                  {collections.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground text-sm">No payments found</p>
                  ) : (
                    collections.map((collection) => {
                      const productNames = collection.payment_plans?.transactions?.transaction_items?.map((item: any) => item.product_name).join(', ') || '-';
                      return (
                        <Card key={collection.id}>
                          <CardContent className="p-3 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">{new Date(collection.payment_date).toLocaleDateString()}</span>
                              <span className="font-bold text-sm text-accent">{formatPeso(collection.amount_paid)}</span>
                            </div>
                            <p className="font-medium text-sm">{collection.payment_plans?.customers?.name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground truncate">{productNames}</p>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Payment Date</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Product Names</TableHead>
                        <TableHead>Amount Paid</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {collections.map((collection) => {
                      const productNames = collection.payment_plans?.transactions?.transaction_items?.map((item: any) => item.product_name).join(', ') || '-';
                      return (
                        <TableRow key={collection.id}>
                          <TableCell>{new Date(collection.payment_date).toLocaleDateString()}</TableCell>
                          <TableCell>{collection.payment_plans?.customers?.name}</TableCell>
                          <TableCell>{productNames}</TableCell>
                          <TableCell className="font-medium">{formatPeso(collection.amount_paid)}</TableCell>
                          <TableCell>{collection.payment_method}</TableCell>
                          <TableCell>{collection.notes}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="checks">
            <Card className="p-6">
              <div className="flex justify-end gap-2 mb-4">
                <Button variant="outline" onClick={handleExportBankChecksPDF}>
                  <Download className="mr-2 h-4 w-4" />
                  Export PDF
                </Button>
                <Button onClick={() => setBankCheckDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Bank Check
                </Button>
              </div>

              <BankCheckBookView
                checks={bankChecks}
                customers={customers}
                showCustomerFilter={true}
                onCheckClick={(check) => {
                  setSelectedBankCheck(check);
                  setBankCheckDetailOpen(true);
                }}
              />
            </Card>
          </TabsContent>
        </Tabs>

        <BankCheckDialog
          open={bankCheckDialogOpen}
          onOpenChange={setBankCheckDialogOpen}
          customers={customers}
          onSubmit={(data) => createBankCheck.mutate(data)}
        />

        <BankCheckDetailDialog
          open={bankCheckDetailOpen}
          onOpenChange={setBankCheckDetailOpen}
          check={selectedBankCheck}
        />

        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
              <DialogDescription>Add a payment to this payment plan</DialogDescription>
            </DialogHeader>
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div>
                <Label>Customer</Label>
                <Input value={selectedPlan?.customers?.name || ''} disabled />
              </div>
              <div>
                <Label>Remaining Balance</Label>
                <Input value={formatPeso(selectedPlan?.balance || 0)} disabled />
              </div>
              <div>
                <Label htmlFor="amount_paid">Payment Amount (₱)</Label>
                <CurrencyInput
                  id="amount_paid"
                  required
                  value={paymentFormData.amount_paid}
                  onChange={(display) => setPaymentFormData({...paymentFormData, amount_paid: display})}
                  showPesoSign
                />
              </div>
              <div>
                <Label htmlFor="payment_date">Payment Date</Label>
                <Input
                  id="payment_date"
                  type="date"
                  required
                  value={paymentFormData.payment_date}
                  onChange={(e) => setPaymentFormData({...paymentFormData, payment_date: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="payment_method">Payment Method</Label>
                <Select value={paymentFormData.payment_method} onValueChange={(value) => setPaymentFormData({...paymentFormData, payment_method: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Credit Card">Credit Card</SelectItem>
                    <SelectItem value="Debit Card">Debit Card</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="Check">Check</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={paymentFormData.notes}
                  onChange={(e) => setPaymentFormData({...paymentFormData, notes: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="invoice_image">Invoice Image (Optional)</Label>
                <Input
                  id="invoice_image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPaymentFormData({...paymentFormData, invoice_image: e.target.files?.[0] || null})}
                />
              </div>
              <Button type="submit" className="w-full" disabled={addPayment.isPending}>
                {addPayment.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Record Payment'
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
