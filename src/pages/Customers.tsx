import { useState, useEffect, useRef } from "react";
import { UserPlus, Search, Phone, Mail, MapPin, ShoppingBag, Trash2, Edit2, User, Download, FileText, Image as ImageIcon, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { createAuditLog } from "@/lib/auditLog";
import { CustomerDialog } from "@/components/customers/CustomerDialog";
import { CsvImport, CsvSampleDownload } from "@/components/CsvImport";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Navigation from "@/components/Navigation";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrencyForPDF } from "@/lib/pdfUtils";
import { useIsMobile } from "@/hooks/use-mobile";

const Customers = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const exportRef = useRef<HTMLDivElement>(null);
  const masterHistoryRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState<any[]>([]);
  const [masterHistory, setMasterHistory] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomers();
    fetchMasterHistory();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from("customers")
        .select(`
          *,
          transactions(total_amount),
          payment_plans(balance)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const fetchMasterHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select(`
          id,
          total_amount,
          discount,
          created_at,
          customer_id,
          invoice_image_url,
          customers(name),
          transaction_items(product_name),
          payment_plans(
            id,
            total_amount,
            amount_paid,
            balance,
            collections(amount_paid)
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMasterHistory(data || []);
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
      // Get customer data before deletion for audit log
      const customerData = customers.find(c => c.id === customerToDelete);
      
      const { error } = await supabase
        .from("customers")
        .delete()
        .eq("id", customerToDelete);

      if (error) throw error;
      
      await createAuditLog('DELETE', 'customers', customerToDelete, { name: customerData?.name }, undefined);
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

  const getCustomerStats = (customer: any) => {
    const totalSpent = customer.transactions?.reduce(
      (sum: number, t: any) => sum + parseFloat(t.total_amount || 0),
      0
    ) || 0;
    
    const purchases = customer.transactions?.length || 0;
    
    const unpaidBalance = customer.payment_plans?.reduce(
      (sum: number, plan: any) => sum + parseFloat(plan.balance || 0),
      0
    ) || 0;
    
    const paidAmount = totalSpent - unpaidBalance;
    
    return { totalSpent, purchases, paidAmount, unpaidBalance };
  };

  const handleExportCustomersPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Customer Directory", 14, 20);
    
    const tableData = filteredCustomers.map((customer) => {
      const { totalSpent, purchases, unpaidBalance } = getCustomerStats(customer);
      return [
        customer.name,
        customer.email || "-",
        customer.phone || "-",
        customer.location || "-",
        formatCurrencyForPDF(totalSpent),
        purchases.toString(),
        formatCurrencyForPDF(unpaidBalance)
      ];
    });
    
    autoTable(doc, {
      head: [["Name", "Email", "Phone", "Location", "Total Spent", "Purchases", "Balance"]],
      body: tableData,
      startY: 30,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [212, 175, 55] }
    });
    
    doc.save(`customers-${new Date().toISOString()}.pdf`);
    toast.success("PDF exported successfully");
  };

  const handleExportMasterHistoryPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Master History - Sales & Collections", 14, 20);
    
    const tableData = masterHistory.map((transaction) => {
      const customerName = transaction.customers?.name || "Unknown";
      const productNames = transaction.transaction_items?.map((item: any) => item.product_name).join(", ") || "-";
      const dateSold = new Date(transaction.created_at).toLocaleDateString();
      const retailPrice = parseFloat(transaction.total_amount || 0);
      const discount = parseFloat(transaction.discount || 0);
      const discountedPrice = discount > 0 ? retailPrice - discount : retailPrice;
      const paymentPlan = transaction.payment_plans?.[0];
      const payments = paymentPlan?.collections?.reduce(
        (sum: number, c: any) => sum + parseFloat(c.amount_paid || 0),
        0
      ) || 0;
      const balance = paymentPlan?.balance || 0;
      
      return [
        dateSold,
        customerName,
        productNames,
        formatCurrencyForPDF(retailPrice),
        discount > 0 ? formatCurrencyForPDF(discount) : "-",
        discount > 0 ? formatCurrencyForPDF(discountedPrice) : "-",
        formatCurrencyForPDF(payments),
        formatCurrencyForPDF(balance)
      ];
    });
    
    autoTable(doc, {
      head: [["Date Sold", "Customer", "Product Names", "Retail Price", "Discount", "Discounted Price", "Payments", "Balance"]],
      body: tableData,
      startY: 30,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [212, 175, 55] }
    });
    
    doc.save(`master-history-${new Date().toISOString()}.pdf`);
    toast.success("PDF exported successfully");
  };

  const handleExportMasterHistoryImage = async () => {
    if (!masterHistoryRef.current) return;
    
    try {
      const html2canvasModule = await import("html2canvas");
      const html2canvas = html2canvasModule.default;
      
      const canvas = await html2canvas(masterHistoryRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
      });
      
      const link = document.createElement("a");
      link.download = `master-history-${new Date().toISOString()}.png`;
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
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">Customers</h2>
            <p className="text-sm sm:text-base text-muted-foreground">Manage your client relationships</p>
          </div>
          <div className="grid grid-cols-3 sm:flex gap-2 w-full sm:w-auto">
            <CsvSampleDownload
              title="Import Customers"
              columns={[
                { key: "name", label: "Customer Name", required: true },
                { key: "email", label: "Email Address" },
                { key: "phone", label: "Phone Number" },
                { key: "address", label: "Full Address" },
                { key: "location", label: "Location/City" },
                { key: "tier", label: "Tier (VIP/Gold/Silver)" },
                { key: "notes", label: "Notes" },
              ]}
              sampleData={[
                { name: "Maria Santos", email: "maria@email.com", phone: "09171234567", address: "123 Main St, Manila", location: "Manila", tier: "Gold", notes: "Regular customer" },
                { name: "Jose Reyes", email: "jose@email.com", phone: "09181234567", address: "456 Oak Ave, Cebu", location: "Cebu", tier: "Silver", notes: "" },
              ]}
            />
            <CsvImport
              title="Import Customers"
              columns={[
                { key: "name", label: "Customer Name", required: true },
                { key: "email", label: "Email Address" },
                { key: "phone", label: "Phone Number" },
                { key: "address", label: "Full Address" },
                { key: "location", label: "Location/City" },
                { key: "tier", label: "Tier (VIP/Gold/Silver)" },
                { key: "notes", label: "Notes" },
              ]}
              sampleData={[
                { name: "Maria Santos", email: "maria@email.com", phone: "09171234567", address: "123 Main St, Manila", location: "Manila", tier: "Gold", notes: "Regular customer" },
                { name: "Jose Reyes", email: "jose@email.com", phone: "09181234567", address: "456 Oak Ave, Cebu", location: "Cebu", tier: "Silver", notes: "" },
              ]}
              onImport={async (data) => {
                const { error } = await supabase.from("customers").insert(
                  data.map(row => ({
                    name: row.name,
                    email: row.email || null,
                    phone: row.phone || null,
                    address: row.address || null,
                    location: row.location || null,
                    tier: row.tier || "Silver",
                    notes: row.notes || null,
                  }))
                );
                if (error) throw error;
                fetchCustomers();
              }}
            />
            <Button
              onClick={handleAdd}
              size="sm"
              className="bg-accent hover:bg-accent/90 text-accent-foreground text-xs sm:text-sm"
            >
              <UserPlus className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Add Customer</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
        </div>

        <Tabs defaultValue="directory" className="w-full space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="directory" className="text-xs sm:text-sm">Directory</TabsTrigger>
            <TabsTrigger value="history" className="text-xs sm:text-sm">Master History</TabsTrigger>
          </TabsList>

          <TabsContent value="directory">
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center mb-4 sm:mb-6 gap-3 sm:gap-4">
              <div className="relative flex-1 sm:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search customers..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 h-10 sm:h-12 bg-card border-border/50"
                />
              </div>
              <Button
                onClick={handleExportCustomersPDF}
                variant="outline"
                className="w-full sm:w-auto flex-shrink-0"
              >
                <FileText className="mr-2 h-4 w-4" />
                Export PDF
              </Button>
            </div>

            <div ref={exportRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredCustomers.map((customer) => {
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
          </TabsContent>

          <TabsContent value="history">
            <div className="grid grid-cols-2 sm:flex sm:justify-end gap-2 mb-4 sm:mb-6">
              <Button
                onClick={handleExportMasterHistoryImage}
                variant="outline"
                size="sm"
                className="text-xs sm:text-sm"
              >
                <ImageIcon className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                <span className="hidden sm:inline">Export Image</span>
                <span className="sm:hidden">Image</span>
              </Button>
              <Button
                onClick={handleExportMasterHistoryPDF}
                variant="outline"
                size="sm"
                className="text-xs sm:text-sm"
              >
                <FileText className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                <span className="hidden sm:inline">Export PDF</span>
                <span className="sm:hidden">PDF</span>
              </Button>
            </div>

            {/* Mobile Card View */}
            {isMobile ? (
              <div ref={masterHistoryRef} className="space-y-3">
                {masterHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No transaction history yet</div>
                ) : (
                  masterHistory.map((transaction) => {
                    const customerName = transaction.customers?.name || "Unknown";
                    const customerId = transaction.customer_id;
                    const productNames = transaction.transaction_items?.map((item: any) => item.product_name).join(", ") || "-";
                    const retailPrice = parseFloat(transaction.total_amount || 0);
                    const discount = parseFloat(transaction.discount || 0);
                    const discountedPrice = discount > 0 ? retailPrice - discount : null;
                    const paymentPlan = transaction.payment_plans?.[0];
                    const payments = paymentPlan?.collections?.reduce(
                      (sum: number, c: any) => sum + parseFloat(c.amount_paid || 0),
                      0
                    ) || 0;
                    const balance = paymentPlan?.balance || 0;
                    const dateSold = new Date(transaction.created_at).toLocaleDateString();

                    return (
                      <Card key={transaction.id} className="overflow-hidden">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <button
                                onClick={() => navigate(`/customers/${customerId}`)}
                                className="text-accent hover:underline font-semibold text-base"
                              >
                                {customerName}
                              </button>
                              <p className="text-xs text-muted-foreground mt-1">{dateSold}</p>
                            </div>
                            {transaction.invoice_image_url && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(transaction.invoice_image_url, "_blank")}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          
                          <p className="text-sm text-muted-foreground line-clamp-2">{productNames}</p>
                          
                          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
                            <div>
                              <p className="text-xs text-muted-foreground">Retail Price</p>
                              <p className="font-semibold">₱{retailPrice.toLocaleString()}</p>
                            </div>
                            {discount > 0 && (
                              <div>
                                <p className="text-xs text-muted-foreground">Discount</p>
                                <p className="font-semibold text-destructive">-₱{discount.toLocaleString()}</p>
                              </div>
                            )}
                            <div>
                              <p className="text-xs text-muted-foreground">Payments</p>
                              <p className="font-semibold text-green-600">₱{payments.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Balance</p>
                              <p className={`font-semibold ${balance > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                                ₱{balance.toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            ) : (
              /* Desktop Table View */
              <Card className="overflow-hidden">
                <div ref={masterHistoryRef} className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date Sold</TableHead>
                        <TableHead>Customer Name</TableHead>
                        <TableHead>Product Names</TableHead>
                        <TableHead>Retail Price</TableHead>
                        <TableHead>Discount</TableHead>
                        <TableHead>Discounted Price</TableHead>
                        <TableHead>Payments</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead>Invoice</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {masterHistory.map((transaction) => {
                        const customerName = transaction.customers?.name || "Unknown";
                        const customerId = transaction.customer_id;
                        const productNames = transaction.transaction_items?.map((item: any) => item.product_name).join(", ") || "-";
                        const retailPrice = parseFloat(transaction.total_amount || 0);
                        const discount = parseFloat(transaction.discount || 0);
                        const discountedPrice = discount > 0 ? retailPrice - discount : null;
                        const paymentPlan = transaction.payment_plans?.[0];
                        const payments = paymentPlan?.collections?.reduce(
                          (sum: number, c: any) => sum + parseFloat(c.amount_paid || 0),
                          0
                        ) || 0;
                        const balance = paymentPlan?.balance || 0;
                        const dateSold = new Date(transaction.created_at).toLocaleDateString();

                        return (
                          <TableRow key={transaction.id}>
                            <TableCell>{dateSold}</TableCell>
                            <TableCell>
                              <button
                                onClick={() => navigate(`/customers/${customerId}`)}
                                className="text-accent hover:underline font-medium"
                              >
                                {customerName}
                              </button>
                            </TableCell>
                            <TableCell>{productNames}</TableCell>
                            <TableCell>₱{retailPrice.toLocaleString()}</TableCell>
                            <TableCell>{discount > 0 ? `₱${discount.toLocaleString()}` : "-"}</TableCell>
                            <TableCell>{discountedPrice ? `₱${discountedPrice.toLocaleString()}` : "-"}</TableCell>
                            <TableCell>₱{payments.toLocaleString()}</TableCell>
                            <TableCell>₱{balance.toLocaleString()}</TableCell>
                            <TableCell>
                              {transaction.invoice_image_url && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(transaction.invoice_image_url, "_blank")}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
          </TabsContent>
        </Tabs>
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