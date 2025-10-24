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

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  image_url?: string;
}

const POS = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("id, name, price, category, image_url")
      .gt("stock", 0);

    if (error) {
      toast.error("Failed to load products");
      console.error(error);
    } else {
      setProducts(data || []);
    }
  };

  const addToCart = (product: Product) => {
    const existing = cart.find((item) => item.id === product.id);
    if (existing) {
      setCart(
        cart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
    toast.success(`Added ${product.name} to cart`);
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(
      cart
        .map((item) =>
          item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (id: string) => {
    setCart(cart.filter((item) => item.id !== id));
    toast.info("Item removed from cart");
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
    fetchProducts(); // Refresh products to update stock
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30">
      <Navigation />

      <main className="container mx-auto px-6 py-8">
        <h2 className="text-4xl font-bold mb-8">Point of Sale - Jewelirene's Jewelry</h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-12 bg-card border-border/50"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredProducts.map((product) => (
                <Card
                  key={product.id}
                  className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border/50 overflow-hidden group"
                  onClick={() => addToCart(product)}
                >
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="h-32 w-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="h-32 bg-gradient-to-br from-accent/20 to-accent/5 group-hover:from-accent/30 group-hover:to-accent/10 transition-all" />
                  )}
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg mb-1">{product.name}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{product.category}</p>
                    <p className="text-2xl font-bold text-accent">₱{product.price.toLocaleString()}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-6 border-border/50">
              <CardHeader>
                <CardTitle>Shopping Cart</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cart.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Cart is empty</p>
                ) : (
                  <>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {cart.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-secondary/30"
                        >
                          <div className="flex-1">
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-accent">₱{item.price}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => updateQuantity(item.id, -1)}
                              className="h-8 w-8"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center font-medium">{item.quantity}</span>
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => updateQuantity(item.id, 1)}
                              className="h-8 w-8"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => removeItem(item.id)}
                              className="h-8 w-8 text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-border pt-4 space-y-2">
                      <div className="flex justify-between text-lg">
                        <span className="font-medium">Subtotal</span>
                        <span>₱{total.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Tax (10%)</span>
                        <span>₱{(total * 0.1).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-2xl font-bold text-accent border-t border-border pt-2">
                        <span>Total</span>
                        <span>₱{(total * 1.1).toLocaleString()}</span>
                      </div>
                    </div>

                    <Button
                      onClick={handleCheckout}
                      className="w-full h-12 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
                      size="lg"
                    >
                      <CreditCard className="mr-2 h-5 w-5" />
                      Complete Sale
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        cart={cart}
        total={total}
        onSuccess={handleCheckoutSuccess}
      />
    </div>
  );
};

export default POS;
