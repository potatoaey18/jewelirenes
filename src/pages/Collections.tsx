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
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { createAuditLog } from '@/lib/auditLog';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';

export default function Collections() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [search, setSearch] = useState('');
  
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
        .select('*, customers(name), transactions(total_amount)')
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
        .select('*, payment_plans(*, customers(name))')
        .order('payment_date', { ascending: false });
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
      await createAuditLog('CREATE', 'collections', undefined, undefined, payment);
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
      addPayment.mutate({ planId: selectedPlan.id, payment: paymentFormData });
    }
  };

  const filteredPlans = paymentPlans.filter(plan =>
    plan.customers?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold">Collections</h1>
            <p className="text-muted-foreground">Manage installment plans and payments</p>
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
                          ₱{Number(transaction.total_amount).toFixed(2)} - {transaction.customers?.name}
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

        <Tabs defaultValue="plans" className="space-y-6">
          <TabsList>
            <TabsTrigger value="plans">Payment Plans</TabsTrigger>
            <TabsTrigger value="payments">Payment History</TabsTrigger>
          </TabsList>

          <TabsContent value="plans">
            <Card className="p-6">
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search by customer name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Amount Paid</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPlans.map((plan) => (
                      <TableRow key={plan.id}>
                        <TableCell className="font-medium">{plan.customers?.name}</TableCell>
                        <TableCell>₱{Number(plan.total_amount).toFixed(2)}</TableCell>
                        <TableCell>₱{Number(plan.amount_paid).toFixed(2)}</TableCell>
                        <TableCell>₱{Number(plan.balance).toFixed(2)}</TableCell>
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
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card className="p-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Amount Paid</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {collections.map((collection) => (
                      <TableRow key={collection.id}>
                        <TableCell>{new Date(collection.payment_date).toLocaleDateString()}</TableCell>
                        <TableCell>{collection.payment_plans?.customers?.name}</TableCell>
                        <TableCell className="font-medium">₱{Number(collection.amount_paid).toFixed(2)}</TableCell>
                        <TableCell>{collection.payment_method}</TableCell>
                        <TableCell>{collection.notes}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
            </DialogHeader>
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div>
                <Label>Customer</Label>
                <Input value={selectedPlan?.customers?.name || ''} disabled />
              </div>
              <div>
                <Label>Remaining Balance</Label>
                <Input value={`₱${Number(selectedPlan?.balance || 0).toFixed(2)}`} disabled />
              </div>
              <div>
                <Label htmlFor="amount_paid">Payment Amount (₱)</Label>
                <Input
                  id="amount_paid"
                  type="number"
                  step="0.01"
                  required
                  value={paymentFormData.amount_paid}
                  onChange={(e) => setPaymentFormData({...paymentFormData, amount_paid: e.target.value})}
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
              <Button type="submit" className="w-full">Record Payment</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
