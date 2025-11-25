import { useState, useEffect, useRef } from "react";
import { UserPlus, Search, Phone, Mail, MapPin, ShoppingBag, Trash2, Edit2, User, Download, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CustomerDialog } from "@/components/customers/CustomerDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navigation from "@/components/Navigation";

type TimePeriod = "weekly" | "monthly" | "yearly";
type PurchaseFilter = "all" | "paid" | "unpaid";

const Customers = () => {
  const navigate = useNavigate();
  const exportRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<string | null>(null);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("monthly");
  const [purchaseFilter, setPurchaseFilter] = useState<PurchaseFilter>("all");

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from("customers")
        .select(`
          *,
          transactions(total_amount, created_at),
          payment_plans(balance, total_amount)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleEdit = (customer: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCustomer(customer);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedCustomer(null);
    setDialogOpen(true);
  };

  const handleDeleteClick = (customerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCustomerToDelete(customerId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!customerToDelete) return;

    try {
      const { error } = await supabase
        .from("customers")
        .delete()
        .eq("id", customerToDelete);

      if (error) throw error;
      toast.success("Customer deleted");
      fetchCustomers();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setDeleteDialogOpen(false);
      setCustomerToDelete(null);
    }
  };

  const getTierBadge = (tier: string) => {
    const variants: Record<string, { bg: string; text: string }> = {
      VIP: { bg: "bg-accent", text: "text-accent-foreground" },
      Gold: { bg: "bg-amber-500", text: "text-white" },
      Silver: { bg: "bg-slate-400", text: "text-white" },
    };
    const style = variants[tier] || variants.Silver;
    return (
      <Badge className={`${style.bg} ${style.text} hover:${style.bg}/90`}>{tier}</Badge>
    );
  };

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const getTimePeriodDate = () => {
    const now = new Date();
    const oneWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const oneYear = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    
    switch (timePeriod) {
      case "weekly": return oneWeek;
      case "monthly": return oneMonth;
      case "yearly": return oneYear;
    }
  };

  const filterTransactionsByPeriod = (transactions: any[]) => {
    const periodDate = getTimePeriodDate();
    return transactions?.filter((t: any) => new Date(t.created_at) >= periodDate) || [];
  };

  const getCustomerStats = (customer: any) => {
    const filteredTransactions = filterTransactionsByPeriod(customer.transactions || []);
    
    const totalSpent = filteredTransactions.reduce(
      (sum: number, t: any) => sum + parseFloat(t.total_amount || 0),
      0
    );
    const purchases = filteredTransactions.length;
    
    // Calculate unpaid balance from payment plans
    const unpaidBalance = customer.payment_plans?.reduce(
      (sum: number, plan: any) => sum + parseFloat(plan.balance || 0),
      0
    ) || 0;
    
    const paidAmount = totalSpent - unpaidBalance;
    
    return { totalSpent, purchases, paidAmount, unpaidBalance };
  };

  const filterByPurchaseStatus = (customers: any[]) => {
    if (purchaseFilter === "all") return customers;
    
    return customers.filter(customer => {
      const { unpaidBalance } = getCustomerStats(customer);
      if (purchaseFilter === "unpaid") return unpaidBalance > 0;
      if (purchaseFilter === "paid") return unpaidBalance === 0 && customer.transactions?.length > 0;
      return true;
    });
  };

  const handleExportImage = async () => {
    if (!exportRef.current) return;
    
    try {
      const html2canvasModule = await import("html2canvas");
      const html2canvas = html2canvasModule.default;
      
      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
      });
      
      const link = document.createElement("a");
      link.download = `customers-${timePeriod}-${purchaseFilter}-${new Date().toISOString()}.png`;
      link.href = canvas.toDataURL();
      link.click();
      
      toast.success("Image exported successfully");
    } catch (error: any) {
      toast.error("Failed to export image");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30">
      <Navigation />

      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">Customer Directory</h2>
            <p className="text-sm sm:text-base text-muted-foreground">Manage your client relationships</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={handleExportImage}
              variant="outline"
              className="w-full sm:w-auto"
            >
              <Download className="mr-2 h-4 w-4" />
              Export Image
            </Button>
            <Button
              onClick={handleAdd}
              className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Add Customer
            </Button>
          </div>
        </div>

        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 sm:h-12 bg-card border-border/50"
            />
          </div>
          <Select value={timePeriod} onValueChange={(value: TimePeriod) => setTimePeriod(value)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs value={purchaseFilter} onValueChange={(value: PurchaseFilter) => setPurchaseFilter(value)} className="mb-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="all">All Purchases</TabsTrigger>
            <TabsTrigger value="paid">Paid</TabsTrigger>
            <TabsTrigger value="unpaid">Unpaid</TabsTrigger>
          </TabsList>
        </Tabs>

        <div ref={exportRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filterByPurchaseStatus(filteredCustomers).map((customer) => {
            const { totalSpent, purchases, paidAmount, unpaidBalance } = getCustomerStats(customer);
            return (
              <Card
                key={customer.id}
                className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border/50 cursor-pointer overflow-hidden"
                onClick={() => navigate(`/customers/${customer.id}`)}
              >
                <div className="h-24 bg-gradient-to-br from-accent/20 to-accent/5 group-hover:from-accent/30 group-hover:to-accent/10 transition-all relative flex items-center justify-center">
                  {customer.photo_url ? (
                    <img src={customer.photo_url} alt={customer.name} className="w-16 h-16 rounded-full object-cover" />
                  ) : (
                    <User className="h-16 w-16 text-accent/40" />
                  )}
                </div>
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold mb-2">{customer.name}</h3>
                  <div className="space-y-2 text-xs sm:text-sm text-muted-foreground">
                    {customer.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
                        <span className="truncate">{customer.email}</span>
                      </div>
                    )}
                    {customer.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
                        <span>{customer.phone}</span>
                      </div>
                    )}
                    {customer.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
                        <span className="truncate">{customer.location}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-3 sm:pt-4 border-t border-border">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Total Spent</p>
                    <p className="text-base sm:text-lg font-bold text-accent">Php {totalSpent.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Purchases</p>
                    <div className="flex items-center gap-1">
                      <ShoppingBag className="h-3 w-3 sm:h-4 sm:w-4 text-accent" />
                      <p className="text-base sm:text-lg font-bold">{purchases}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Paid</p>
                    <p className="text-sm sm:text-base font-semibold text-green-600">Php {paidAmount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Unpaid</p>
                    <p className="text-sm sm:text-base font-semibold text-red-600">Php {unpaidBalance.toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={(e) => handleEdit(customer, e)}
                  >
                    <Edit2 className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={(e) => handleDeleteClick(customer.id, e)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>
      </main>

      <CustomerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        customer={selectedCustomer}
        onSuccess={fetchCustomers}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this customer? This will also delete all their transactions and files.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Customers;