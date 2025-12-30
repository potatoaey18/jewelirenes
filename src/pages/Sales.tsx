import { useState, useEffect } from "react";
import { Search, Plus, Minus, Trash2, CreditCard, RotateCcw, Package, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
import Navigation from "@/components/Navigation";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CheckoutDialog } from "@/components/pos/CheckoutDialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import { ViewToggle, ViewMode } from "@/components/ui/view-toggle";
import { formatPeso } from "@/lib/currency";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
}

interface FinishedItem {
  id: string;
  name: string;
  selling_price: number;
  description: string | null;
  image_url?: string;
  stock: number;
}

interface Transaction {
  id: string;
  customer_id: string;
  total_amount: number;
  created_at: string;
  deleted_at: string | null;
  payment_type: string | null;
  customers: {
    name: string;
  };
  transaction_items: {
    product_name: string;
    quantity: number;
    unit_price: number;
  }[];
}

const Sales = () => {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<FinishedItem[]>([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [permanentDeleteDialogOpen, setPermanentDeleteDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [soldViewMode, setSoldViewMode] = useState<ViewMode>(() => 
    (localStorage.getItem("sales-sold-view") as ViewMode) || "cards"
  );
  const [binViewMode, setBinViewMode] = useState<ViewMode>(() => 
    (localStorage.getItem("sales-bin-view") as ViewMode) || "cards"
  );

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from("finished_items")
      .select("id, name, selling_price, description, image_url, stock")
      .gt("stock", 0);

    if (error) {
      toast.error("Failed to load items");
      console.error(error);
    } else {
      setItems(data || []);
    }
  };

  // Fetch sold transactions (not deleted)
  const { data: soldTransactions = [] } = useQuery({
    queryKey: ['sold-transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          customers(name),
          transaction_items(product_name, quantity, unit_price)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Transaction[];
    }
  });

  // Fetch deleted transactions (bin)
  const { data: deletedTransactions = [] } = useQuery({
    queryKey: ['deleted-transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          customers(name),
          transaction_items(product_name, quantity, unit_price)
        `)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });
      
      if (error) throw error;
      return data as Transaction[];
    }
  });

  // Soft delete mutation
  const softDeleteMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      const { error } = await supabase
        .from('transactions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', transactionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sold-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['deleted-transactions'] });
      toast.success('Transaction moved to bin');
      setDeleteDialogOpen(false);
      setSelectedTransaction(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete transaction');
    }
  });

  // Restore mutation
  const restoreMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      const { error } = await supabase
        .from('transactions')
        .update({ deleted_at: null })
        .eq('id', transactionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sold-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['deleted-transactions'] });
      toast.success('Transaction restored');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to restore transaction');
    }
  });

  // Permanent delete mutation
  const permanentDeleteMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      // First delete transaction items
      const { error: itemsError } = await supabase
        .from('transaction_items')
        .delete()
        .eq('transaction_id', transactionId);
      if (itemsError) throw itemsError;

      // Then delete the transaction
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deleted-transactions'] });
      toast.success('Transaction permanently deleted');
      setPermanentDeleteDialogOpen(false);
      setSelectedTransaction(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete transaction');
    }
  });

  const addToCart = (item: FinishedItem) => {
    const existingItem = cart.find((cartItem) => cartItem.id === item.id);
    if (existingItem) {
      setCart(
        cart.map((cartItem) =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        )
      );
    } else {
      setCart([...cart, { 
        id: item.id, 
        name: item.name, 
        price: item.selling_price, 
        quantity: 1,
        image_url: item.image_url || undefined 
      }]);
    }
    toast.success(`${item.name} added to cart`);
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(
      cart
        .map((item) => {
          if (item.id === id) {
            const newQuantity = item.quantity + delta;
            return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (id: string) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    setCheckoutOpen(true);
  };

  const handleCheckoutSuccess = () => {
    setCart([]);
    setCheckoutOpen(false);
    fetchItems();
    queryClient.invalidateQueries({ queryKey: ['sold-transactions'] });
  };

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <Tabs defaultValue="shop" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="shop" className="text-xs sm:text-sm gap-1">
              <Package className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Shop</span>
              <span className="xs:hidden">Shop</span>
            </TabsTrigger>
            <TabsTrigger value="sold" className="text-xs sm:text-sm gap-1">
              <CreditCard className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Sold ({soldTransactions.length})</span>
              <span className="xs:hidden">Sold</span>
            </TabsTrigger>
            <TabsTrigger value="bin" className="text-xs sm:text-sm gap-1">
              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Bin ({deletedTransactions.length})</span>
              <span className="xs:hidden">Bin</span>
            </TabsTrigger>
          </TabsList>

          {/* Shop Tab */}
          <TabsContent value="shop">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold">Sales</h1>
                    <p className="text-sm md:text-base text-muted-foreground">
                      Select finished items to add to cart
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search items..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
                  {filteredItems.map((item) => (
                    <Card
                      key={item.id}
                      className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
                      onClick={() => addToCart(item)}
                    >
                      <CardContent className="p-3 md:p-4">
                        {item.image_url && (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-24 md:h-32 object-cover rounded-md mb-2"
                          />
                        )}
                        <h3 className="font-semibold text-sm md:text-base line-clamp-2 mb-1">
                          {item.name}
                        </h3>
                        <p className="text-xs md:text-sm text-muted-foreground mb-1 line-clamp-1">
                          {item.description || "No description"}
                        </p>
                        <p className="text-base md:text-lg font-bold text-accent">
                          {formatPeso(item.selling_price)}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="lg:sticky lg:top-4 h-fit">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl md:text-2xl">Sale</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {cart.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">Cart is empty</p>
                    ) : (
                      <>
                        <div className="space-y-3 max-h-[40vh] md:max-h-[50vh] overflow-y-auto">
                          {cart.map((item) => (
                            <div key={item.id} className="flex items-center gap-2 md:gap-3 p-2 md:p-3 bg-muted/50 rounded-lg">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm md:text-base truncate">{item.name}</p>
                                <p className="text-xs md:text-sm text-muted-foreground">
                                  {formatPeso(item.price)} each
                                </p>
                              </div>
                              <div className="flex items-center gap-1 md:gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateQuantity(item.id, -1)}
                                  className="h-7 w-7 md:h-8 md:w-8 p-0"
                                >
                                  <Minus className="h-3 w-3 md:h-4 md:w-4" />
                                </Button>
                                <span className="w-6 md:w-8 text-center font-medium text-sm md:text-base">
                                  {item.quantity}
                                </span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateQuantity(item.id, 1)}
                                  className="h-7 w-7 md:h-8 md:w-8 p-0"
                                >
                                  <Plus className="h-3 w-3 md:h-4 md:w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removeItem(item.id)}
                                  className="h-7 w-7 md:h-8 md:w-8 p-0 ml-1"
                                >
                                  <Trash2 className="h-3 w-3 md:h-4 md:w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="space-y-2 pt-3 md:pt-4 border-t">
                          <div className="flex justify-between text-base md:text-lg font-bold">
                            <span>Total:</span>
                            <span className="text-accent">{formatPeso(total)}</span>
                          </div>
                        </div>

                        <Button 
                          className="w-full" 
                          size="lg" 
                          onClick={handleCheckout}
                        >
                          <CreditCard className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                          Complete Sale
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Sold Items Tab */}
          <TabsContent value="sold">
            <Card className="p-3 sm:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-2xl font-bold">Sold Items</h2>
                <ViewToggle 
                  viewMode={soldViewMode} 
                  onViewModeChange={(mode) => {
                    setSoldViewMode(mode);
                    localStorage.setItem("sales-sold-view", mode);
                  }} 
                />
              </div>
              
              {/* Mobile Card View */}
              {soldViewMode === "cards" ? (
                <div className="space-y-3">
                  {soldTransactions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No sold items yet</div>
                  ) : (
                    soldTransactions.map((transaction) => (
                      <Card key={transaction.id} className="overflow-hidden">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold">{transaction.customers?.name || 'Unknown'}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(transaction.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-xs">{transaction.payment_type || 'Cash'}</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {transaction.transaction_items?.slice(0, 2).map((item, idx) => (
                              <div key={idx}>{item.quantity}x {item.product_name}</div>
                            ))}
                            {transaction.transaction_items?.length > 2 && (
                              <span className="text-xs">+{transaction.transaction_items.length - 2} more</span>
                            )}
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t">
                            <span className="font-bold text-accent">{formatPeso(transaction.total_amount)}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedTransaction(transaction);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              ) : (
                /* Desktop Table View */
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {soldTransactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>{new Date(transaction.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="font-medium">{transaction.customers?.name || 'Unknown'}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {transaction.transaction_items?.slice(0, 2).map((item, idx) => (
                                <div key={idx} className="text-sm">{item.quantity}x {item.product_name}</div>
                              ))}
                              {transaction.transaction_items?.length > 2 && (
                                <span className="text-xs text-muted-foreground">+{transaction.transaction_items.length - 2} more</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell><Badge variant="outline">{transaction.payment_type || 'Cash'}</Badge></TableCell>
                          <TableCell className="text-right font-semibold">{formatPeso(transaction.total_amount)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedTransaction(transaction);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {soldTransactions.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No sold items yet</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Bin Tab */}
          <TabsContent value="bin">
            <Card className="p-3 sm:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Archive className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
                  <h2 className="text-lg sm:text-2xl font-bold">Bin</h2>
                </div>
                <ViewToggle 
                  viewMode={binViewMode} 
                  onViewModeChange={(mode) => {
                    setBinViewMode(mode);
                    localStorage.setItem("sales-bin-view", mode);
                  }} 
                />
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                Deleted transactions can be restored or permanently deleted.
              </p>
              
              {binViewMode === "cards" ? (
                <div className="space-y-3">
                  {deletedTransactions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">Bin is empty</div>
                  ) : (
                    deletedTransactions.map((transaction) => (
                      <Card key={transaction.id} className="overflow-hidden opacity-75">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold">{transaction.customers?.name || 'Unknown'}</p>
                              <p className="text-xs text-muted-foreground">
                                Deleted: {new Date(transaction.deleted_at!).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {transaction.transaction_items?.slice(0, 2).map((item, idx) => (
                              <div key={idx}>{item.quantity}x {item.product_name}</div>
                            ))}
                            {transaction.transaction_items?.length > 2 && (
                              <span className="text-xs">+{transaction.transaction_items.length - 2} more</span>
                            )}
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t">
                            <span className="font-bold">{formatPeso(transaction.total_amount)}</span>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => restoreMutation.mutate(transaction.id)}
                              >
                                <RotateCcw className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedTransaction(transaction);
                                  setPermanentDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              ) : (
                /* Desktop Table View */
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Deleted On</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deletedTransactions.map((transaction) => (
                        <TableRow key={transaction.id} className="opacity-75">
                          <TableCell>{new Date(transaction.deleted_at!).toLocaleDateString()}</TableCell>
                          <TableCell className="font-medium">{transaction.customers?.name || 'Unknown'}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {transaction.transaction_items?.slice(0, 2).map((item, idx) => (
                                <div key={idx} className="text-sm">{item.quantity}x {item.product_name}</div>
                              ))}
                              {transaction.transaction_items?.length > 2 && (
                                <span className="text-xs text-muted-foreground">+{transaction.transaction_items.length - 2} more</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold">{formatPeso(transaction.total_amount)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={() => restoreMutation.mutate(transaction.id)} title="Restore">
                                <RotateCcw className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedTransaction(transaction);
                                  setPermanentDeleteDialogOpen(true);
                                }}
                                title="Delete permanently"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {deletedTransactions.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Bin is empty</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        cart={cart}
        total={total}
        onSuccess={handleCheckoutSuccess}
      />

      {/* Move to Bin Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move to Bin?</AlertDialogTitle>
            <AlertDialogDescription>
              This transaction will be moved to the bin. You can restore it later or delete it permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedTransaction && softDeleteMutation.mutate(selectedTransaction.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Move to Bin
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permanent Delete Dialog */}
      <AlertDialog open={permanentDeleteDialogOpen} onOpenChange={setPermanentDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This transaction and all its items will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedTransaction && permanentDeleteMutation.mutate(selectedTransaction.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Sales;
