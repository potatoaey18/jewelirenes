import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface BankCheckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: any[];
  onSubmit: (data: any) => void;
  initialData?: any;
}

export function BankCheckDialog({ open, onOpenChange, customers, onSubmit, initialData }: BankCheckDialogProps) {
  const [formData, setFormData] = useState({
    customer_id: initialData?.customer_id || '',
    bank: initialData?.bank || '',
    branch: initialData?.branch || '',
    check_date: initialData?.check_date?.split('T')[0] || '',
    check_number: initialData?.check_number || '',
    invoice_number: initialData?.invoice_number || '',
    amount: initialData?.amount || '',
    date_received: initialData?.date_received?.split('T')[0] || new Date().toISOString().split('T')[0],
    expiry_date: initialData?.expiry_date?.split('T')[0] || '',
    status: initialData?.status || 'Not Yet'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Bank Check' : 'Add Bank Check'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customer_id">Customer *</Label>
              <Select 
                value={formData.customer_id} 
                onValueChange={(value) => setFormData({...formData, customer_id: value})}
              >
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
              <Label htmlFor="bank">Bank *</Label>
              <Input
                id="bank"
                value={formData.bank}
                onChange={(e) => setFormData({...formData, bank: e.target.value})}
                required
              />
            </div>

            <div>
              <Label htmlFor="branch">Branch *</Label>
              <Input
                id="branch"
                value={formData.branch}
                onChange={(e) => setFormData({...formData, branch: e.target.value})}
                required
              />
            </div>

            <div>
              <Label htmlFor="check_date">Check Date *</Label>
              <Input
                id="check_date"
                type="date"
                value={formData.check_date}
                onChange={(e) => setFormData({...formData, check_date: e.target.value})}
                required
              />
            </div>

            <div>
              <Label htmlFor="check_number">Check Number *</Label>
              <Input
                id="check_number"
                value={formData.check_number}
                onChange={(e) => setFormData({...formData, check_number: e.target.value})}
                required
              />
            </div>

            <div>
              <Label htmlFor="invoice_number">Invoice Number *</Label>
              <Input
                id="invoice_number"
                value={formData.invoice_number}
                onChange={(e) => setFormData({...formData, invoice_number: e.target.value})}
                required
              />
            </div>

            <div>
              <Label htmlFor="amount">Amount (₱) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                required
              />
            </div>

            <div>
              <Label htmlFor="date_received">Date Received *</Label>
              <Input
                id="date_received"
                type="date"
                value={formData.date_received}
                onChange={(e) => setFormData({...formData, date_received: e.target.value})}
                required
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

            <div>
              <Label htmlFor="status">Status *</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => setFormData({...formData, status: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Not Yet">Not Yet</SelectItem>
                  <SelectItem value="Encashed">Encashed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {initialData ? 'Update' : 'Add'} Bank Check
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}