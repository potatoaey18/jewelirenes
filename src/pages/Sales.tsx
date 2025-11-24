import { useState, useEffect } from "react";
import { Search, Plus, Minus, Trash2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Navigation from "@/components/Navigation";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CheckoutDialog } from "@/components/pos/CheckoutDialog";

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

const Sales = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<FinishedItem[]>([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

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
  };

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const TAX_RATE = 0.12;
  const subtotal = total;
  const tax = subtotal * TAX_RATE;
  const grandTotal = subtotal + tax;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
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
                      Php {item.selling_price.toFixed(2)}
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
                              Php {item.price.toFixed(2)} each
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
                      <div className="flex justify-between text-sm md:text-base">
                        <span>Subtotal:</span>
                        <span className="font-medium">Php {subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm md:text-base">
                        <span>Tax (12%):</span>
                        <span className="font-medium">Php {tax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-base md:text-lg font-bold pt-2 border-t">
                        <span>Total:</span>
                        <span className="text-accent">Php {grandTotal.toFixed(2)}</span>
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
      </div>

      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        cart={cart}
        total={grandTotal}
        onSuccess={handleCheckoutSuccess}
      />
    </div>
  );
};

export default Sales;
