import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Eye, X, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { createAuditLog } from "@/lib/auditLog";
import { Card, CardContent } from "@/components/ui/card";
import { CurrencyInput } from "@/components/ui/currency-input";
import { formatPeso, parseCurrency } from "@/lib/currency";

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
  
  // Layaway/Installment state
  const [isLayaway, setIsLayaway] = useState(false);
  const [downPayment, setDownPayment] = useState("");
  
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
    return ["Credit Card", "Check", "Debit Card", "Bank Transfer", "GCash", "BDO", "BPI"].includes(paymentType);
  };

  // Calculate totals
  const subtotal = total;
  const discountPercentage = parseFloat(discount) || 0;
  const discountAmount = subtotal * (discountPercentage / 100);
  const taxValue = parseFloat(taxPercentage) || 0;
  const tax = (subtotal - discountAmount) * (taxValue / 100);
  const totalAmount = subtotal - discountAmount + tax;
  const downPaymentAmount = parseFloat(downPayment) || 0;
  const balance = isLayaway ? totalAmount - downPaymentAmount : 0;

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
    if (taxValue < 0 || taxValue > 100) {
      toast.error("Please enter a valid tax percentage (0-100)");
      return;
    }
    if (isLayaway) {
      if (downPaymentAmount <= 0) {
        toast.error("Please enter a valid down payment amount");
        return;
      }
      if (downPaymentAmount >= totalAmount) {
        toast.error("Down payment must be less than total amount. For full payment, disable Layaway.");
        return;
      }
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

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Create transaction
      const { data: transaction, error: transactionError } = await supabase
        .from("transactions")
        .insert({
          customer_id: customerId,
          transaction_type: isLayaway ? "layaway" : "sale",
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
        product_id: null,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        subtotal: item.price * item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from("transaction_items")
        .insert(items);

      if (itemsError) throw itemsError;

      // If layaway, create payment plan and initial collection
      if (isLayaway) {
        // Create payment plan
        const { data: paymentPlan, error: planError } = await supabase
          .from("payment_plans")
          .insert({
            customer_id: customerId,
            transaction_id: transaction.id,
            total_amount: totalAmount,
            amount_paid: downPaymentAmount,
            balance: balance,
            status: "active",
            created_by: user.id,
          })
          .select("*")
          .single();

        if (planError) throw planError;

        // Create initial collection (down payment)
        const { error: collectionError } = await supabase
          .from("collections")
          .insert({
            payment_plan_id: paymentPlan.id,
            amount_paid: downPaymentAmount,
            payment_date: new Date().toISOString(),
            payment_method: paymentType,
            notes: "Initial down payment",
            created_by: user.id,
          });

        if (collectionError) throw collectionError;

        await createAuditLog('CREATE', 'payment_plans', paymentPlan.id, undefined, {
          customer_id: customerId,
          total_amount: totalAmount,
          down_payment: downPaymentAmount,
          balance: balance
        });
      }

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
        items: cart.length,
        is_layaway: isLayaway
      });

      toast.success(isLayaway ? "Layaway sale completed successfully!" : "Sale completed successfully!");
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
      setIsLayaway(false);
      setDownPayment("");
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

            {/* Layaway Toggle */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-semibold">Layaway / Installment</Label>
                    <p className="text-sm text-muted-foreground">Enable to set up a payment plan with down payment</p>
                  </div>
                  <Switch
                    checked={isLayaway}
                    onCheckedChange={setIsLayaway}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Down Payment (shown when layaway is enabled) */}
            {isLayaway && (
              <Card className="bg-accent/5 border-accent/20">
                <CardContent className="py-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="downPayment">Down Payment (₱) *</Label>
                    <Input
                      id="downPayment"
                      type="number"
                      min="0"
                      step="0.01"
                      value={downPayment}
                      onChange={(e) => setDownPayment(e.target.value)}
                      placeholder="Enter down payment amount"
                    />
                  </div>
                  {downPaymentAmount > 0 && (
                    <div className="text-sm space-y-1 pt-2 border-t border-accent/20">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Amount:</span>
                        <span className="font-medium">{formatPeso(totalAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Down Payment:</span>
                        <span className="font-medium text-green-600">{formatPeso(downPaymentAmount)}</span>
                      </div>
                      <div className="flex justify-between text-base font-semibold">
                        <span>Remaining Balance:</span>
                        <span className="text-orange-600">{formatPeso(balance)}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

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

                  {(paymentType === "Credit Card" || paymentType === "Debit Card") && (
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
                <span>₱{subtotal.toLocaleString()}</span>
              </div>
              {discountPercentage > 0 && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Discount ({discount}%)</span>
                  <span>-₱{discountAmount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Tax ({taxPercentage}%)</span>
                <span>₱{tax.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-accent border-t border-border pt-2">
                <span>Total</span>
                <span>₱{totalAmount.toLocaleString()}</span>
              </div>
              {isLayaway && downPaymentAmount > 0 && (
                <>
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Down Payment</span>
                    <span>-₱{downPaymentAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-orange-600">
                    <span>Balance Due</span>
                    <span>₱{balance.toLocaleString()}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading} className="bg-accent hover:bg-accent/90">
              {loading ? "Processing..." : isLayaway ? "Complete Layaway" : "Complete Sale"}
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