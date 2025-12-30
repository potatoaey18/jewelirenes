import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatPeso } from '@/lib/currency';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Payment Plan Details</DialogTitle>
          <DialogDescription>
            View the breakdown of payments for this plan
          </DialogDescription>
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
