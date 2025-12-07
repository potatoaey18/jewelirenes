import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Building2, Receipt } from 'lucide-react';

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
  const vendors = useMemo(() => {
    const vendorMap = new Map<string, VendorSummary>();

    expenses.forEach((expense) => {
      const vendorName = expense.vendor || 'Unknown Vendor';
      const existing = vendorMap.get(vendorName);

      if (existing) {
        existing.totalAmount += Number(expense.amount);
        existing.transactionCount += 1;
        if (!existing.categories.includes(expense.category)) {
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

  const totalVendorSpend = vendors.reduce((sum, v) => sum + v.totalAmount, 0);

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
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-base font-semibold">Vendor Name</TableHead>
                <TableHead className="text-base font-semibold">Categories</TableHead>
                <TableHead className="text-base font-semibold text-center">Transactions</TableHead>
                <TableHead className="text-base font-semibold">Last Payment</TableHead>
                <TableHead className="text-right text-base font-semibold">Total Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendors.map((vendor) => (
                <TableRow key={vendor.name}>
                  <TableCell className="py-4 font-medium">{vendor.name}</TableCell>
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
                </TableRow>
              ))}
              {vendors.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
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
