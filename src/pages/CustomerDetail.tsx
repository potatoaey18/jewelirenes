import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, FileText, Trash2, Plus, Download, Eye, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navigation from "@/components/Navigation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

type TimePeriod = "weekly" | "monthly" | "yearly";
type PurchaseFilter = "all" | "paid" | "unpaid";

const CustomerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [paymentPlans, setPaymentPlans] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadDescription, setUploadDescription] = useState("");
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("monthly");
  const [purchaseFilter, setPurchaseFilter] = useState<PurchaseFilter>("all");

  useEffect(() => {
    fetchCustomerData();
  }, [id]);

  const fetchCustomerData = async () => {
    try {
      const { data: customerData, error: customerError } = await supabase
        .from("customers")
        .select("*")
        .eq("id", id)
        .single();

      if (customerError) throw customerError;
      setCustomer(customerData);

      const { data: transData, error: transError } = await supabase
        .from("transactions")
        .select(`
          *,
          transaction_items(*)
        `)
        .eq("customer_id", id)
        .order("created_at", { ascending: false });

      if (transError) throw transError;
      setTransactions(transData || []);

      const { data: plansData, error: plansError } = await supabase
        .from("payment_plans")
        .select("*")
        .eq("customer_id", id);

      if (plansError) throw plansError;
      setPaymentPlans(plansData || []);

      const { data: filesData, error: filesError } = await supabase
        .from("customer_files")
        .select(`
          *,
          files(*)
        `)
        .eq("customer_id", id)
        .order("created_at", { ascending: false });

      if (filesError) throw filesError;
      setFiles(filesData || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `customer-${id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("customer-files")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: fileData, error: fileError } = await supabase
        .from("files")
        .insert({
          name: file.name,
          file_type: file.type,
          file_size: file.size,
          storage_path: filePath,
        })
        .select()
        .single();

      if (fileError) throw fileError;

      const { error: linkError } = await supabase
        .from("customer_files")
        .insert({
          customer_id: id,
          file_id: fileData.id,
          description: uploadDescription,
        });

      if (linkError) throw linkError;

      toast.success("File uploaded successfully");
      setUploadDescription("");
      fetchCustomerData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteFile = async (customerFileId: string, storagePath: string) => {
    try {
      await supabase.storage.from("customer-files").remove([storagePath]);
      const { error } = await supabase.from("customer_files").delete().eq("id", customerFileId);
      if (error) throw error;
      toast.success("File deleted");
      fetchCustomerData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handlePreviewFile = async (storagePath: string) => {
    try {
      const { data } = supabase.storage.from("customer-files").getPublicUrl(storagePath);
      window.open(data.publicUrl, "_blank");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDownloadFile = async (storagePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage.from("customer-files").download(storagePath);
      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const getTierBadge = (tier: string) => {
    const variants: Record<string, string> = {
      VIP: "bg-accent text-accent-foreground",
      Gold: "bg-amber-500 text-white",
      Silver: "bg-slate-400 text-white",
    };
    return <Badge className={variants[tier] || variants.Silver}>{tier}</Badge>;
  };

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
    return transactions.filter((t: any) => new Date(t.created_at) >= periodDate);
  };

  const unpaidBalance = paymentPlans.reduce(
    (sum: number, plan: any) => sum + parseFloat(plan.balance || 0),
    0
  );

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!customer) return <div className="min-h-screen flex items-center justify-center">Customer not found</div>;

  const filteredTransactions = filterTransactionsByPeriod(transactions);
  const displayTransactions = purchaseFilter === "all" 
    ? filteredTransactions 
    : purchaseFilter === "paid" 
    ? filteredTransactions.filter(t => {
        const hasPlan = paymentPlans.some(p => p.transaction_id === t.id);
        return !hasPlan || paymentPlans.find(p => p.transaction_id === t.id)?.balance === 0;
      })
    : filteredTransactions.filter(t => {
        const plan = paymentPlans.find(p => p.transaction_id === t.id);
        return plan && plan.balance > 0;
      });

  const totalSpent = displayTransactions.reduce((sum, t) => sum + parseFloat(t.total_amount || 0), 0);
  const paidAmount = totalSpent - unpaidBalance;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30">
      <Navigation />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        <Button
          variant="ghost"
          onClick={() => navigate("/customers")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Customers
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Customer Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {customer.photo_url && (
                <img
                  src={customer.photo_url}
                  alt={customer.name}
                  className="w-32 h-32 rounded-full mx-auto object-cover"
                />
              )}
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">{customer.name}</h2>
                {getTierBadge(customer.tier)}
              </div>
              <div className="space-y-2 text-sm">
                {customer.email && <p><strong>Email:</strong> {customer.email}</p>}
                {customer.phone && <p><strong>Phone:</strong> {customer.phone}</p>}
                {customer.address && <p><strong>Address:</strong> {customer.address}</p>}
                {customer.location && <p><strong>Location:</strong> {customer.location}</p>}
              </div>
              {customer.notes && (
                <div>
                  <Label>Notes</Label>
                  <p className="text-sm text-muted-foreground mt-1">{customer.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Transaction Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Spent</p>
                    <p className="text-3xl font-bold text-accent">Php {totalSpent.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Purchases</p>
                    <p className="text-3xl font-bold">{displayTransactions.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Paid</p>
                    <p className="text-2xl font-bold text-green-600">Php {paidAmount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Unpaid</p>
                    <p className="text-2xl font-bold text-red-600">Php {unpaidBalance.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <CardTitle>Purchase History</CardTitle>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Select value={timePeriod} onValueChange={(value: TimePeriod) => setTimePeriod(value)}>
                      <SelectTrigger className="w-full sm:w-[140px]">
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
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs value={purchaseFilter} onValueChange={(value: PurchaseFilter) => setPurchaseFilter(value)}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="paid">Paid</TabsTrigger>
                    <TabsTrigger value="unpaid">Unpaid</TabsTrigger>
                  </TabsList>
                </Tabs>
                {displayTransactions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No transactions found</p>
                ) : (
                  <div className="space-y-4">
                    {displayTransactions.map((transaction) => (
                      <div key={transaction.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium">{format(new Date(transaction.created_at), "PPP")}</p>
                            <Badge className="mt-1">{transaction.transaction_type}</Badge>
                          </div>
                          <p className="text-xl font-bold text-accent">Php {transaction.total_amount}</p>
                        </div>
                        {transaction.transaction_items && transaction.transaction_items.length > 0 && (
                          <div className="mt-2 space-y-1 text-sm">
                            {transaction.transaction_items.map((item: any) => (
                              <p key={item.id} className="text-muted-foreground">
                                {item.product_name} x {item.quantity} - ${item.subtotal}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Files & Attachments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-6">
                  <Label htmlFor="file-upload" className="block mb-2">Upload File</Label>
                  <Input
                    id="file-upload"
                    type="file"
                    onChange={handleFileUpload}
                    className="mb-2"
                  />
                  <Textarea
                    placeholder="File description (optional)"
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                    className="mt-2"
                  />
                </div>

                <div className="space-y-2">
                  {files.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No files uploaded</p>
                  ) : (
                    files.map((customerFile) => (
                      <div key={customerFile.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="h-8 w-8 text-accent" />
                          <div>
                            <p className="font-medium">{customerFile.files.name}</p>
                            {customerFile.description && (
                              <p className="text-sm text-muted-foreground">{customerFile.description}</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(customerFile.created_at), "PPP")}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePreviewFile(customerFile.files.storage_path)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadFile(customerFile.files.storage_path, customerFile.files.name)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteFile(customerFile.id, customerFile.files.storage_path)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CustomerDetail;