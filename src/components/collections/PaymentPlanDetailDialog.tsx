import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatPeso } from '@/lib/currency';
import { formatCurrencyForPDF } from '@/lib/pdfUtils';
import { format } from 'date-fns';
import { Loader2, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PaymentPlanDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: any;
}

export function PaymentPlanDetailDialog({ open, onOpenChange, plan }: PaymentPlanDetailDialogProps) {
  const { data: collections = [], isLoading } = useQuery({
    queryKey: ['plan_collections', plan?.id],
    queryFn: async () => {
      if (!plan?.id) return [];
      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .eq('payment_plan_id', plan.id)
        .order('payment_date', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: open && !!plan?.id,
  });

  if (!plan) return null;

  const productNames = plan.transactions?.transaction_items?.map((item: any) => item.product_name).join(', ') || '-';
  const progressPercent = plan.total_amount > 0 
    ? Math.min(100, (Number(plan.amount_paid) / Number(plan.total_amount)) * 100) 
    : 0;

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.text("Payment Plan Details", 14, 20);
    doc.setFontSize(11);
    doc.text(`Generated: ${format(new Date(), 'MMM dd, yyyy')}`, 14, 28);
    
    // Customer & Plan Info
    doc.setFontSize(12);
    doc.text(`Customer: ${plan.customers?.name || 'Unknown'}`, 14, 42);
    doc.text(`Products: ${productNames}`, 14, 50);
    doc.text(`Status: ${plan.status}`, 14, 58);
    doc.text(`Created: ${format(new Date(plan.created_at), 'MMM dd, yyyy')}`, 14, 66);
    
    // Summary Box
    doc.setFontSize(11);
    doc.text(`Total Amount: ${formatCurrencyForPDF(plan.total_amount)}`, 14, 80);
    doc.text(`Amount Paid: ${formatCurrencyForPDF(plan.amount_paid)}`, 14, 88);
    doc.text(`Balance: ${formatCurrencyForPDF(plan.balance)}`, 14, 96);
    doc.text(`Progress: ${progressPercent.toFixed(1)}%`, 14, 104);
    
    // Payment History Table
    if (collections.length > 0) {
      doc.setFontSize(12);
      doc.text("Payment History", 14, 118);
      
      const tableData = collections.map((c: any) => [
        format(new Date(c.payment_date), 'MMM dd, yyyy'),
        formatCurrencyForPDF(c.amount_paid),
        c.payment_method || '-',
        c.notes || '-'
      ]);
      
      autoTable(doc, {
        head: [["Date", "Amount", "Method", "Notes"]],
        body: tableData,
        startY: 122,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [212, 175, 55] }
      });
    } else {
      doc.text("No payments recorded yet.", 14, 118);
    }
    
    const customerName = (plan.customers?.name || 'unknown').replace(/\s+/g, '-').toLowerCase();
    doc.save(`payment-plan-${customerName}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between pr-8">
            <div>
              <DialogTitle>Payment Plan Details</DialogTitle>
              <DialogDescription>
                View the breakdown of payments for this plan
              </DialogDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              <Download className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Plan Summary */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">{plan.customers?.name}</span>
                <Badge variant={plan.status === 'completed' ? 'default' : 'secondary'}>
                  {plan.status}
                </Badge>
              </div>
              
              <p className="text-sm text-muted-foreground">{productNames}</p>
              
              <Separator />

              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Total Amount</p>
                  <p className="font-bold text-lg">{formatPeso(plan.total_amount)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Amount Paid</p>
                  <p className="font-bold text-lg text-green-600">{formatPeso(plan.amount_paid)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Balance</p>
                  <p className="font-bold text-lg text-orange-600">{formatPeso(plan.balance)}</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progress</span>
                  <span>{progressPercent.toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                Created: {format(new Date(plan.created_at), 'MMM dd, yyyy')}
              </div>
            </CardContent>
          </Card>

          {/* Payment History */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Payment History ({collections.length})</h3>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : collections.length === 0 ? (
              <p className="text-center py-6 text-sm text-muted-foreground">
                No payments recorded yet
              </p>
            ) : (
              <div className="max-h-60 overflow-y-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs">Amount</TableHead>
                      <TableHead className="text-xs">Method</TableHead>
                      <TableHead className="text-xs">Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {collections.map((collection: any, index: number) => (
                      <TableRow key={collection.id}>
                        <TableCell className="text-sm">
                          {format(new Date(collection.payment_date), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell className="text-sm font-medium text-green-600">
                          {formatPeso(collection.amount_paid)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {collection.payment_method || '-'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground truncate max-w-[150px]">
                          {collection.notes || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
