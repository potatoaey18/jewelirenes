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
import { Card, CardContent } from "@/components/ui/card";

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

const PAYMENT_TYPES = ["Cash", "Credit Card", "Debit Card", "Bank Transfer", "Check", "GCash", "BDO", "BPI"];

export const CheckoutDialog = ({ open, onOpenChange, cart, total, onSuccess }: CheckoutDialogProps) => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [showNewCustomerInput, setShowNewCustomerInput] = useState(false);
  const [paymentType, setPaymentType] = useState("");
  const [taxPercentage, setTaxPercentage] = useState("10");
  const [discount, setDiscount] = useState("0");
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [invoicePreview, setInvoicePreview] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Payment details for non-cash payments
  const [paymentDetails, setPaymentDetails] = useState({
    reference_number: "",
    bank_name: "",
    account_name: "",
    check_number: "",
    check_date: "",
  });

  useEffect(() => {
    if (open) {
      fetchCustomers();
    }
  }, [open]);

  // Reset payment details when payment type changes
  useEffect(() => {
    setPaymentDetails({
      reference_number: "",
      bank_name: "",
      account_name: "",
      check_number: "",
      check_date: "",
    });
  }, [paymentType]);

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

  const showPaymentDetailsFields = () => {
    return ["Check", "Debit Card", "Bank Transfer", "GCash", "BDO", "BPI"].includes(paymentType);
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
      const discountPercentage = parseFloat(discount) || 0;
      const discountAmount = subtotal * (discountPercentage / 100);
      const tax = (subtotal - discountAmount) * (parseFloat(taxPercentage) / 100);
      const totalAmount = subtotal - discountAmount + tax;

      // Build notes with payment details
      let notes = "";
      if (showPaymentDetailsFields()) {
        const details: string[] = [];
        if (paymentDetails.reference_number) details.push(`Ref #: ${paymentDetails.reference_number}`);
        if (paymentDetails.bank_name) details.push(`Bank: ${paymentDetails.bank_name}`);
        if (paymentDetails.account_name) details.push(`Account: ${paymentDetails.account_name}`);
        if (paymentDetails.check_number) details.push(`Check #: ${paymentDetails.check_number}`);
        if (paymentDetails.check_date) details.push(`Check Date: ${paymentDetails.check_date}`);
        notes = details.join(" | ");
      }

      // Create transaction
      const { data: transaction, error: transactionError } = await supabase
        .from("transactions")
        .insert({
          customer_id: customerId,
          transaction_type: "sale",
          payment_type: paymentType,
          tax,
          discount: discountAmount,
          total_amount: totalAmount,
          invoice_image_url: invoiceUrl,
          notes: notes || null,
        })
        .select("*")
        .single();

      if (transactionError) throw transactionError;

      // Create transaction items WITHOUT product_id (since finished_items is not linked to products table)
      const items = cart.map((item) => ({
        transaction_id: transaction.id,
        product_id: null, // Set to null since finished_items aren't in products table
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
      setDiscount("0");
      setInvoiceFile(null);
      setInvoicePreview(null);
      setPaymentDetails({
        reference_number: "",
        bank_name: "",
        account_name: "",
        check_number: "",
        check_date: "",
      });
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

            {/* Payment Details for non-cash payments */}
            {showPaymentDetailsFields() && (
              <Card className="bg-muted/50">
                <CardContent className="pt-4 space-y-4">
                  <p className="text-sm font-medium text-muted-foreground">Payment Details</p>
                  
                  {paymentType === "Check" && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="check_number">Check Number</Label>
                          <Input
                            id="check_number"
                            value={paymentDetails.check_number}
                            onChange={(e) => setPaymentDetails({...paymentDetails, check_number: e.target.value})}
                            placeholder="Enter check number"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="check_date">Check Date</Label>
                          <Input
                            id="check_date"
                            type="date"
                            value={paymentDetails.check_date}
                            onChange={(e) => setPaymentDetails({...paymentDetails, check_date: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bank_name">Bank Name</Label>
                        <Input
                          id="bank_name"
                          value={paymentDetails.bank_name}
                          onChange={(e) => setPaymentDetails({...paymentDetails, bank_name: e.target.value})}
                          placeholder="Enter bank name"
                        />
                      </div>
                    </>
                  )}

                  {paymentType === "Debit Card" && (
                    <div className="space-y-2">
                      <Label htmlFor="reference_number">Transaction Reference Number</Label>
                      <Input
                        id="reference_number"
                        value={paymentDetails.reference_number}
                        onChange={(e) => setPaymentDetails({...paymentDetails, reference_number: e.target.value})}
                        placeholder="Enter reference number"
                      />
                    </div>
                  )}

                  {(paymentType === "Bank Transfer" || paymentType === "BDO" || paymentType === "BPI") && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="reference_number">Reference Number</Label>
                          <Input
                            id="reference_number"
                            value={paymentDetails.reference_number}
                            onChange={(e) => setPaymentDetails({...paymentDetails, reference_number: e.target.value})}
                            placeholder="Enter reference number"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="account_name">Account Name</Label>
                          <Input
                            id="account_name"
                            value={paymentDetails.account_name}
                            onChange={(e) => setPaymentDetails({...paymentDetails, account_name: e.target.value})}
                            placeholder="Enter account name"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {paymentType === "GCash" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="reference_number">GCash Reference Number</Label>
                        <Input
                          id="reference_number"
                          value={paymentDetails.reference_number}
                          onChange={(e) => setPaymentDetails({...paymentDetails, reference_number: e.target.value})}
                          placeholder="Enter GCash reference"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="account_name">GCash Account Name</Label>
                        <Input
                          id="account_name"
                          value={paymentDetails.account_name}
                          onChange={(e) => setPaymentDetails({...paymentDetails, account_name: e.target.value})}
                          placeholder="Enter account name"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

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

            {/* Discount */}
            <div className="space-y-2">
              <Label htmlFor="discount">Discount (%)</Label>
              <Input
                id="discount"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="Enter discount percentage"
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
                        {item.quantity} × ₱{item.price}
                      </p>
                    </div>
                    <p className="font-semibold text-accent">
                      ₱{(item.price * item.quantity).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Summary */}
            <div className="border-t border-border pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>₱{total.toLocaleString()}</span>
              </div>
              {parseFloat(discount) > 0 && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Discount ({discount}%)</span>
                  <span>-₱{(total * (parseFloat(discount) / 100)).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Tax ({taxPercentage}%)</span>
                <span>₱{((total - (total * (parseFloat(discount) / 100))) * (parseFloat(taxPercentage) / 100)).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-accent border-t border-border pt-2">
                <span>Total</span>
                <span>₱{(total - (total * (parseFloat(discount) / 100)) + ((total - (total * (parseFloat(discount) / 100))) * (parseFloat(taxPercentage) / 100))).toLocaleString()}</span>
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
