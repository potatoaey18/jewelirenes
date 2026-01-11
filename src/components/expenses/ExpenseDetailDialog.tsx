import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';

interface Expense {
  id: string;
  amount: number;
  expense_date: string;
  category: string;
  description: string | null;
  vendor: string | null;
  payment_method: string | null;
  notes: string | null;
  reference_number: string | null;
  account_name: string | null;
  check_number: string | null;
  check_date: string | null;
  bank: string | null;
  branch: string | null;
  created_at: string;
}

interface ExpenseDetailDialogProps {
  expense: Expense | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (expense: Expense) => void;
  // onDelete prop is kept for type compatibility but no longer used
  onDelete?: (expense: Expense) => void;
}

export function ExpenseDetailDialog({ expense, open, onOpenChange, onEdit }: ExpenseDetailDialogProps) {
  if (!expense) return null;

  const isCheckPayment = expense.payment_method === 'Check';
  const isCardPayment = ['Credit Card', 'Debit Card'].includes(expense.payment_method || '');
  const isOnlinePayment = ['GCash', 'BDO', 'BPI', 'Bank Transfer'].includes(expense.payment_method || '');
  const hasTransactionDetails = isCheckPayment || isCardPayment || isOnlinePayment;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">Expense Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Amount and Date */}
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-muted-foreground">Amount</p>
              <p className="text-3xl font-bold">₱{Number(expense.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Date</p>
              <p className="text-lg font-medium">{new Date(expense.expense_date).toLocaleDateString()}</p>
            </div>
          </div>

          <Separator />

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Category</p>
              <Badge variant="secondary" className="mt-1">{expense.category || 'Uncategorized'}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Payment Method</p>
              <Badge variant="outline" className="mt-1">{expense.payment_method || 'Not specified'}</Badge>
            </div>
            {expense.vendor && (
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">Vendor</p>
                <p className="text-base font-medium">{expense.vendor}</p>
              </div>
            )}
            {expense.description && (
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="text-base">{expense.description}</p>
              </div>
            )}
          </div>

          {/* Transaction Details for non-cash payments */}
          {hasTransactionDetails && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-3">Transaction Details</p>
                <div className="grid grid-cols-2 gap-4">
                  {isCheckPayment && (
                    <>
                      {expense.bank && (
                        <div>
                          <p className="text-sm text-muted-foreground">Bank</p>
                          <p className="text-base font-medium">{expense.bank}</p>
                        </div>
                      )}
                      {expense.branch && (
                        <div>
                          <p className="text-sm text-muted-foreground">Branch</p>
                          <p className="text-base font-medium">{expense.branch}</p>
                        </div>
                      )}
                      {expense.check_number && (
                        <div>
                          <p className="text-sm text-muted-foreground">Check Number</p>
                          <p className="text-base font-medium">{expense.check_number}</p>
                        </div>
                      )}
                      {expense.check_date && (
                        <div>
                          <p className="text-sm text-muted-foreground">Check Date</p>
                          <p className="text-base font-medium">{new Date(expense.check_date).toLocaleDateString()}</p>
                        </div>
                      )}
                    </>
                  )}
                  {(isCardPayment || isOnlinePayment) && (
                    <>
                      {expense.reference_number && (
                        <div>
                          <p className="text-sm text-muted-foreground">Reference Number</p>
                          <p className="text-base font-medium">{expense.reference_number}</p>
                        </div>
                      )}
                      {expense.account_name && (
                        <div>
                          <p className="text-sm text-muted-foreground">Account Name</p>
                          <p className="text-base font-medium">{expense.account_name}</p>
                        </div>
                      )}
                      {isOnlinePayment && expense.bank && (
                        <div>
                          <p className="text-sm text-muted-foreground">Bank / Provider</p>
                          <p className="text-base font-medium">{expense.bank}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          {expense.notes && (
            <>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground">Notes</p>
                <p className="text-base mt-1">{expense.notes}</p>
              </div>
            </>
          )}

          {/* Created Date */}
          <div className="text-xs text-muted-foreground pt-2">
            Created: {new Date(expense.created_at).toLocaleString()}
          </div>

          {/* Policy notice - very important for audit trail compliance */}
          <div className="mt-4 p-3 bg-muted/50 rounded-md text-sm text-muted-foreground italic">
            Expenses cannot be deleted to maintain complete and accurate financial records. 
            Please use the Edit function for corrections or contact an administrator for special cases.
          </div>
        </div>

        {/* Footer - only Edit button remains */}
        {onEdit && (
          <DialogFooter className="sm:justify-start">
            <Button
              variant="outline"
              onClick={() => onEdit(expense)}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit Expense
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}