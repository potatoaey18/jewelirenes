import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Building2, Receipt, Plus, Pencil, Trash2, Search, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { createAuditLog } from '@/lib/auditLog';
import { useAuth } from '@/hooks/useAuth';

interface VendorDirectoryProps {
  expenses: any[];
}

interface VendorSummary {
  name: string;
  totalAmount: number;
  transactionCount: number;
  categories: string[];
  lastPayment: string;
}

export function VendorDirectory({ expenses }: VendorDirectoryProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addVendorDialogOpen, setAddVendorDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState({ vendor: '' });
  const [newVendorName, setNewVendorName] = useState('');

  const vendors = useMemo(() => {
    const vendorMap = new Map<string, VendorSummary>();

    expenses.forEach((expense) => {
      const vendorName = expense.vendor || 'Unknown Vendor';
      const existing = vendorMap.get(vendorName);

      if (existing) {
        existing.totalAmount += Number(expense.amount);
        existing.transactionCount += 1;
        if (expense.category && !existing.categories.includes(expense.category)) {
          existing.categories.push(expense.category);
        }
        if (new Date(expense.expense_date) > new Date(existing.lastPayment)) {
          existing.lastPayment = expense.expense_date;
        }
      } else {
        vendorMap.set(vendorName, {
          name: vendorName,
          totalAmount: Number(expense.amount),
          transactionCount: 1,
          categories: expense.category ? [expense.category] : [],
          lastPayment: expense.expense_date,
        });
      }
    });

    return Array.from(vendorMap.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [expenses]);

  const filteredVendors = vendors.filter(vendor =>
    vendor.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalVendorSpend = vendors.reduce((sum, v) => sum + v.totalAmount, 0);

  // Add new vendor (creates a placeholder expense with $0)
  const addVendor = useMutation({
    mutationFn: async (vendorName: string) => {
      // Check if vendor already exists
      const existingVendor = vendors.find(v => v.name.toLowerCase() === vendorName.toLowerCase());
      if (existingVendor) {
        throw new Error('Vendor already exists');
      }

      const { error } = await supabase
        .from('expenses')
        .insert([{
          vendor: vendorName,
          amount: 0,
          category: 'Other',
          description: 'Vendor registration',
          expense_date: new Date().toISOString(),
          created_by: user?.id
        }]);
      
      if (error) throw error;
      await createAuditLog('CREATE', 'expenses', undefined, undefined, { vendor: vendorName, type: 'vendor_registration' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Vendor added successfully');
      setAddVendorDialogOpen(false);
      setNewVendorName('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add vendor');
    }
  });

  // Update all expenses with old vendor name to new vendor name
  const updateVendor = useMutation({
    mutationFn: async ({ oldName, newName }: { oldName: string; newName: string }) => {
      const { error } = await supabase
        .from('expenses')
        .update({ vendor: newName })
        .eq('vendor', oldName);
      
      if (error) throw error;
      await createAuditLog('UPDATE', 'expenses', undefined, { vendor: oldName }, { vendor: newName });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Vendor updated successfully');
      setDialogOpen(false);
      setEditingVendor(null);
      setFormData({ vendor: '' });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update vendor');
    }
  });

  // Delete all expenses for a vendor
  const deleteVendor = useMutation({
    mutationFn: async (vendorName: string) => {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('vendor', vendorName);
      
      if (error) throw error;
      await createAuditLog('DELETE', 'expenses', undefined, { vendor: vendorName }, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Vendor and all related expenses deleted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete vendor');
    }
  });

  const handleEdit = (vendor: VendorSummary) => {
    setEditingVendor(vendor.name);
    setFormData({ vendor: vendor.name });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingVendor && formData.vendor) {
      updateVendor.mutate({ oldName: editingVendor, newName: formData.vendor });
    }
  };

  const handleAddVendorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newVendorName.trim()) {
      addVendor.mutate(newVendorName.trim());
    }
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingVendor(null);
      setFormData({ vendor: '' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Vendors</p>
                <p className="text-2xl font-bold">{vendors.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-lg">
                <Receipt className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Spend</p>
                <p className="text-2xl font-bold">₱{totalVendorSpend.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-secondary rounded-lg">
                <Receipt className="h-5 w-5 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Transactions</p>
                <p className="text-2xl font-bold">{expenses.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search vendors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Dialog open={addVendorDialogOpen} onOpenChange={setAddVendorDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Vendor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Vendor</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddVendorSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="newVendor">Vendor Name</Label>
                  <Input
                    id="newVendor"
                    value={newVendorName}
                    onChange={(e) => setNewVendorName(e.target.value)}
                    required
                    placeholder="Enter vendor name"
                    className="mt-2"
                  />
                </div>
                <Button type="submit" className="w-full">Add Vendor</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-base font-semibold">Vendor Name</TableHead>
                <TableHead className="text-base font-semibold">Categories</TableHead>
                <TableHead className="text-base font-semibold text-center">Transactions</TableHead>
                <TableHead className="text-base font-semibold">Last Payment</TableHead>
                <TableHead className="text-right text-base font-semibold">Total Amount</TableHead>
                <TableHead className="text-right text-base font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVendors.map((vendor) => (
                <TableRow 
                  key={vendor.name} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/expenses/vendor/${encodeURIComponent(vendor.name)}`)}
                >
                  <TableCell className="py-4 font-medium text-primary hover:underline">
                    {vendor.name}
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex flex-wrap gap-1">
                      {vendor.categories.slice(0, 3).map((cat) => (
                        <Badge key={cat} variant="secondary" className="text-xs">
                          {cat}
                        </Badge>
                      ))}
                      {vendor.categories.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{vendor.categories.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-4 text-center">{vendor.transactionCount}</TableCell>
                  <TableCell className="py-4">
                    {new Date(vendor.lastPayment).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right font-semibold py-4 text-lg">
                    ₱{vendor.totalAmount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right py-4">
                    <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => navigate(`/expenses/vendor/${encodeURIComponent(vendor.name)}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Dialog open={dialogOpen && editingVendor === vendor.name} onOpenChange={handleDialogClose}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(vendor)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Vendor Name</DialogTitle>
                          </DialogHeader>
                          <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                              <Label htmlFor="vendor">Vendor Name</Label>
                              <Input
                                id="vendor"
                                value={formData.vendor}
                                onChange={(e) => setFormData({ vendor: e.target.value })}
                                required
                              />
                            </div>
                            <p className="text-sm text-muted-foreground">
                              This will update {vendor.transactionCount} expense record(s) with this vendor name.
                            </p>
                            <Button type="submit" className="w-full">Update Vendor</Button>
                          </form>
                        </DialogContent>
                      </Dialog>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Vendor?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete all {vendor.transactionCount} expense(s) 
                              totaling ₱{vendor.totalAmount.toLocaleString()} for "{vendor.name}". 
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteVendor.mutate(vendor.name)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredVendors.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No vendors found
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
