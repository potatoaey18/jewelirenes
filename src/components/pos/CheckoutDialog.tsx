import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Eye, X, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { createAuditLog } from "@/lib/auditLog";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
}

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cart: CartItem[];
  total: number;
  onSuccess: () => void;
}

const PAYMENT_TYPES = ["Cash", "Credit Card", "Debit Card", "Bank Transfer", "Check"];

export const CheckoutDialog = ({ open, onOpenChange, cart, total, onSuccess }: CheckoutDialogProps) => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [showNewCustomerInput, setShowNewCustomerInput] = useState(false);
  const [paymentType, setPaymentType] = useState("");
  const [taxPercentage, setTaxPercentage] = useState("10");
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [invoicePreview, setInvoicePreview] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchCustomers();
    }
  }, [open]);

  const fetchCustomers = async () => {
    const { data, error } = await supabase
      .from("customers")
      .select("id, name")
      .order("name");
    
    if (!error && data) {
      setCustomers(data);
    }
  };

  const handleInvoiceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setInvoiceFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setInvoicePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    // Validate customer
    if (!selectedCustomerId && !newCustomerName.trim()) {
      toast.error("Please select or add a customer");
      return;
    }
    if (!paymentType) {
      toast.error("Please select payment type");
      return;
    }
    const taxValue = parseFloat(taxPercentage);
    if (isNaN(taxValue) || taxValue < 0 || taxValue > 100) {
      toast.error("Please enter a valid tax percentage (0-100)");
      return;
    }

    setLoading(true);
    try {
      // Get or create customer
      let customerId: string;
      
      if (selectedCustomerId) {
        customerId = selectedCustomerId;
      } else {
        // Create new customer
        const { data: newCustomer, error: customerError } = await supabase
          .from("customers")
          .insert({ name: newCustomerName.trim() })
          .select("id")
          .single();

        if (customerError) throw customerError;
        customerId = newCustomer.id;
        toast.success("New customer created");
      }

      // Upload invoice if provided
      let invoiceUrl: string | null = null;
      if (invoiceFile) {
        const fileExt = invoiceFile.name.split(".").pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("customer-files")
          .upload(fileName, invoiceFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("customer-files")
          .getPublicUrl(fileName);
        
        invoiceUrl = publicUrl;
      }

      // Calculate tax and total
      const subtotal = total;
      const tax = subtotal * (parseFloat(taxPercentage) / 100);
      const totalAmount = subtotal + tax;

      // Create transaction
      const { data: transaction, error: transactionError } = await supabase
        .from("transactions")
        .insert({
          customer_id: customerId,
          transaction_type: "sale",
          payment_type: paymentType,
          tax,
          total_amount: totalAmount,
          invoice_image_url: invoiceUrl,
        })
        .select("*")
        .single();

      if (transactionError) throw transactionError;

      // Create transaction items and update stock
      const items = cart.map((item) => ({
        transaction_id: transaction.id,
        product_id: item.id,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        subtotal: item.price * item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from("transaction_items")
        .insert(items);

      if (itemsError) throw itemsError;

      // Decrease stock for each finished item
      for (const item of cart) {
        const { data: finishedItem } = await supabase
          .from("finished_items")
          .select("stock")
          .eq("id", item.id)
          .single();

        if (finishedItem) {
          const newStock = Math.max(0, finishedItem.stock - item.quantity);
          const { error: stockError } = await supabase
            .from("finished_items")
            .update({ stock: newStock })
            .eq("id", item.id);

          if (stockError) throw stockError;
        }
      }

      // Create audit log for transaction
      await createAuditLog('CREATE', 'transactions', transaction.id, undefined, {
        customer_id: customerId,
        total_amount: transaction.total_amount,
        payment_type: paymentType,
        items: cart.length
      });

      toast.success("Sale completed successfully!");
      onSuccess();
      onOpenChange(false);
      
      // Reset form
      setSelectedCustomerId("");
      setNewCustomerName("");
      setShowNewCustomerInput(false);
      setPaymentType("");
      setTaxPercentage("10");
      setInvoiceFile(null);
      setInvoicePreview(null);
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast.error(error.message || "Failed to complete sale");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Complete Sale</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Customer Selection */}
            <div className="space-y-2">
              <Label>Customer *</Label>
              {!showNewCustomerInput ? (
                <div className="flex gap-2">
                  <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={customerSearchOpen}
                        className="flex-1 justify-between"
                      >
                        {selectedCustomerId
                          ? customers.find((c) => c.id === selectedCustomerId)?.name
                          : "Select customer..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Search customer..." />
                        <CommandList>
                          <CommandEmpty>No customer found.</CommandEmpty>
                          <CommandGroup>
                            {customers.map((customer) => (
                              <CommandItem
                                key={customer.id}
                                value={customer.name}
                                onSelect={() => {
                                  setSelectedCustomerId(customer.id);
                                  setCustomerSearchOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedCustomerId === customer.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {customer.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowNewCustomerInput(true)}
                  >
                    Add New
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter new customer name"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowNewCustomerInput(false);
                      setNewCustomerName("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>

            {/* Payment Type */}
            <div className="space-y-2">
              <Label htmlFor="paymentType">Payment Type *</Label>
              <Select value={paymentType} onValueChange={setPaymentType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment type" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tax Percentage */}
            <div className="space-y-2">
              <Label htmlFor="taxPercentage">Tax Percentage (%)</Label>
              <Input
                id="taxPercentage"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={taxPercentage}
                onChange={(e) => setTaxPercentage(e.target.value)}
                placeholder="Enter tax percentage"
              />
            </div>

            {/* Invoice Image */}
            <div className="space-y-2">
              <Label htmlFor="invoice">Invoice Image (Optional)</Label>
              <div className="flex gap-2">
                <Input
                  id="invoice"
                  type="file"
                  accept="image/*"
                  onChange={handleInvoiceChange}
                  className="flex-1"
                />
                {invoicePreview && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setPreviewImage(invoicePreview)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setInvoiceFile(null);
                        setInvoicePreview(null);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Cart Items with Product Images */}
            <div className="space-y-2">
              <Label>Items in Cart</Label>
              <div className="border border-border rounded-lg divide-y divide-border max-h-64 overflow-y-auto">
                {cart.map((item) => (
                  <div key={item.id} className="p-3 flex items-center gap-3">
                    {item.image_url ? (
                      <div className="relative">
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-12 h-12 object-cover rounded cursor-pointer"
                          onClick={() => setPreviewImage(item.image_url || null)}
                        />
                        <Eye className="absolute inset-0 m-auto h-4 w-4 text-background opacity-0 hover:opacity-100 transition-opacity cursor-pointer" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-secondary rounded flex items-center justify-center">
                        <Upload className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.quantity} × Php {item.price}
                      </p>
                    </div>
                    <p className="font-semibold text-accent">
                      Php {(item.price * item.quantity).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Summary */}
            <div className="border-t border-border pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>Php {total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Tax ({taxPercentage}%)</span>
                <span>Php {(total * (parseFloat(taxPercentage) / 100)).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-accent border-t border-border pt-2">
                <span>Total</span>
                <span>Php {(total * (1 + parseFloat(taxPercentage) / 100)).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading} className="bg-accent hover:bg-accent/90">
              {loading ? "Processing..." : "Complete Sale"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Image Preview</DialogTitle>
          </DialogHeader>
          {previewImage && (
            <img
              src={previewImage}
              alt="Preview"
              className="w-full h-auto max-h-[70vh] object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
